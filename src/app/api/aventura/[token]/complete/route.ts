import { completeJourney } from "@/lib/adventure/server";
import { guardAdventure, stateResponse, toErrorResponse } from "@/lib/http";

/** Envía la carta. Solo responde éxito cuando la base de datos confirma. */
export async function POST(request: Request, ctx: RouteContext<"/api/aventura/[token]/complete">) {
  const { token } = await ctx.params;
  const guard = await guardAdventure(request, token, { limit: 10 });
  if ("response" in guard) return guard.response;
  try {
    await completeJourney(guard.child);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}
