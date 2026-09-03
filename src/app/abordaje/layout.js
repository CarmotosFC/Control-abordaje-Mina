import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ScanTopbar from "./ScanTopbar";

export default async function AbordajeLayout({ children }) {
  const { profile } = await getCurrentUser();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login");

  return (
    <div className="min-h-screen bg-sand-900">
      <ScanTopbar profile={profile} />
      {children}
    </div>
  );
}
