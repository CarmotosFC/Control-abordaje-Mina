import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

// GET /api/passengers?search=&turno=&punto=&estado=&page=&pageSize=
export async function GET(request) {
  const auth = await requireAuth(); // cualquier usuario autenticado activo puede consultar
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const turno = searchParams.get("turno") || "";
  const punto = searchParams.get("punto") || "";
  const estado = searchParams.get("estado") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));

  const admin = createSupabaseAdminClient();
  let query = admin.from("passengers").select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `nombre_completo.ilike.%${search}%,numero_identificacion.ilike.%${search}%,codigo_pasajero.ilike.%${search}%`
    );
  }
  if (turno) query = query.eq("turno", turno);
  if (punto) query = query.eq("punto_recogida", punto);
  if (estado) query = query.eq("estado", estado);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Listas de valores distintos para poblar filtros (turnos y puntos existentes)
  const { data: turnos } = await admin.from("passengers").select("turno").not("turno", "is", null);
  const { data: puntos } = await admin
    .from("passengers")
    .select("punto_recogida")
    .not("punto_recogida", "is", null);

  return NextResponse.json({
    data,
    total: count,
    page,
    pageSize,
    turnos: [...new Set((turnos || []).map((t) => t.turno))].sort(),
    puntos: [...new Set((puntos || []).map((p) => p.punto_recogida))].sort(),
  });
}

// POST /api/passengers — crear pasajero (solo ADMINISTRADOR)
export async function POST(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { nombre_completo, numero_identificacion, telefono, turno, punto_recogida } = body;

  const errors = validatePassenger({ nombre_completo, numero_identificacion, turno, punto_recogida });
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("passengers")
    .insert({
      nombre_completo: nombre_completo.trim(),
      numero_identificacion: String(numero_identificacion).trim(),
      telefono: telefono ? String(telefono).trim() : null,
      turno: turno.trim(),
      punto_recogida: punto_recogida.trim(),
      estado: "ACTIVO",
      created_by: auth.profile.id,
      updated_by: auth.profile.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un pasajero con ese número de identificación." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    profile: auth.profile,
    action: "CREAR_PASAJERO",
    entity: "passengers",
    entityId: data.id,
    detalles: { codigo_pasajero: data.codigo_pasajero, nombre_completo: data.nombre_completo },
  });

  return NextResponse.json({ data });
}

export function validatePassenger({ nombre_completo, numero_identificacion, turno, punto_recogida }) {
  const errors = [];
  if (!nombre_completo || !String(nombre_completo).trim()) errors.push("El nombre completo es obligatorio.");
  if (!numero_identificacion || !String(numero_identificacion).trim())
    errors.push("El número de identificación es obligatorio.");
  else if (!/^[0-9A-Za-z.\-]{3,30}$/.test(String(numero_identificacion).trim()))
    errors.push("El número de identificación tiene un formato inválido.");
  if (!turno || !String(turno).trim()) errors.push("El turno es obligatorio.");
  if (!punto_recogida || !String(punto_recogida).trim()) errors.push("El punto de recogida es obligatorio.");
  return errors;
}
