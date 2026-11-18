import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/env";

/**
 * Refresca la sesión de Supabase en cada petición a /padres y redirige al
 * login si no hay usuario. Es una verificación optimista: las páginas y
 * acciones vuelven a validar el usuario en el servidor.
 */
export async function updateParentSession(request: NextRequest) {
  const env = getPublicSupabaseEnv();
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname.startsWith("/padres/login");
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/padres/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
