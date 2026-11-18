import type { NextRequest } from "next/server";
import { updateParentSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return updateParentSession(request);
}

export const config = {
  matcher: ["/padres/:path*"],
};
