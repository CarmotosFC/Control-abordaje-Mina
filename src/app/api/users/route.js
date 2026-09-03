import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

// GET /api/users — lista de usuarios del sistema (solo ADMINISTRADOR)
export async function GET() {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/users — crear administrador u operador
export async function POST(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const { email, full_name, role, password } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });
  }
  if (!full_name || !full_name.trim()) {
    return NextResponse.json({ error: "El nombre completo es obligatorio." }, { status: 400 });
  }
  if (!["ADMINISTRADOR", "OPERADOR"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role,
      active: true,
    })
    .select()
    .single();

  if (profileError) {
    // revertir creación en auth si falla el perfil
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAudit({
    profile: auth.profile,
    action: "CREAR_USUARIO",
    entity: "profiles",
    entityId: profile.id,
    detalles: { email: profile.email, role: profile.role },
  });

  return NextResponse.json({ data: profile });
}
