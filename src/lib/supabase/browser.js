"use client";

import { createBrowserClient } from "@supabase/ssr";

let _client = null;

/** Cliente de Supabase para el navegador. Usado ÚNICAMENTE para
 * autenticación (signIn / signOut / getSession) — nunca para leer o
 * escribir tablas de datos directamente (RLS lo bloquea de todas formas). */
export function createSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _client;
}
