import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function POST(request, { params }) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (params.id === auth.profile.id) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: before } = await admin.from("profiles").select("*").eq("id", params.id).single();
  if (!before) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const nuevoEstado = !before.active;
  const { data, error } = await admin
    .from("profiles")
    .update({ active: nuevoEstado })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    profile: auth.profile,
    action: nuevoEstado ? "ACTIVAR_USUARIO" : "INACTIVAR_USUARIO",
    entity: "profiles",
    entityId: data.id,
    detalles: { email: data.email },
  });

  return NextResponse.json({ data });
}
