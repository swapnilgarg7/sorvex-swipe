"use client";

import { create } from "zustand";
import type { Choice, Confidence, JudgmentResult, TaskPair } from "@/types/db";

/** Refill the queue when it drops below this. Keeps a card always ready. */
const REFILL_BELOW = 4;
const BATCH = 10;

/** Ask "Why?" roughly this often. Frequent enough to be useful, rare enough
 *  that it never feels like a form. */
const REASON_EVERY = 15;

interface PendingJudgment {
  taskId: string;
  choice: Choice;
  confidence: Confidence | null;
  reason: string | null;
  latencyMs: number;
}

interface SessionState {
  queue: TaskPair[];
  /**
   * Every task id this session has already shown or judged.
   *
   * The server's `next_tasks` excludes judged tasks, but submission is
   * optimistic and fire-and-forget — a refill can reach the server before the
   * judgment row lands, and the task you just swiped comes straight back. This
   * set is the client-side guard. Once a card is gone, it is gone.
   */
  seen: Set<string>;
  loading: boolean;
  error: string | null;

  // Totals — updated optimistically on swipe, reconciled from the server.
  balanceCents: number;
  xp: number;
  level: number;
  judgedCount: number;
  streakDays: number;
  accuracy: number | null;

  // Session-only counters
  sessionJudged: number;
  sessionCents: number;
  lastAward: { cents: number; at: number } | null;

  hydrate: (p: Partial<SessionState>) => void;
  fetchTasks: (force?: boolean) => Promise<void>;
  /** Pop the top card and bank the judgment. Never awaits the network. */
  commit: (j: PendingJudgment) => void;
  shouldAskReason: () => boolean;
}

async function loadTasks(limit: number): Promise<TaskPair[]> {
  const res = await fetch(`/api/tasks?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json()).error ?? "failed to load");
  const json = (await res.json()) as { tasks: TaskPair[] };
  return json.tasks;
}

export const useSession = create<SessionState>((set, get) => ({
  queue: [],
  seen: new Set<string>(),
  loading: false,
  error: null,

  balanceCents: 0,
  xp: 0,
  level: 1,
  judgedCount: 0,
  streakDays: 0,
  accuracy: null,

  sessionJudged: 0,
  sessionCents: 0,
  lastAward: null,

  hydrate: (p) => set(p),

  fetchTasks: async (force = false) => {
    const { loading, queue } = get();
    if (loading) return;
    if (!force && queue.length > REFILL_BELOW) return;

    set({ loading: true, error: null });
    try {
      const tasks = await loadTasks(BATCH);
      set((s) => {
        // Drop anything already queued or already swiped this session.
        const queued = new Set(s.queue.map((t) => t.id));
        const fresh = tasks.filter(
          (t) => !queued.has(t.id) && !s.seen.has(t.id),
        );
        return { queue: [...s.queue, ...fresh] };
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "failed to load" });
    } finally {
      set({ loading: false });
    }
  },

  commit: (j) => {
    const task = get().queue.find((t) => t.id === j.taskId);
    // Optimistic award mirrors the SQL: reward × difficulty, skips pay nothing.
    // The server is authoritative and we reconcile below.
    const optimistic =
      task && j.choice !== "skip" ? task.reward_cents * task.difficulty : 0;

    set((s) => ({
      queue: s.queue.filter((t) => t.id !== j.taskId),
      seen: new Set(s.seen).add(j.taskId),
      balanceCents: s.balanceCents + optimistic,
      judgedCount: s.judgedCount + (j.choice === "skip" ? 0 : 1),
      sessionJudged: s.sessionJudged + (j.choice === "skip" ? 0 : 1),
      sessionCents: s.sessionCents + optimistic,
      lastAward: optimistic > 0 ? { cents: optimistic, at: Date.now() } : s.lastAward,
    }));

    get().fetchTasks();

    // Fire and forget. A failure must never block or rewind the feed — the
    // judgment is idempotent server-side (unique on user+task), so a retry is
    // safe and a permanent failure just means this one judgment is lost.
    void fetch("/api/judgments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: j.taskId,
        choice: j.choice,
        confidence: j.confidence,
        reason: j.reason,
        latencyMs: j.latencyMs,
      }),
      keepalive: true,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const { result } = (await res.json()) as { result: JudgmentResult | null };
        if (!result) return;
        // Server totals win — this corrects any drift from the optimistic path.
        set({
          balanceCents: result.balance_cents,
          xp: result.xp,
          level: result.level,
          judgedCount: result.judged_count,
          streakDays: result.streak_days,
          accuracy: result.accuracy,
        });
      })
      .catch(() => {
        /* offline; totals reconcile on next successful submit */
      });
  },

  shouldAskReason: () => {
    const n = get().sessionJudged;
    // Never on the first couple of cards — let them find the rhythm first.
    return n >= 3 && n % REASON_EVERY === 0;
  },
}));
