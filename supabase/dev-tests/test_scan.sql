\echo '=== 1) Escaneo pasajero ACTIVO (Juan Perez, PAS-000001) -> esperado AUTORIZADO ==='
select register_boarding('PAS-000001', '00000000-0000-0000-0000-000000000002', 'Carlos Operador', 'dev-scan-001', false) as resultado_json \gx

\echo '=== 2) Escaneo pasajero INACTIVO (Maria Rodriguez, PAS-000002) -> esperado NO_AUTORIZADO ==='
select register_boarding('PAS-000002', '00000000-0000-0000-0000-000000000002', 'Carlos Operador', 'dev-scan-002', false)->>'resultado' as resultado;

\echo '=== 3) Escaneo QR inexistente (PAS-999999) -> esperado QR_NO_ENCONTRADO ==='
select register_boarding('PAS-999999', '00000000-0000-0000-0000-000000000002', 'Carlos Operador', 'dev-scan-003', false)->>'resultado' as resultado;

\echo '=== 4) Reescaneo del mismo pasajero activo el mismo dia -> esperado YA_REGISTRADO ==='
select register_boarding('PAS-000001', '00000000-0000-0000-0000-000000000002', 'Carlos Operador', 'dev-scan-004', false)->>'resultado' as resultado;

\echo '=== 5) Administrador fuerza un segundo registro (forzar=true) -> esperado AUTORIZADO nuevamente con override=true ==='
select register_boarding('PAS-000001', '00000000-0000-0000-0000-000000000001', 'Administrador Sistema', 'dev-scan-005', true)->>'resultado' as resultado;
select override from boarding_records where device_scan_id = 'dev-scan-005';

\echo '=== 6) Idempotencia: reintentar el MISMO device_scan_id (dev-scan-001) no debe duplicar ==='
select register_boarding('PAS-000001', '00000000-0000-0000-0000-000000000002', 'Carlos Operador', 'dev-scan-001', false)->>'idempotent' as fue_idempotente;
select count(*) as total_registros_dev_scan_001 from boarding_records where device_scan_id = 'dev-scan-001';

\echo '=== Resumen final: tabla de boarding_records ==='
select fecha, codigo_escaneado, resultado, nombre_pasajero, override, operador_nombre from boarding_records order by scanned_at;

\echo '=== Vista dashboard diario ==='
select * from v_boarding_daily_summary;

\echo '=== Conteo pasajeros activos/inactivos ==='
select estado, count(*) from passengers group by estado;
