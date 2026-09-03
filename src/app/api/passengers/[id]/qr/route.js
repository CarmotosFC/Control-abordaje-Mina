import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/passengers/:id/qr — imagen PNG del código QR (contiene ÚNICAMENTE
// el identificador único del pasajero, nunca datos personales).
export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const { data: passenger } = await admin
    .from("passengers")
    .select("codigo_pasajero")
    .eq("id", params.id)
    .single();

  if (!passenger) return NextResponse.json({ error: "Pasajero no encontrado" }, { status: 404 });

  const buffer = await QRCode.toBuffer(passenger.codigo_pasajero, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#12402d", light: "#ffffff" },
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
