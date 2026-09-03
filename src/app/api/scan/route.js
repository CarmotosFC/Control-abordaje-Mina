import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

// POST /api/scan { codigo, device_scan_id, forzar }
// Cualquier usuario activo (ADMINISTRADOR u OPERADOR) puede escanear.
// `forzar` (permitir un segundo abordaje el mismo día) solo tiene efecto
// si quien escanea es ADMINISTRADOR — se ignora silenciosamente para
// operadores, sin importar lo que envíe el cliente.
export async function POST(request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body || !body.codigo) {
    return NextResponse.json({ error: "Código QR requerido" }, { status: 400 });
  }

  const codigo = String(body.codigo).trim();
  const deviceScanId = body.device_scan_id ? String(body.device_scan_id) : null;
  const forzar = Boolean(body.forzar) && auth.profile.role === "ADMINISTRADOR";

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("register_boarding", {
    p_codigo: codigo,
    p_operador_id: auth.profile.id,
    p_operador_nombre: auth.profile.full_name,
    p_device_scan_id: deviceScanId,
    p_forzar: forzar,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data.resultado === "AUTORIZADO" && data.record?.override) {
    await logAudit({
      profile: auth.profile,
      action: "PERMITIR_SEGUNDO_REGISTRO",
      entity: "boarding_records",
      entityId: data.record.id,
      detalles: { codigo, nombre: data.passenger?.nombre_completo },
    });
  }

  return NextResponse.json(data);
}
