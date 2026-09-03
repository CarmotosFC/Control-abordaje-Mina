import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const { profile } = await getCurrentUser();

  if (!profile) redirect("/login");
  if (profile.role === "ADMINISTRADOR") redirect("/dashboard");
  redirect("/abordaje");
}
