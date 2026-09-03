"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si venimos de una sesión expirada, mostramos aviso
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError("Correo o contraseña incorrectos.");
        setLoading(false);
        return;
      }
      const next = params.get("next") || "/";
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-sand-900 px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7fe3ac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <circle cx="7.5" cy="18" r="1.5" fill="#7fe3ac" stroke="none" />
              <circle cx="16.5" cy="18" r="1.5" fill="#7fe3ac" stroke="none" />
              <path d="M3 11h18" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Control de Abordaje</h1>
          <p className="text-brand-200/70 text-sm mt-1">Transporte de personal</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-white/[0.04] backdrop-blur border-white/10 p-6 space-y-4">
          <div>
            <label className="label !text-white/60">Correo electrónico</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input !bg-white/[0.06] !border-white/15 !text-white placeholder:!text-white/30"
              placeholder="nombre@empresa.com"
            />
          </div>
          <div>
            <label className="label !text-white/60">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input !bg-white/[0.06] !border-white/15 !text-white placeholder:!text-white/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          Acceso restringido — administrador y operador de transporte
        </p>
      </div>
    </div>
  );
}
