import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { maskId } from "@/lib/utils";

// GET /api/scan/cache — snapshot ligero de pasajeros para validación offline
// en la tablet. Solo incluye lo necesario para decidir AUTORIZADO/NO_AUTORIZADO
// y mostrar en pantalla; la identificación va parcialmente oculta.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("passengers")
    .select("codigo_pasajero, nombre_completo, numero_identificacion, turno, punto_recogida, estado");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || []).map((p) => ({
    codigo_pasajero: p.codigo_pasajero,
    nombre_completo: p.nombre_completo,
    identificacion_enmascarada: maskId(p.numero_identificacion),
    turno: p.turno,
    punto_recogida: p.punto_recogida,
    estado: p.estado,
  }));

  return NextResponse.json({ items, generadoEn: new Date().toISOString() });
}
