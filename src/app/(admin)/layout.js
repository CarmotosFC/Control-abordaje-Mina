import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({ children }) {
  const { profile } = await getCurrentUser();

  if (!profile) redirect("/login");
  if (profile.role !== "ADMINISTRADOR") redirect("/abordaje");

  return <AppShell profile={profile}>{children}</AppShell>;
}
