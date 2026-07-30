# Sorvex — swipe feed

Judge AI. Get paid.

An annotation platform that feels like scrolling TikTok. Instead of consuming
content, you evaluate AI responses — and get paid for every high-quality
judgment. Two seconds a task, not ninety.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in both Supabase values
```

Get the two keys from **Supabase dashboard → your project → Project Settings →
API Keys**: the *Project URL* and the *Publishable key* (older projects call it
the *anon / public* key — either works).

Then, in the Supabase **SQL Editor**, run in order:

1. `supabase/schema.sql` — tables, RLS, and the grading function
2. `supabase/seed.sql` — ~50 prompt/response pairs across five domains

Finally, under **Authentication → URL Configuration**, add
`http://localhost:3000/auth/callback` to the redirect allow-list.

```bash
npm run dev
```

## How it works

1. Sign in with a magic link, pick your domains.
2. A card shows a prompt and two model responses. Nothing else.
3. Swipe left if A is better, right if B is better — or press `←` / `→`.
4. One tap for confidence (`1` / `2` / `3`).
5. Roughly every 15th task asks *why*, as six tap chips. Never typing.
6. The next card is already on screen. Repeat.

Judgments submit optimistically in the background, so the feed never waits on
the network. Some tasks are **gold** — they have a known better answer, and your
agreement with it quietly builds an accuracy score.

## Scope

This is Phase 1: **A/B preference only**, deliberately. Rubric scoring,
rewriting, and ranking are planned and gated behind reputation — see
[CLAUDE.md](./CLAUDE.md) for the full roadmap and the reasoning.

## Stack

Next.js 16 · React 19 · Tailwind v4 · Supabase (auth + Postgres) ·
framer-motion · zustand · zod

## Security

Two things are enforced in the database, not the client:

- The gold answer key (`task_pairs.gold_winner`) is never sent to the browser —
  clients read a view that does not contain the column.
- Grading and payout run inside a `SECURITY DEFINER` function, and there is no
  insert policy on `judgments`, so a client cannot write its own row or choose
  what it earned.

No service-role key is used anywhere in this app.
