import { createHash, randomBytes } from "node:crypto";

/** 32 bytes = 256 bits de entropía, codificados en base64url (43 caracteres). */
export const ADVENTURE_TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateAdventureToken(): string {
  return randomBytes(ADVENTURE_TOKEN_BYTES).toString("base64url");
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** SHA-256 en hex: es lo único que se guarda en la base de datos. */
export function hashAdventureToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
