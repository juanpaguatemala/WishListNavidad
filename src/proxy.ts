import { NextResponse, type NextRequest } from "next/server";
import { updateParentSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  // Si Supabase redirige a la portada (Site URL) con ?code= o ?error=,
  // se reenvía a la ruta correcta en lugar de ignorarlo.
  if (request.nextUrl.pathname === "/") {
    const params = request.nextUrl.searchParams;
    const code = params.get("code");
    if (code) {
      const url = new URL("/auth/callback", request.url);
      url.searchParams.set("code", code);
      return NextResponse.redirect(url);
    }
    if (params.get("error_code") || params.get("error")) {
      return NextResponse.redirect(new URL("/auth/enlace-vencido", request.url));
    }
    return NextResponse.next();
  }
  return updateParentSession(request);
}

export const config = {
  matcher: ["/", "/padres/:path*"],
};
