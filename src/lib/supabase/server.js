import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components / Route Handlers, que lee la
 * sesión del usuario a partir de las cookies de la petición. Usa la clave
 * pública (anon) — respeta RLS, por eso NUNCA se usa para leer/escribir
 * pasajeros u otras tablas sensibles directamente; solo para conocer quién
 * es el usuario autenticado (auth.getUser()).
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llama desde un Server Component sin permiso de escritura;
            // el middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}
