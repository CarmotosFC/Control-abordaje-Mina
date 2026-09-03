"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ScanTopbar({ profile }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between px-4 h-14 bg-brand-950 text-white">
      <div className="flex items-center gap-2">
        <span className="font-display font-bold text-sm">Control de Abordaje</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-brand-200/60 hidden sm:inline">
          {profile.full_name} · {profile.role === "ADMINISTRADOR" ? "Administrador" : "Operador"}
        </span>
        {profile.role === "ADMINISTRADOR" && (
          <Link href="/dashboard" className="text-brand-300 hover:text-white font-medium">
            Panel admin
          </Link>
        )}
        <button onClick={handleLogout} className="text-brand-300 hover:text-white font-medium">
          Salir
        </button>
      </div>
    </div>
  );
}
