"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteOrigin } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAdventureToken, hashAdventureToken } from "@/lib/tokens";
import { childNameSchema, firstIssue, parentWishStatusSchema, uuidSchema } from "@/lib/validation";

/**
 * Acciones del panel de padres. Usan la sesión del usuario (clave anon):
 * RLS decide qué filas puede tocar. El hogar se obtiene de
 * ensure_household() en la base de datos, nunca del formulario.
 */

async function requireParent() {
  if (!isSupabaseConfigured()) throw new Error("Supabase no está configurado");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/padres/login");
  const { data: householdId, error } = await supabase.rpc("ensure_household");
  if (error || typeof householdId !== "string") throw new Error("No se pudo obtener el hogar");
  return { supabase, householdId };
}

export type LinkState = { error?: string; link?: string; childName?: string };

export async function createChild(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const parsed = childNameSchema.safeParse(String(formData.get("displayName") ?? ""));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const { supabase, householdId } = await requireParent();
    const token = generateAdventureToken();
    const { error } = await supabase.from("children").insert({
      household_id: householdId,
      display_name: parsed.data,
      adventure_token_hash: hashAdventureToken(token),
    });
    if (error) return { error: "No pudimos crear la aventura. Inténtalo de nuevo." };
    revalidatePath("/padres");
    return { link: `${await getSiteOrigin()}/aventura/${token}`, childName: parsed.data };
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No pudimos conectar con la base de datos." };
  }
}

export async function regenerateLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const childId = uuidSchema.safeParse(formData.get("childId"));
  if (!childId.success) return { error: "Participante no válido" };
  try {
    const { supabase } = await requireParent();
    const token = generateAdventureToken();
    const { data, error } = await supabase
      .from("children")
      .update({ adventure_token_hash: hashAdventureToken(token) })
      .eq("id", childId.data)
      .select("display_name");
    if (error || !data?.length) return { error: "No pudimos generar el enlace." };
    return { link: `${await getSiteOrigin()}/aventura/${token}`, childName: data[0].display_name as string };
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No pudimos conectar con la base de datos." };
  }
}

export type SimpleState = { error?: string; ok?: boolean };

export async function deleteChild(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const childId = uuidSchema.safeParse(formData.get("childId"));
  if (!childId.success) return { error: "Participante no válido" };
  try {
    const { supabase } = await requireParent();
    const { data, error } = await supabase.from("children").delete().eq("id", childId.data).select("id");
    if (error || !data?.length) return { error: "No pudimos borrar al participante." };
    revalidatePath("/padres");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No pudimos conectar con la base de datos." };
  }
}

export async function saveWishStatus(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = parentWishStatusSchema.safeParse({
    wishId: formData.get("wishId"),
    purchaseStatus: formData.get("purchaseStatus"),
    privateNote: String(formData.get("privateNote") ?? ""),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  try {
    const { supabase, householdId } = await requireParent();
    // household_id lo fija un trigger a partir del deseo; RLS verifica pertenencia.
    const { error } = await supabase.from("parent_wish_status").upsert(
      {
        wish_id: parsed.data.wishId,
        household_id: householdId,
        purchase_status: parsed.data.purchaseStatus,
        private_note: parsed.data.privateNote,
      },
      { onConflict: "wish_id" },
    );
    if (error) return { error: "No pudimos guardar el estado." };
    revalidatePath("/padres");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No pudimos conectar con la base de datos." };
  }
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/padres/login");
}
