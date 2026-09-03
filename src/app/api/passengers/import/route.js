import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { validatePassenger } from "../route";
import { normalizeImportRow } from "@/lib/importUtils";

// POST /api/passengers/import { rows: [{nombre_completo, numero_identificacion, telefono, turno, punto_recogida}] }
export async function POST(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "El archivo no contiene registros para procesar." }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: "El archivo tiene demasiados registros (máximo 5000 por carga)." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: existingRows } = await admin.from("passengers").select("numero_identificacion");
  const existingIds = new Set((existingRows || []).map((r) => String(r.numero_identificacion).trim()));

  const seenInFile = new Set();
  const toCreate = [];
  const detalles = [];
  let duplicados = 0;
  let conErrores = 0;

  rows.forEach((raw, idx) => {
    const fila = idx + 2; // fila 1 = encabezado
    // Acepta tanto las claves canónicas (nombre_completo, ...) que ya manda
    // el frontend, como encabezados originales en español con variaciones
    // de tildes/mayúsculas (por si se llama a este endpoint directamente).
    const alreadyCanonical = raw.nombre_completo != null || raw.numero_identificacion != null;
    const normalized = alreadyCanonical ? raw : normalizeImportRow(raw);
    const nombre_completo = (normalized.nombre_completo || "").toString().trim();
    const numero_identificacion = (normalized.numero_identificacion || "").toString().trim();
    const telefono = (normalized.telefono || "").toString().trim();
    const turno = (normalized.turno || "").toString().trim();
    const punto_recogida = (normalized.punto_recogida || "").toString().trim();

    const errors = validatePassenger({ nombre_completo, numero_identificacion, turno, punto_recogida });

    if (errors.length) {
      conErrores++;
      detalles.push({ fila, estado: "ERROR", motivo: errors.join(" "), numero_identificacion });
      return;
    }

    if (existingIds.has(numero_identificacion) || seenInFile.has(numero_identificacion)) {
      duplicados++;
      detalles.push({ fila, estado: "DUPLICADO", motivo: "Número de identificación ya existe.", numero_identificacion });
      return;
    }

    seenInFile.add(numero_identificacion);
    toCreate.push({
      nombre_completo,
      numero_identificacion,
      telefono: telefono || null,
      turno,
      punto_recogida,
      estado: "ACTIVO",
      created_by: auth.profile.id,
      updated_by: auth.profile.id,
    });
  });

  let creados = 0;
  if (toCreate.length > 0) {
    const { data, error } = await admin.from("passengers").insert(toCreate).select("id");
    if (error) {
      return NextResponse.json({ error: "Error al guardar los pasajeros válidos: " + error.message }, { status: 500 });
    }
    creados = data.length;
  }

  await logAudit({
    profile: auth.profile,
    action: "IMPORTAR_PASAJEROS",
    entity: "passengers",
    entityId: null,
    detalles: { procesados: rows.length, creados, duplicados, conErrores },
  });

  return NextResponse.json({
    procesados: rows.length,
    creados,
    duplicados,
    conErrores,
    detalles: detalles.slice(0, 500),
  });
}
