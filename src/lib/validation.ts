import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Quita caracteres de control y espacios sobrantes. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

const requiredText = (max: number, message: string) =>
  z.string().transform(cleanText).pipe(z.string().min(1, message).max(max, `Máximo ${max} caracteres`));

/** Texto opcional: cadena vacía o null → null; ausente → undefined (no se modifica). */
const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .transform((v) => (v === null ? null : cleanText(v)))
    .pipe(z.string().max(max, `Máximo ${max} caracteres`).nullable())
    .transform((v) => (v ? v : null))
    .optional();

/** Solo URLs http/https; se rechaza javascript:, data:, etc. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const optionalUrl = z
  .union([z.string(), z.null()])
  .transform((v) => (v === null ? "" : v.trim()))
  .pipe(
    z
      .string()
      .max(500, "El enlace es demasiado largo")
      .refine((v) => v === "" || isSafeHttpUrl(v), "Usa un enlace que empiece con http:// o https://"),
  )
  .transform((v) => (v === "" ? null : v))
  .optional();

/* ------------------------------------------------------------------ */
/* Nombres                                                             */
/* ------------------------------------------------------------------ */

// Letras (incluye acentos), espacios, guiones, apóstrofes y puntos.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;

export const childNameSchema = requiredText(40, "Escribe un nombre o apodo").refine(
  (v) => NAME_PATTERN.test(v),
  "Usa solo letras (sin números ni símbolos)",
);

/* ------------------------------------------------------------------ */
/* Recorrido                                                           */
/* ------------------------------------------------------------------ */

export const CHRISTMAS_ASPECTS = [
  "familia",
  "decorar",
  "compartir",
  "comida",
  "regalos",
  "tradiciones",
] as const;
export type ChristmasAspect = (typeof CHRISTMAS_ASPECTS)[number];

export const ORNAMENT_KINDS = ["esfera", "luz", "lazo", "baston", "estrella"] as const;
export type OrnamentKind = (typeof ORNAMENT_KINDS)[number];

export const ORNAMENT_COLORS = ["rojo", "oro", "azul", "plata", "verde", "rosa"] as const;
export type OrnamentColor = (typeof ORNAMENT_COLORS)[number];

export const MAX_ORNAMENTS = 60;

export const ornamentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{4,16}$/),
  kind: z.enum(ORNAMENT_KINDS),
  color: z.enum(ORNAMENT_COLORS),
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
});
export type Ornament = z.infer<typeof ornamentSchema>;

export const treeDesignSchema = z
  .array(ornamentSchema)
  .max(MAX_ORNAMENTS, `Máximo ${MAX_ORNAMENTS} adornos`)
  .refine((list) => list.filter((o) => o.kind === "estrella").length <= 1, "Solo cabe una estrella")
  .refine((list) => new Set(list.map((o) => o.id)).size === list.length, "Adornos repetidos");

export const journeyPatchSchema = z
  .object({
    preferredName: childNameSchema.optional(),
    favoriteChristmasAspect: z.enum(CHRISTMAS_ASPECTS).optional(),
    specialMemory: optionalText(500),
    treeDesign: treeDesignSchema.optional(),
    currentStep: z.number().int().min(0).max(6).optional(),
  })
  .strict();
export type JourneyPatch = z.infer<typeof journeyPatchSchema>;

/* ------------------------------------------------------------------ */
/* Deseos                                                              */
/* ------------------------------------------------------------------ */

export const MAX_WISHES = 30;

export const wishInputSchema = z
  .object({
    title: requiredText(80, "Escribe el nombre del regalo"),
    description: optionalText(300),
    url: optionalUrl,
    imageUrl: optionalUrl,
    priority: z.number().int().min(1).max(3),
  })
  .strict();
export type WishInput = z.infer<typeof wishInputSchema>;
export type WishFormValues = z.input<typeof wishInputSchema>;

export const wishOrderSchema = z
  .object({ ids: z.array(z.uuid()).max(MAX_WISHES) })
  .strict()
  .refine((v) => new Set(v.ids).size === v.ids.length, "IDs repetidos");

export const uuidSchema = z.uuid();

/* ------------------------------------------------------------------ */
/* Panel de padres                                                     */
/* ------------------------------------------------------------------ */

export const PURCHASE_STATUSES = ["pendiente", "en_proceso", "comprado", "descartado"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const parentWishStatusSchema = z
  .object({
    wishId: z.uuid(),
    purchaseStatus: z.enum(PURCHASE_STATUSES),
    privateNote: optionalText(500),
  })
  .strict();

export const parentCredentialsSchema = z.object({
  email: z.email("Correo no válido").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

/** Primer mensaje de error legible de un ZodError. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos no válidos";
}
