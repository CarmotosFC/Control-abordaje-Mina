import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    return NextResponse.json({ user: null, profile: null }, { status: 200 });
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
  });
}
