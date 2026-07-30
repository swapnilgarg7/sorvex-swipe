@AGENTS.md

# Sorvex — swipe feed

The consumer-facing half of Sorvex Labs. Annotators earn money judging AI
responses in a feed that should feel like TikTok, not like Outlier or Scale.

## The one thing this product optimizes for

**Highest-quality preference data at the lowest cognitive load.**

The differentiator is not breadth of annotation types — it is *speed*. Existing
platforms take 30–90s per task: open task, read instructions, read rubric,
scroll, answer, submit, wait, next. This takes 2–5s: swipe, next, swipe, next.

That number is the product. Any change that adds a step, a spinner, a modal, or
a decision to the loop is a regression even if it adds a feature. `latency_ms`
is recorded on every judgment specifically so this can be measured, not assumed.

## What is built (Phase 1)

A/B preference only.

1. Card shows **prompt + Response A + Response B**. No instructions, no rubric.
2. Choose: drag left (A) / right (B), or `←`/`→`, or tap the two pill buttons.
3. **Confidence** sheet, one tap: Guess / Fairly sure / Very sure (`1`/`2`/`3`).
4. **Every ~15th task**, a **Why?** sheet: six tap chips, skippable. Never typing.
5. Next card is already rendered underneath. There is never a spinner between
   two tasks.

Submissions are optimistic — the store updates on swipe and POSTs in the
background. A failed POST never blocks or rewinds the feed; judgments are
idempotent server-side via `unique (user_id, task_id)`.

## Architecture

| Piece | Where |
| --- | --- |
| Swipe deck, gestures, keyboard | `src/components/feed/swipe-deck.tsx` |
| Card layout | `src/components/feed/task-card.tsx` |
| Confidence / reason sheets | `src/components/feed/{confidence,reason}-sheet.tsx` |
| Optimistic session state | `src/store/session.ts` (zustand) |
| Feed batch endpoint | `src/app/api/tasks/route.ts` |
| Judgment submit | `src/app/api/judgments/route.ts` |
| Auth gate | `src/proxy.ts` |
| Schema + RPCs | `supabase/schema.sql` |
| Seed tasks | `supabase/seed.sql` |

Stack: Next.js 16 (App Router, `src/`), React 19, Tailwind v4 (tokens live in
`@theme inline` in `globals.css` — there is no `tailwind.config.ts`), Supabase
auth + Postgres, framer-motion, zustand, zod. Components are hand-rolled with
`cn()`; there is no shadcn/radix, matching the sibling repos.

## Swipe feel — the details that matter

- `dragElastic={1}` on the card. Anything lower makes it resist the finger and
  the swipe feels broken. Do not reintroduce elasticity to "add polish".
- Commit on `offset > 80px` **or** `velocity > 380` — a fast flick that barely
  moved should still resolve, and its direction comes from the velocity, not
  the resting offset.
- While dragging, a full-card wash plus an oversized A/B letter shows which
  response the current drag would pick. Violet for A, blue for B —
  **deliberately not green/red**: both answers are legitimate preferences, and
  a right/wrong palette would imply the annotator is being marked, which is
  only true on the hidden gold tasks.
- **Once a card is gone, it is gone.** `session.seen` tracks every task id
  swiped this session and filters refills. The server's `next_tasks` already
  excludes judged tasks, but submission is optimistic and fire-and-forget, so
  a refill can outrun the judgment write and hand back the card just swiped.
  The client-side set is what actually prevents this — do not remove it.

## Two invariants — do not break these

1. **`task_pairs.gold_winner` must never reach the browser.** Clients read
   `task_pairs_public`, a view without that column, and column-level grants
   revoke the base column. If you add a query path to tasks, it goes through
   the view or the `next_tasks` RPC — never `select *` on `task_pairs`.

2. **Grading and payout happen in Postgres.** `submit_judgment()` is
   `SECURITY DEFINER`: it reads the gold answer, computes correctness, and
   moves `balance_cents`/`xp`/`level`/`streak_days` atomically. There is
   deliberately no insert policy on `judgments`, so a client cannot write its
   own row and choose what it earned. Never add a service-role key to this app.

## Roadmap — deferred on purpose

Everything below is real and planned. None of it is built. The order matters:
shipping them early would recreate the fragmented Outlier/Scale experience this
product exists to replace.

### Phase 2 — Rubric scoring
Star rows for **Accuracy / Helpfulness / Safety**, not a flat "rate 1–5". Pays
more than preference. Unlocked by reputation, not offered to everyone.

### Phase 3 — Edit / rewrite
"Here's the answer. Fix it." This is where expensive domain experts come in and
where SFT data comes from. Takes **5–20× longer** than a preference judgment, so
it must **never** be the default feed.

### Phase 4 — Ranking
Rank 4 responses. Useful for DPO/RLHF, but mentally exhausting. Reserve for
high-reputation annotators only.

### Reputation ladder
Everyone starts at `preference`. ≥90% agreement with trusted annotators unlocks
`rating` → then `ranking` → then `editing`. Progression should feel earned, and
it routes harder annotations to more capable reviewers. The `profiles.tier`
column and the `annotator_tier` enum already exist for this; `gold_correct` /
`gold_seen` is the signal to gate on.

### Feed composition
**The system chooses, the user never picks.** TikTok does not ask what video
format you want next. Once other types unlock, keep preference at ~95% of the
feed and inject the rest occasionally. Do not add a task-type selector.

### Also deferred
Consensus scoring across annotators; gold-task calibration beyond simple
accuracy; leaderboards, badges, and level rewards; domain filtering beyond the
onboarding picker; payout/withdrawal; customer-facing analytics; an enterprise
API for uploading evaluation jobs.

## Local setup

1. `.env.local` — copy from `.env.example`, fill both Supabase values.
2. Supabase SQL editor → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Supabase → Authentication → URL Configuration → add
   `http://localhost:3000/auth/callback` as a redirect URL.
4. `npm run dev`

## Notes for agents

- `middleware.ts` does not exist here — Next 16 renamed it to **`proxy.ts`**,
  and the exported function is `proxy`, not `middleware`.
- `cookies()` is async. `await` it.
- Row types in `src/types/db.ts` are `type`, not `interface`, on purpose: the
  Supabase client generics require assignability to `Record<string, unknown>`,
  and interfaces have no implicit index signature. Using `interface` silently
  collapses every query result to `never`.
- ESLint runs React 19's compiler rules. No `setState` directly inside an
  effect body, and no impure calls (`Date.now()`, `Math.random()`) during
  render — seed them in an effect or an event handler.
