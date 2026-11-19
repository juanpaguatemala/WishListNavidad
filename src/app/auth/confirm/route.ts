import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

/**
 * Confirmación de correo con token_hash (plantilla de correo propia).
 * Funciona aunque el enlace se abra en otro navegador o dispositivo.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const fail = NextResponse.redirect(new URL("/auth/enlace-vencido", request.url));

  if (!isSupabaseConfigured() || !tokenHash || !type || !ALLOWED_TYPES.includes(type)) return fail;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail;

  return NextResponse.redirect(new URL("/auth/confirmado", request.url));
}
