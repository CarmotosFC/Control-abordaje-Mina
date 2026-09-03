import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/audit?page=&pageSize=&action=&entity=
export async function GET(request) {
  const auth = await requireAuth(["ADMINISTRADOR"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const action = searchParams.get("action") || "";
  const entity = searchParams.get("entity") || "";

  const admin = createSupabaseAdminClient();
  let query = admin.from("audit_log").select("*", { count: "exact" });
  if (action) query = query.eq("action", action);
  if (entity) query = query.eq("entity", entity);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, pageSize });
}
