-- Pasajeros de prueba (uno ACTIVO y uno INACTIVO) para validar el sistema.
-- Ejecutar en el SQL Editor de Supabase después de aplicar las migraciones.
-- El código de pasajero (PAS-000001, PAS-000002, ...) y el QR se generan solos.

insert into passengers (nombre_completo, numero_identificacion, telefono, turno, punto_recogida, estado)
values
  ('Juan Perez Gomez', '100000001', '3000000001', 'Turno A', 'Punto 1', 'ACTIVO'),
  ('Maria Rodriguez Lopez', '100000002', '3000000002', 'Turno B', 'Punto 2', 'INACTIVO')
on conflict (numero_identificacion) do nothing
returning codigo_pasajero, nombre_completo, estado;
