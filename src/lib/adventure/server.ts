import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashAdventureToken, isWellFormedToken } from "@/lib/tokens";
import { MAX_WISHES, type JourneyPatch, type WishInput } from "@/lib/validation";
import { CHILD_JOURNEY_COLUMNS, CHILD_WISH_COLUMNS, toAdventureState } from "./mappers";
import type { AdventureState } from "./types";

/**
 * Capa de acceso a datos de la aventura infantil.
 * Todas las funciones reciben el childId ya resuelto desde el hash del
 * token y filtran por él. Nunca tocan parent_wish_status.
 */

export class AdventureError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ResolvedChild = { id: string; displayName: string };

export async function resolveChildByToken(token: string): Promise<ResolvedChild | null> {
  if (!isWellFormedToken(token)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("children")
    .select("id, display_name")
    .eq("adventure_token_hash", hashAdventureToken(token))
    .maybeSingle();
  if (error) throw new AdventureError(503, "No pudimos conectar con el Polo Norte");
  if (!data) return null;
  return { id: data.id as string, displayName: data.display_name as string };
}

export async function loadAdventureState(child: ResolvedChild): Promise<AdventureState> {
  const db = getSupabaseAdmin();
  const [journey, wishes] = await Promise.all([
    db.from("journeys").select(CHILD_JOURNEY_COLUMNS).eq("child_id", child.id).maybeSingle(),
    db.from("wishes").select(CHILD_WISH_COLUMNS).eq("child_id", child.id).order("position"),
  ]);
  if (journey.error || wishes.error) throw new AdventureError(503, "No pudimos leer tu aventura");
  return toAdventureState(child.displayName, journey.data, wishes.data ?? []);
}

export async function updateJourney(child: ResolvedChild, patch: JourneyPatch): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.preferredName !== undefined) update.preferred_name = patch.preferredName;
  if (patch.favoriteChristmasAspect !== undefined)
    update.favorite_christmas_aspect = patch.favoriteChristmasAspect;
  if (patch.specialMemory !== undefined) update.special_memory = patch.specialMemory;
  if (patch.treeDesign !== undefined) update.tree_design = patch.treeDesign;
  if (patch.currentStep !== undefined) update.current_step = patch.currentStep;
  if (Object.keys(update).length === 0) return;

  const { data, error } = await getSupabaseAdmin()
    .from("journeys")
    .update(update)
    .eq("child_id", child.id)
    .select("child_id");
  if (error) throw new AdventureError(503, "No pudimos guardar tu aventura");
  if (!data?.length) throw new AdventureError(404, "Aventura no encontrada");
}

function wishRow(input: WishInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    url: input.url ?? null,
    image_url: input.imageUrl ?? null,
    priority: input.priority,
  };
}

export async function createWish(child: ResolvedChild, input: WishInput): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: existing, error: readError } = await db
    .from("wishes")
    .select("position")
    .eq("child_id", child.id);
  if (readError) throw new AdventureError(503, "No pudimos leer tus deseos");
  if ((existing?.length ?? 0) >= MAX_WISHES) {
    throw new AdventureError(422, `Tu libro ya tiene ${MAX_WISHES} deseos. ¡Está lleno de magia!`);
  }
  const nextPosition = (existing ?? []).reduce((max, w) => Math.max(max, (w.position as number) + 1), 0);

  const { error } = await db
    .from("wishes")
    .insert({ ...wishRow(input), child_id: child.id, position: nextPosition });
  if (error) throw new AdventureError(503, "No pudimos guardar tu deseo");
}

export async function updateWish(child: ResolvedChild, wishId: string, input: WishInput): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("wishes")
    .update(wishRow(input))
    .eq("id", wishId)
    .eq("child_id", child.id)
    .select("id");
  if (error) throw new AdventureError(503, "No pudimos guardar tu deseo");
  if (!data?.length) throw new AdventureError(404, "Ese deseo no existe");
}

export async function deleteWish(child: ResolvedChild, wishId: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("wishes")
    .delete()
    .eq("id", wishId)
    .eq("child_id", child.id)
    .select("id");
  if (error) throw new AdventureError(503, "No pudimos borrar tu deseo");
  if (!data?.length) throw new AdventureError(404, "Ese deseo no existe");
}

export async function reorderWishes(child: ResolvedChild, ids: string[]): Promise<void> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("wishes").select("id").eq("child_id", child.id);
  if (error) throw new AdventureError(503, "No pudimos leer tus deseos");
  const owned = new Set((data ?? []).map((w) => w.id as string));
  if (owned.size !== ids.length || ids.some((id) => !owned.has(id))) {
    throw new AdventureError(409, "Tu lista cambió. Recarga la página e inténtalo otra vez.");
  }
  const results = await Promise.all(
    ids.map((id, position) =>
      db.from("wishes").update({ position }).eq("id", id).eq("child_id", child.id),
    ),
  );
  if (results.some((r) => r.error)) throw new AdventureError(503, "No pudimos ordenar tus deseos");
}

export async function completeJourney(child: ResolvedChild): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: journey, error: readError } = await db
    .from("journeys")
    .select("preferred_name")
    .eq("child_id", child.id)
    .maybeSingle();
  if (readError) throw new AdventureError(503, "No pudimos leer tu aventura");
  if (!journey) throw new AdventureError(404, "Aventura no encontrada");

  const { count, error: countError } = await db
    .from("wishes")
    .select("id", { count: "exact", head: true })
    .eq("child_id", child.id);
  if (countError) throw new AdventureError(503, "No pudimos leer tus deseos");
  if (!count) throw new AdventureError(422, "Agrega al menos un deseo antes de enviar tu carta");

  const { data, error } = await db
    .from("journeys")
    .update({ completed_at: new Date().toISOString(), current_step: 6 })
    .eq("child_id", child.id)
    .select("completed_at");
  if (error || !data?.length) throw new AdventureError(503, "No pudimos enviar tu carta");
}
