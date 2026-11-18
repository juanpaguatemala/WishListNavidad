import { createWish, reorderWishes } from "@/lib/adventure/server";
import { guardAdventure, jsonError, readJsonBody, stateResponse, toErrorResponse } from "@/lib/http";
import { firstIssue, wishInputSchema, wishOrderSchema } from "@/lib/validation";

/** Agrega un deseo. */
export async function POST(request: Request, ctx: RouteContext<"/api/aventura/[token]/wishes">) {
  const { token } = await ctx.params;
  const guard = await guardAdventure(request, token, { limit: 20 });
  if ("response" in guard) return guard.response;
  try {
    const parsed = wishInputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonError(422, firstIssue(parsed.error));
    await createWish(guard.child, parsed.data);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}

/** Reordena todos los deseos: { ids: [...] } en el nuevo orden. */
export async function PUT(request: Request, ctx: RouteContext<"/api/aventura/[token]/wishes">) {
  const { token } = await ctx.params;
  const guard = await guardAdventure(request, token, { limit: 40 });
  if ("response" in guard) return guard.response;
  try {
    const parsed = wishOrderSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonError(422, firstIssue(parsed.error));
    await reorderWishes(guard.child, parsed.data.ids);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}
