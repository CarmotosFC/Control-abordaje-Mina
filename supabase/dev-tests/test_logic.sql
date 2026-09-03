-- Prueba funcional del esquema: usuarios, pasajeros, abordajes, duplicados, auditoría

-- 1) Usuarios de auth simulados
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin@transpalma.com'),
  ('00000000-0000-0000-0000-000000000002', 'operador1@transpalma.com');

insert into profiles (id, email, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin@transpalma.com', 'Administrador Sistema', 'ADMINISTRADOR'),
  ('00000000-0000-0000-0000-000000000002', 'operador1@transpalma.com', 'Carlos Operador', 'OPERADOR');

-- 2) Crear pasajeros (código y QR se generan automáticamente)
insert into passengers (nombre_completo, numero_identificacion, telefono, turno, punto_recogida, estado, created_by)
values
  ('Juan Perez Gomez', '100000001', '3000000001', 'Turno A', 'Punto 1', 'ACTIVO', '00000000-0000-0000-0000-000000000001'),
  ('Maria Rodriguez Lopez', '100000002', '3000000002', 'Turno B', 'Punto 2', 'INACTIVO', '00000000-0000-0000-0000-000000000001')
returning id, codigo_pasajero, nombre_completo, estado;

-- 3) Verificar unicidad de identificación (debe fallar)
\echo '--- Prueba: identificacion duplicada (debe fallar) ---'
insert into passengers (nombre_completo, numero_identificacion, turno, punto_recogida)
values ('Otro Pasajero', '100000001', 'Turno A', 'Punto 1');
