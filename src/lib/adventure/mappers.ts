import { CHRISTMAS_ASPECTS, treeDesignSchema, type ChristmasAspect } from "@/lib/validation";
import type { AdventureState, ChildJourney, ChildWish } from "./types";

/** Columnas permitidas para el niño (lista blanca explícita). */
export const CHILD_WISH_COLUMNS = "id, title, description, url, image_url, priority, position";
export const CHILD_JOURNEY_COLUMNS =
  "preferred_name, favorite_christmas_aspect, special_memory, tree_design, current_step, completed_at";

type WishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  priority: number;
  position: number;
};

type JourneyRow = {
  preferred_name: string | null;
  favorite_christmas_aspect: string | null;
  special_memory: string | null;
  tree_design: unknown;
  current_step: number;
  completed_at: string | null;
};

/** Mapea una fila a ChildWish copiando SOLO campos permitidos. */
export function toChildWish(row: WishRow): ChildWish {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    imageUrl: row.image_url,
    priority: row.priority,
    position: row.position,
  };
}

export function toChildJourney(row: JourneyRow | null): ChildJourney {
  const tree = treeDesignSchema.safeParse(row?.tree_design ?? []);
  const aspect = row?.favorite_christmas_aspect;
  return {
    preferredName: row?.preferred_name ?? null,
    favoriteChristmasAspect: CHRISTMAS_ASPECTS.includes(aspect as ChristmasAspect)
      ? (aspect as ChristmasAspect)
      : null,
    specialMemory: row?.special_memory ?? null,
    treeDesign: tree.success ? tree.data : [],
    currentStep: row?.current_step ?? 0,
    completedAt: row?.completed_at ?? null,
  };
}

export function toAdventureState(
  displayName: string,
  journey: JourneyRow | null,
  wishes: WishRow[],
): AdventureState {
  return {
    displayName,
    journey: toChildJourney(journey),
    wishes: [...wishes].sort((a, b) => a.position - b.position).map(toChildWish),
  };
}
