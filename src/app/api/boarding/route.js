import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/boarding?search=&fechaDesde=&fechaHasta=&turno=&punto=&resultado=&page=&pageSize=
export async function GET(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const filters = buildFilters(searchParams);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));

  const admin = createSupabaseAdminClient();
  let query = applyFilters(admin.from("boarding_records").select("*", { count: "exact" }), filters);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order("scanned_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, pageSize });
}

export function buildFilters(searchParams) {
  return {
    search: (searchParams.get("search") || "").trim(),
    fechaDesde: searchParams.get("fechaDesde") || "",
    fechaHasta: searchParams.get("fechaHasta") || "",
    turno: searchParams.get("turno") || "",
    punto: searchParams.get("punto") || "",
    resultado: searchParams.get("resultado") || "",
  };
}

export function applyFilters(query, f) {
  if (f.search) {
    query = query.or(
      `nombre_pasajero.ilike.%${f.search}%,identificacion_pasajero.ilike.%${f.search}%,codigo_escaneado.ilike.%${f.search}%`
    );
  }
  if (f.fechaDesde) query = query.gte("fecha", f.fechaDesde);
  if (f.fechaHasta) query = query.lte("fecha", f.fechaHasta);
  if (f.turno) query = query.eq("turno", f.turno);
  if (f.punto) query = query.eq("punto_recogida", f.punto);
  if (f.resultado) query = query.eq("resultado", f.resultado);
  return query;
}
