import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REASONS } from "@/types/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  taskId: z.uuid(),
  choice: z.enum(["a", "b", "skip"]),
  confidence: z.enum(["guess", "fairly", "very"]).nullish(),
  reason: z.enum(REASONS).nullish(),
  // Clamped again in SQL; this is the first line of defence.
  latencyMs: z.number().int().min(0).max(600_000).nullish(),
});

/**
 * Records one judgment. All grading and payout happens inside the
 * `submit_judgment` RPC so the client never sees the gold answer and cannot
 * choose what it earned.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { taskId, choice, confidence, reason, latencyMs } = parsed.data;

  const { data, error } = await supabase.rpc("submit_judgment", {
    p_task_id: taskId,
    p_choice: choice,
    p_confidence: confidence ?? null,
    p_reason: reason ?? null,
    p_latency_ms: latencyMs ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The RPC returns a single-row table.
  return NextResponse.json({ result: data?.[0] ?? null });
}
