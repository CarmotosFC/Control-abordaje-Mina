import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * Registra una acción administrativa en el log de auditoría.
 * Nunca lanza: un fallo al auditar no debe tumbar la operación principal,
 * pero se reporta en consola del servidor para investigación.
 */
export async function logAudit({ profile, action, entity, entityId, detalles }) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("audit_log").insert({
      user_id: profile?.id || null,
      user_email: profile?.email || null,
      user_name: profile?.full_name || null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      detalles: detalles || {},
    });
  } catch (err) {
    console.error("[audit_log] fallo al registrar auditoría:", err);
  }
}
