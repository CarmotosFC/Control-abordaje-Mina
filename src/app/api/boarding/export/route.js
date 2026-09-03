import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toCSV, formatDateTime, RESULT_LABELS } from "@/lib/utils";
import { buildFilters, applyFilters } from "../route";

// GET /api/boarding/export — exporta el historial filtrado a CSV
export async function GET(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const filters = buildFilters(searchParams);

  const admin = createSupabaseAdminClient();
  let query = applyFilters(admin.from("boarding_records").select("*"), filters);
  query = query.order("scanned_at", { ascending: false }).limit(10000);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCSV(data, [
    { label: "Fecha", value: (r) => r.fecha },
    { label: "Fecha y hora", value: (r) => formatDateTime(r.scanned_at) },
    { label: "Pasajero", value: (r) => r.nombre_pasajero || "" },
    { label: "Identificación", value: (r) => r.identificacion_pasajero || "" },
    { label: "Turno", value: (r) => r.turno || "" },
    { label: "Punto de recogida", value: (r) => r.punto_recogida || "" },
    { label: "Estado del pasajero", value: (r) => r.estado_pasajero || "" },
    { label: "Resultado", value: (r) => RESULT_LABELS[r.resultado] || r.resultado },
    { label: "Código escaneado", value: (r) => r.codigo_escaneado },
    { label: "Operador", value: (r) => r.operador_nombre || "" },
    { label: "Segundo registro autorizado", value: (r) => (r.override ? "Sí" : "No") },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial_abordajes_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
