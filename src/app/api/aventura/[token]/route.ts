import { guardAdventure, stateResponse } from "@/lib/http";

/** Estado actual de la aventura (solo datos infantiles). */
export async function GET(request: Request, ctx: RouteContext<"/api/aventura/[token]">) {
  const { token } = await ctx.params;
  const guard = await guardAdventure(request, token, { limit: 60 });
  if ("response" in guard) return guard.response;
  return stateResponse(guard.child);
}
