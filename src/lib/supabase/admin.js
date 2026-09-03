import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la Service Role Key: ignora RLS. SOLO se usa en el servidor
 * (Route Handlers), nunca se importa desde un componente cliente. Toda
 * llamada que lo use debe validar antes la sesión y el rol del usuario
 * (ver src/lib/auth.js).
 */
let _admin = null;

export function createSupabaseAdminClient() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _admin;
}
