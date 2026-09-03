-- ============================================================================
-- CONTROL DE ABORDAJE — Esquema inicial de base de datos (PostgreSQL / Supabase)
-- Sector transporte de personal — Palma
-- ============================================================================
-- Diseño:
--  - passengers          : datos maestros del pasajero (mínimos, según requerimiento)
--  - boarding_records     : cada intento de escaneo/abordaje (histórico inmutable)
--  - profiles             : usuarios del sistema (extiende auth.users) con rol
--  - audit_log            : trazabilidad de cambios administrativos
--
-- Seguridad: RLS habilitado en todas las tablas SIN policies para anon/authenticated.
-- Toda la lectura/escritura de datos pasa por las rutas API del backend (Next.js),
-- que usan la Service Role Key de Supabase (la cual ignora RLS) tras validar sesión
-- y rol del usuario. Así, ningún cliente puede leer/escribir la base directamente
-- desde el navegador, incluso conociendo las credenciales anon públicas.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- FUNCIÓN GENÉRICA: mantener updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- PROFILES — usuarios del sistema (1:1 con auth.users de Supabase)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null check (role in ('ADMINISTRADOR','OPERADOR')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;
-- Sin policies: solo accesible vía service_role (backend). Esto bloquea lectura
-- directa desde el cliente incluso con la anon key.

-- ---------------------------------------------------------------------------
-- PASSENGERS — pasajeros (datos mínimos requeridos + campos técnicos)
-- ---------------------------------------------------------------------------
create sequence if not exists passenger_code_seq start 1;

create or replace function generate_passenger_code()
returns text as $$
  select 'PAS-' || lpad(nextval('passenger_code_seq')::text, 6, '0');
$$ language sql;

create table if not exists passengers (
  id                    uuid primary key default gen_random_uuid(),

  -- Identificador único público, usado como CONTENIDO DEL QR (no expone datos personales)
  codigo_pasajero       text not null unique,

  -- Datos personales/operativos (los únicos solicitados)
  nombre_completo       text not null,
  numero_identificacion text not null unique,
  telefono              text,
  turno                 text not null,
  punto_recogida        text not null,

  -- Campos técnicos
  estado                text not null default 'ACTIVO' check (estado in ('ACTIVO','INACTIVO')),

  -- Estructura preparada para reglas avanzadas futuras (ruta, vehículo, horario
  -- autorizado, fecha de vigencia, etc.) sin requerir migración de esquema.
  reglas_extra          jsonb not null default '{}'::jsonb,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references profiles(id),
  updated_by            uuid references profiles(id)
);

create index if not exists idx_passengers_estado on passengers(estado);
create index if not exists idx_passengers_turno on passengers(turno);
create index if not exists idx_passengers_punto on passengers(punto_recogida);
create index if not exists idx_passengers_nombre on passengers using gin (to_tsvector('spanish', nombre_completo));

create or replace function passengers_set_defaults()
returns trigger as $$
begin
  if new.codigo_pasajero is null then
    new.codigo_pasajero := generate_passenger_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_passengers_defaults
  before insert on passengers
  for each row execute function passengers_set_defaults();

create trigger trg_passengers_updated_at
  before update on passengers
  for each row execute function set_updated_at();

alter table passengers enable row level security;

-- ---------------------------------------------------------------------------
-- BOARDING_RECORDS — historial de abordajes (inmutable, cada escaneo)
-- ---------------------------------------------------------------------------
create table if not exists boarding_records (
  id                     uuid primary key default gen_random_uuid(),

  passenger_id           uuid references passengers(id), -- null si el QR no existe

  codigo_escaneado       text not null, -- valor crudo leído del QR

  resultado              text not null check (resultado in (
                            'AUTORIZADO',        -- pasajero activo -> abordaje permitido
                            'NO_AUTORIZADO',      -- pasajero inactivo -> abordaje no permitido
                            'QR_NO_ENCONTRADO',   -- código no corresponde a ningún pasajero
                            'YA_REGISTRADO'        -- ya se registró abordaje autorizado hoy
                          )),

  -- snapshot de los datos del pasajero en el momento del escaneo (trazabilidad,
  -- aunque luego se edite el pasajero, el historial no cambia)
  nombre_pasajero        text,
  identificacion_pasajero text,
  turno                  text,
  punto_recogida         text,
  estado_pasajero        text,

  fecha                  date not null default (now() at time zone 'America/Bogota')::date,
  scanned_at             timestamptz not null default now(),

  operador_id            uuid references profiles(id),
  operador_nombre        text,

  -- true cuando un administrador autorizó explícitamente un segundo registro
  -- del mismo pasajero en el mismo día (ver regla YA_REGISTRADO)
  override               boolean not null default false,

  -- id generado en el cliente (tablet) — permite sincronización offline
  -- idempotente: un mismo escaneo reintentado nunca genera un duplicado.
  device_scan_id         text unique,

  created_at             timestamptz not null default now()
);

create index if not exists idx_boarding_fecha on boarding_records(fecha);
create index if not exists idx_boarding_passenger on boarding_records(passenger_id);
create index if not exists idx_boarding_resultado on boarding_records(resultado);
create index if not exists idx_boarding_turno on boarding_records(turno);
create index if not exists idx_boarding_punto on boarding_records(punto_recogida);

alter table boarding_records enable row level security;

-- ---------------------------------------------------------------------------
-- AUDIT_LOG — trazabilidad de cambios administrativos
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  user_email  text,
  user_name   text,
  action      text not null,       -- CREAR_PASAJERO, EDITAR_PASAJERO, ACTIVAR_PASAJERO, ...
  entity      text not null,       -- passengers | boarding_records | profiles
  entity_id   text,
  detalles    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_entity on audit_log(entity, entity_id);
create index if not exists idx_audit_created on audit_log(created_at);

alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- VISTA: dashboard diario (agregados por fecha)
-- ---------------------------------------------------------------------------
create or replace view v_boarding_daily_summary as
select
  fecha,
  count(*) filter (where resultado = 'AUTORIZADO')      as autorizados,
  count(*) filter (where resultado = 'NO_AUTORIZADO')   as no_autorizados,
  count(*) filter (where resultado = 'QR_NO_ENCONTRADO') as qr_no_encontrado,
  count(*) filter (where resultado = 'YA_REGISTRADO')   as ya_registrados,
  count(distinct passenger_id) filter (where resultado = 'AUTORIZADO') as pasajeros_unicos_abordados,
  count(*) as total_escaneos
from boarding_records
group by fecha;

-- ============================================================================
-- FIN
-- ============================================================================
