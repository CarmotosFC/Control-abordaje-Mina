import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

// POST /api/passengers/:id/toggle  { estado: "ACTIVO" | "INACTIVO" }
export async function POST(request, { params }) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const estado = body.estado === "INACTIVO" ? "INACTIVO" : "ACTIVO";

  const admin = createSupabaseAdminClient();
  const { data: before } = await admin.from("passengers").select("*").eq("id", params.id).single();
  if (!before) return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 });

  const { data, error } = await admin
    .from("passengers")
    .update({ estado, updated_by: auth.profile.id })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    profile: auth.profile,
    action: estado === "ACTIVO" ? "ACTIVAR_PASAJERO" : "INACTIVAR_PASAJERO",
    entity: "passengers",
    entityId: data.id,
    detalles: { nombre_completo: data.nombre_completo, codigo_pasajero: data.codigo_pasajero, estado_anterior: before.estado, estado_nuevo: estado },
  });

  return NextResponse.json({ data });
}
