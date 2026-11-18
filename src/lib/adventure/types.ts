import type { ChristmasAspect, Ornament } from "@/lib/validation";

/**
 * Datos que puede ver un niño. Este tipo NO incluye estado de compra
 * ni notas privadas: solo columnas de children/journeys/wishes.
 */
export type ChildWish = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  priority: number;
  position: number;
};

export type ChildJourney = {
  preferredName: string | null;
  favoriteChristmasAspect: ChristmasAspect | null;
  specialMemory: string | null;
  treeDesign: Ornament[];
  currentStep: number;
  completedAt: string | null;
};

export type AdventureState = {
  displayName: string;
  journey: ChildJourney;
  wishes: ChildWish[];
};

export const STEP_KEYS = [
  "bienvenida",
  "nombre",
  "preguntas",
  "arbol",
  "deseos",
  "carta",
  "final",
] as const;
export type StepKey = (typeof STEP_KEYS)[number];
