"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstIssue, parentCredentialsSchema } from "@/lib/validation";

export type AuthState = { error?: string; info?: string };

function parseCredentials(formData: FormData) {
  return parentCredentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "La app todavía no está configurada." };
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirma tu correo con el enlace que te enviamos antes de entrar."
          : "Correo o contraseña incorrectos.",
    };
  }
  redirect("/padres");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "La app todavía no está configurada." };
  const parsed = parseCredentials(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await getSiteOrigin()}/auth/callback` },
  });
  if (error) {
    return { error: error.code === "weak_password" ? "Usa una contraseña más segura." : "No pudimos crear la cuenta. Inténtalo de nuevo." };
  }
  if (data.session) redirect("/padres");
  return { info: "¡Listo! Revisa tu correo y confirma la cuenta para entrar." };
}
