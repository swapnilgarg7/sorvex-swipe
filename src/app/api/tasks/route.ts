import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Next batch for the feed. Delegates to the `next_tasks` RPC, which reads from
 * `task_pairs_public` — the view without `gold_winner`. The answer key is never
 * in this response body by construction, not by filtering here.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 30) : 10;

  const { data, error } = await supabase.rpc("next_tasks", { p_limit: limit });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}
