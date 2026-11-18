"use client";

import type { AdventureState } from "@/lib/adventure/types";

export class ApiError extends Error {}

/**
 * Llama a las rutas infantiles y devuelve el estado confirmado por la
 * base de datos. Nunca simula éxito: cualquier fallo lanza ApiError.
 */
export async function callAdventure(
  token: string,
  method: "GET" | "PATCH" | "POST" | "PUT" | "DELETE",
  path = "",
  body?: unknown,
): Promise<AdventureState> {
  let res: Response;
  try {
    res = await fetch(`/api/aventura/${encodeURIComponent(token)}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ApiError("Parece que no hay conexión. Revisa tu internet e inténtalo otra vez.");
  }
  let data: { state?: AdventureState; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !data?.state) {
    throw new ApiError(data?.error ?? "Algo salió mal en el taller de Santa. Inténtalo otra vez.");
  }
  return data.state;
}
