import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayBogota } from "@/lib/utils";

// GET /api/dashboard?fecha=YYYY-MM-DD
export async function GET(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") || todayBogota();

  const admin = createSupabaseAdminClient();

  const [{ count: totalPasajeros }, { count: activos }, { count: inactivos }, { data: boardingDay }] =
    await Promise.all([
      admin.from("passengers").select("*", { count: "exact", head: true }),
      admin.from("passengers").select("*", { count: "exact", head: true }).eq("estado", "ACTIVO"),
      admin.from("passengers").select("*", { count: "exact", head: true }).eq("estado", "INACTIVO"),
      admin.from("boarding_records").select("resultado, passenger_id").eq("fecha", fecha),
    ]);

  const rows = boardingDay || [];
  const autorizados = rows.filter((r) => r.resultado === "AUTORIZADO");
  const noAutorizados = rows.filter((r) => r.resultado === "NO_AUTORIZADO").length;
  const qrNoEncontrado = rows.filter((r) => r.resultado === "QR_NO_ENCONTRADO").length;
  const yaRegistrados = rows.filter((r) => r.resultado === "YA_REGISTRADO").length;

  const pasajerosUnicosAbordados = new Set(autorizados.map((r) => r.passenger_id)).size;
  const esperados = activos || 0;
  const pendientes = Math.max(0, esperados - pasajerosUnicosAbordados);
  const porcentaje = esperados > 0 ? Math.round((pasajerosUnicosAbordados / esperados) * 1000) / 10 : 0;

  // Serie de los últimos 7 días para el mini-histórico
  const { data: last7 } = await admin
    .from("v_boarding_daily_summary")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(7);

  return NextResponse.json({
    fecha,
    pasajerosRegistrados: totalPasajeros || 0,
    pasajerosActivos: activos || 0,
    pasajerosInactivos: inactivos || 0,
    abordajesDelDia: autorizados.length,
    noAutorizados,
    qrNoEncontrado,
    yaRegistrados,
    totalEsperados: esperados,
    totalAbordados: pasajerosUnicosAbordados,
    pendientes,
    porcentajeAbordaje: porcentaje,
    intentosNoAutorizados: noAutorizados + qrNoEncontrado,
    serie7dias: (last7 || []).reverse(),
  });
}
