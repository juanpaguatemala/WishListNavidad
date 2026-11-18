import type { ChristmasAspect, OrnamentColor, OrnamentKind, PurchaseStatus } from "./validation";

export const ASPECT_LABELS: Record<ChristmasAspect, { label: string; emoji: string; phrase: string }> = {
  familia: { label: "La familia", emoji: "🏡", phrase: "estar con mi familia" },
  decorar: { label: "Decorar", emoji: "🎄", phrase: "decorar la casa y el árbol" },
  compartir: { label: "Compartir", emoji: "🤝", phrase: "compartir con los demás" },
  comida: { label: "La comida", emoji: "🍪", phrase: "la comida rica de estas fechas" },
  regalos: { label: "Los regalos", emoji: "🎁", phrase: "dar y recibir regalos" },
  tradiciones: { label: "Las tradiciones", emoji: "🕯️", phrase: "nuestras tradiciones" },
};

export const PRIORITY_LABELS: Record<number, { label: string; stars: string }> = {
  1: { label: "Lo que más deseo", stars: "★★★" },
  2: { label: "Me gustaría mucho", stars: "★★" },
  3: { label: "Sería lindo", stars: "★" },
};

export const PURCHASE_LABELS: Record<PurchaseStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  comprado: "Comprado",
  descartado: "Descartado",
};

export const ORNAMENT_LABELS: Record<OrnamentKind, string> = {
  esfera: "Esfera",
  luz: "Luz",
  lazo: "Lazo",
  baston: "Bastón de caramelo",
  estrella: "Estrella",
};

export const COLOR_LABELS: Record<OrnamentColor, string> = {
  rojo: "rojo",
  oro: "dorado",
  azul: "azul",
  plata: "plateado",
  verde: "verde",
  rosa: "rosa",
};

export const COLOR_HEX: Record<OrnamentColor, string> = {
  rojo: "#d0344f",
  oro: "#e8b94a",
  azul: "#4f8ff7",
  plata: "#cfd6e3",
  verde: "#3fae6c",
  rosa: "#f28ab2",
};

export const STEP_TITLES = [
  "La invitación",
  "Tu nombre",
  "Preguntas de Santa",
  "El árbol mágico",
  "Libro de deseos",
  "Tu carta",
  "¡Carta enviada!",
] as const;
