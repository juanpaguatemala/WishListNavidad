import "server-only";
import { isChildAccessConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { hashAdventureToken } from "@/lib/tokens";
import {
  AdventureError,
  loadAdventureState,
  resolveChildByToken,
  type ResolvedChild,
} from "@/lib/adventure/server";

export const MAX_JSON_BYTES = 16 * 1024;

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}) {
  return Response.json({ error: message }, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

export function jsonOk(body: unknown) {
  return Response.json(body, { headers: NO_STORE });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Lee JSON con límite de tamaño, sin confiar en Content-Length. */
export async function readJsonBody(request: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Formato no soportado");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "La petición es demasiado grande");

  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Petición vacía");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "La petición es demasiado grande");
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON no válido");
  }
}

type Guarded = { child: ResolvedChild } | { response: Response };

/**
 * Común a todas las rutas infantiles: configuración, rate limiting por IP
 * y por token, y resolución del niño. Respuesta genérica si el token no
 * existe (no revela si un token fue válido alguna vez).
 */
export async function guardAdventure(
  request: Request,
  token: string,
  opts: { limit: number; windowMs?: number },
): Promise<Guarded> {
  if (!isChildAccessConfigured()) {
    return { response: jsonError(503, "La aventura todavía no está configurada") };
  }
  const windowMs = opts.windowMs ?? 60_000;
  const ip = clientIp(request);
  const byIp = rateLimit(`ip:${ip}`, opts.limit * 3, windowMs);
  const byToken = rateLimit(`tk:${hashAdventureToken(token).slice(0, 32)}`, opts.limit, windowMs);
  const limited = !byIp.ok ? byIp : !byToken.ok ? byToken : null;
  if (limited) {
    return {
      response: jsonError(429, "¡Despacio, duende veloz! Espera un momentito.", {
        "Retry-After": String(limited.retryAfterSeconds),
      }),
    };
  }
  try {
    const child = await resolveChildByToken(token);
    if (!child) return { response: jsonError(404, "Este enlace mágico no es válido") };
    return { child };
  } catch (error) {
    return { response: toErrorResponse(error) };
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError || error instanceof AdventureError) {
    return jsonError(error.status, error.message);
  }
  console.error("[aventura] error inesperado", error);
  return jsonError(500, "Algo salió mal en el taller. Inténtalo de nuevo.");
}

export async function stateResponse(child: ResolvedChild): Promise<Response> {
  try {
    return jsonOk({ state: await loadAdventureState(child) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
