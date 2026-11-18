import { updateJourney } from "@/lib/adventure/server";
import { guardAdventure, jsonError, readJsonBody, stateResponse, toErrorResponse } from "@/lib/http";
import { firstIssue, journeyPatchSchema } from "@/lib/validation";

/** Guarda nombre, respuestas, árbol o progreso. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/aventura/[token]/journey">) {
  const { token } = await ctx.params;
  const guard = await guardAdventure(request, token, { limit: 40 });
  if ("response" in guard) return guard.response;
  try {
    const parsed = journeyPatchSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonError(422, firstIssue(parsed.error));
    await updateJourney(guard.child, parsed.data);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}
