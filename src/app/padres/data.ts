import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toChildJourney, toChildWish } from "@/lib/adventure/mappers";
import type { ChildJourney, ChildWish } from "@/lib/adventure/types";
import { PURCHASE_STATUSES, type PurchaseStatus } from "@/lib/validation";

export type ParentWishView = ChildWish & { purchaseStatus: PurchaseStatus; privateNote: string | null };

export type ParentChildView = {
  id: string;
  displayName: string;
  createdAt: string;
  journey: ChildJourney;
  journeyUpdatedAt: string | null;
  wishes: ParentWishView[];
};

/** Carga todo el hogar del usuario. RLS limita los resultados a su hogar. */
export async function loadHousehold(supabase: SupabaseClient): Promise<ParentChildView[]> {
  const children = await supabase
    .from("children")
    .select("id, display_name, created_at")
    .order("created_at", { ascending: true });
  if (children.error) throw children.error;
  const ids = (children.data ?? []).map((c) => c.id as string);
  if (ids.length === 0) return [];

  const [journeys, wishes, statuses] = await Promise.all([
    supabase
      .from("journeys")
      .select(
        "child_id, preferred_name, favorite_christmas_aspect, special_memory, tree_design, current_step, completed_at, updated_at",
      )
      .in("child_id", ids),
    supabase
      .from("wishes")
      .select("id, child_id, title, description, url, image_url, priority, position")
      .in("child_id", ids)
      .order("position"),
    supabase.from("parent_wish_status").select("wish_id, purchase_status, private_note"),
  ]);
  if (journeys.error) throw journeys.error;
  if (wishes.error) throw wishes.error;
  if (statuses.error) throw statuses.error;

  const statusByWish = new Map((statuses.data ?? []).map((s) => [s.wish_id as string, s]));

  return (children.data ?? []).map((c) => {
    const journey = (journeys.data ?? []).find((j) => j.child_id === c.id) ?? null;
    return {
      id: c.id as string,
      displayName: c.display_name as string,
      createdAt: c.created_at as string,
      journey: toChildJourney(journey),
      journeyUpdatedAt: (journey?.updated_at as string | undefined) ?? null,
      wishes: (wishes.data ?? [])
        .filter((w) => w.child_id === c.id)
        .map((w) => {
          const status = statusByWish.get(w.id as string);
          const purchaseStatus = PURCHASE_STATUSES.includes(status?.purchase_status as PurchaseStatus)
            ? (status!.purchase_status as PurchaseStatus)
            : "pendiente";
          return {
            ...toChildWish(w),
            purchaseStatus,
            privateNote: (status?.private_note as string | null | undefined) ?? null,
          };
        }),
    };
  });
}
