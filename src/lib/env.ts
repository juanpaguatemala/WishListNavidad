/**
 * Lectura centralizada de variables de entorno.
 * Las variables NEXT_PUBLIC_* se incrustan en el bundle del navegador;
 * las demás solo existen en el servidor.
 */

export function getPublicSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseEnv() !== null;
}

/** Solo servidor: clave service_role (o secret key) para las rutas infantiles. */
export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? null;
}

export function isChildAccessConfigured(): boolean {
  return isSupabaseConfigured() && getServiceRoleKey() !== null;
}
