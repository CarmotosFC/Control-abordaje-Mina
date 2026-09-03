-- ============================================================================
-- FUNCIÓN ATÓMICA: register_boarding
-- Encapsula TODA la regla de negocio del escaneo en una sola transacción de
-- base de datos (evita condiciones de carrera entre escaneos simultáneos y
-- es la única fuente de verdad de la regla ACTIVO/INACTIVO/YA_REGISTRADO).
--
-- Preparado para reglas avanzadas futuras (sección 16 del requerimiento):
-- turno autorizado, punto autorizado, ruta, vehículo, horario — se agregarían
-- como validaciones adicionales DENTRO de esta función, sin tocar el resto
-- de la aplicación (el frontend y las rutas API no conocen la regla, solo
-- consumen el resultado).
-- ============================================================================

create or replace function register_boarding(
  p_codigo          text,
  p_operador_id     uuid,
  p_operador_nombre text,
  p_device_scan_id  text default null,
  p_forzar          boolean default false
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_passenger  passengers%rowtype;
  v_existing   boarding_records%rowtype;
  v_resultado  text;
  v_record     boarding_records%rowtype;
  v_today      date := (now() at time zone 'America/Bogota')::date;
  v_found_prev boolean := false;
begin
  -- Idempotencia: si este escaneo ya se sincronizó antes (reintento offline),
  -- devolver el registro existente sin duplicar.
  if p_device_scan_id is not null then
    select * into v_record from boarding_records where device_scan_id = p_device_scan_id;
    if found then
      return jsonb_build_object('idempotent', true, 'resultado', v_record.resultado, 'record', row_to_json(v_record));
    end if;
  end if;

  select * into v_passenger from passengers where codigo_pasajero = p_codigo;

  if not found then
    insert into boarding_records(passenger_id, codigo_escaneado, resultado, operador_id, operador_nombre, device_scan_id, fecha)
    values (null, p_codigo, 'QR_NO_ENCONTRADO', p_operador_id, p_operador_nombre, p_device_scan_id, v_today)
    returning * into v_record;

    return jsonb_build_object('resultado', 'QR_NO_ENCONTRADO', 'record', row_to_json(v_record));
  end if;

  -- ¿Ya hubo un abordaje AUTORIZADO de este pasajero hoy?
  select * into v_existing
    from boarding_records
   where passenger_id = v_passenger.id
     and fecha = v_today
     and resultado = 'AUTORIZADO'
   order by scanned_at desc
   limit 1;

  v_found_prev := found;

  if v_found_prev and not p_forzar then
    insert into boarding_records(
      passenger_id, codigo_escaneado, resultado, nombre_pasajero, identificacion_pasajero,
      turno, punto_recogida, estado_pasajero, operador_id, operador_nombre, device_scan_id, fecha
    ) values (
      v_passenger.id, p_codigo, 'YA_REGISTRADO', v_passenger.nombre_completo, v_passenger.numero_identificacion,
      v_passenger.turno, v_passenger.punto_recogida, v_passenger.estado, p_operador_id, p_operador_nombre, p_device_scan_id, v_today
    ) returning * into v_record;

    return jsonb_build_object(
      'resultado', 'YA_REGISTRADO',
      'record', row_to_json(v_record),
      'registro_previo', row_to_json(v_existing),
      'passenger', row_to_json(v_passenger)
    );
  end if;

  -- REGLA PRINCIPAL (sección 16): estado determina el resultado.
  if v_passenger.estado = 'INACTIVO' then
    v_resultado := 'NO_AUTORIZADO';
  else
    v_resultado := 'AUTORIZADO';
  end if;

  insert into boarding_records(
    passenger_id, codigo_escaneado, resultado, nombre_pasajero, identificacion_pasajero,
    turno, punto_recogida, estado_pasajero, operador_id, operador_nombre, override, device_scan_id, fecha
  ) values (
    v_passenger.id, p_codigo, v_resultado, v_passenger.nombre_completo, v_passenger.numero_identificacion,
    v_passenger.turno, v_passenger.punto_recogida, v_passenger.estado, p_operador_id, p_operador_nombre,
    (v_found_prev and p_forzar), p_device_scan_id, v_today
  ) returning * into v_record;

  return jsonb_build_object(
    'resultado', v_resultado,
    'record', row_to_json(v_record),
    'passenger', row_to_json(v_passenger)
  );
end;
$$;
