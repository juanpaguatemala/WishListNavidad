import { deleteWish, updateWish } from "@/lib/adventure/server";
import { guardAdventure, jsonError, readJsonBody, stateResponse, toErrorResponse } from "@/lib/http";
import { firstIssue, uuidSchema, wishInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/aventura/[token]/wishes/[wishId]">;

/** Edita un deseo propio. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { token, wishId } = await ctx.params;
  if (!uuidSchema.safeParse(wishId).success) return jsonError(404, "Ese deseo no existe");
  const guard = await guardAdventure(request, token, { limit: 30 });
  if ("response" in guard) return guard.response;
  try {
    const parsed = wishInputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return jsonError(422, firstIssue(parsed.error));
    await updateWish(guard.child, wishId, parsed.data);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}

/** Borra un deseo propio. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { token, wishId } = await ctx.params;
  if (!uuidSchema.safeParse(wishId).success) return jsonError(404, "Ese deseo no existe");
  const guard = await guardAdventure(request, token, { limit: 30 });
  if ("response" in guard) return guard.response;
  try {
    await deleteWish(guard.child, wishId);
  } catch (error) {
    return toErrorResponse(error);
  }
  return stateResponse(guard.child);
}
