import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Cliente service_role. SOLO se usa en el servidor para la aventura
 * infantil (los niños no tienen sesión). Cada consulta debe filtrar por
 * el niño resuelto a partir del hash del token.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const env = getPublicSupabaseEnv();
  const key = getServiceRoleKey();
  if (!env || !key) throw new Error("Supabase service role no está configurado");
  cached = createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
