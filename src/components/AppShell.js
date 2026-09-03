"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { IconDashboard, IconUsers, IconScan, IconHistory, IconShield, IconLogout, IconMenu, IconClose } from "./icons";

const NAV = [
  { href: "/dashboard", label: "Panel general", icon: IconDashboard },
  { href: "/pasajeros", label: "Gestión de pasajeros", icon: IconUsers },
  { href: "/abordaje", label: "Control de abordaje", icon: IconScan },
  { href: "/historial", label: "Historial de abordajes", icon: IconHistory },
  { href: "/usuarios", label: "Usuarios del sistema", icon: IconUsers },
  { href: "/auditoria", label: "Log de auditoría", icon: IconShield },
];

export default function AppShell({ profile, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Topbar móvil */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-brand-950 text-white px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-1 -ml-1" aria-label="Abrir menú">
          <IconMenu />
        </button>
        <span className="font-display font-bold text-sm tracking-tight">Control de Abordaje</span>
        <div className="w-6" />
      </div>

      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-brand-950 text-white flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7fe3ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <circle cx="7.5" cy="18" r="1.5" fill="#7fe3ac" stroke="none" />
                  <circle cx="16.5" cy="18" r="1.5" fill="#7fe3ac" stroke="none" />
                  <path d="M3 11h18" />
                </svg>
              </div>
              <span className="font-display font-bold text-[15px] leading-tight tracking-tight">
                Control de<br />Abordaje
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-white/60">
              <IconClose />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? "bg-brand-500/15 text-white" : "text-brand-100/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={active ? "text-brand-400" : "text-brand-100/40"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-brand-200/50">Administrador</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-brand-100/60 hover:bg-white/5 hover:text-white"
            >
              <IconLogout />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
