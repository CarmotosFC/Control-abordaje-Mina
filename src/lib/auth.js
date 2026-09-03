import { createSupabaseServerClient } from "./supabase/server";
import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * Devuelve { user, profile } del usuario autenticado en la petición actual,
 * o { user: null, profile: null } si no hay sesión. `profile` viene de la
 * tabla `profiles` (rol, nombre, estado activo) leída con el cliente admin
 * (RLS no permite leerla directamente).
 */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: profile || null };
}

/**
 * Para usar al inicio de cada Route Handler protegido.
 * roles: array opcional, p.ej. ["ADMINISTRADOR"] — si se omite, solo exige
 * sesión válida y perfil activo.
 * Devuelve { ok:true, user, profile } o { ok:false, response } donde
 * `response` ya es un NextResponse listo para `return`.
 */
export async function requireAuth(roles) {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    return {
      ok: false,
      status: 401,
      error: "No autenticado. Inicia sesión nuevamente.",
    };
  }

  if (!profile.active) {
    return {
      ok: false,
      status: 403,
      error: "Tu usuario ha sido desactivado. Contacta al administrador.",
    };
  }

  if (roles && roles.length > 0 && !roles.includes(profile.role)) {
    return {
      ok: false,
      status: 403,
      error: "No tienes permisos para realizar esta acción.",
    };
  }

  return { ok: true, user, profile };
}
