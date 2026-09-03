import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { validatePassenger } from "../route";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("passengers").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PUT(request, { params }) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { nombre_completo, numero_identificacion, telefono, turno, punto_recogida } = body;
  const errors = validatePassenger({ nombre_completo, numero_identificacion, turno, punto_recogida });
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: before } = await admin.from("passengers").select("*").eq("id", params.id).single();
  if (!before) return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 });

  const { data, error } = await admin
    .from("passengers")
    .update({
      nombre_completo: nombre_completo.trim(),
      numero_identificacion: String(numero_identificacion).trim(),
      telefono: telefono ? String(telefono).trim() : null,
      turno: turno.trim(),
      punto_recogida: punto_recogida.trim(),
      updated_by: auth.profile.id,
    })
    .eq("id", params.id)
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
    action: "EDITAR_PASAJERO",
    entity: "passengers",
    entityId: data.id,
    detalles: { antes: before, despues: data },
  });

  return NextResponse.json({ data });
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const { data: before } = await admin.from("passengers").select("*").eq("id", params.id).single();
  if (!before) return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 });

  const { error } = await admin.from("passengers").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    profile: auth.profile,
    action: "ELIMINAR_PASAJERO",
    entity: "passengers",
    entityId: params.id,
    detalles: { registro_eliminado: before },
  });

  return NextResponse.json({ ok: true });
}
