-- ============================================================================
-- Sorvex swipe feed — schema
-- Run this in the Supabase SQL editor, then run seed.sql.
--
-- Two invariants this file exists to enforce:
--   1. `task_pairs.gold_winner` (the answer key) must NEVER reach the browser.
--      Clients read `task_pairs_public`, a view without that column, and are
--      revoked from selecting the base table at all.
--   2. Grading and payout happen in Postgres, inside submit_judgment(), so the
--      client can neither see the answer nor decide what it earned.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type judgment_choice as enum ('a', 'b', 'skip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type judgment_confidence as enum ('guess', 'fairly', 'very');
exception when duplicate_object then null; end $$;

-- Reputation ladder. Everyone starts at 'preference'; the higher tiers are
-- Phases 2-4 and are not yet reachable in the app. See CLAUDE.md.
do $$ begin
  create type annotator_tier as enum ('preference', 'rating', 'ranking', 'editing');
exception when duplicate_object then null; end $$;

-- ─── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  handle          text unique,
  domains         text[] not null default '{}',
  tier            annotator_tier not null default 'preference',
  xp              integer not null default 0,
  level           integer not null default 1,
  balance_cents   integer not null default 0,
  judged_count    integer not null default 0,
  gold_seen       integer not null default 0,
  gold_correct    integer not null default 0,
  streak_days     integer not null default 0,
  last_active_on  date,
  onboarded_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── task_pairs ─────────────────────────────────────────────────────────────
create table if not exists public.task_pairs (
  id           uuid primary key default gen_random_uuid(),
  domain       text not null,
  prompt       text not null,
  response_a   text not null,
  response_b   text not null,
  -- NULL = a genuine preference task with no known answer.
  -- 'a' | 'b' = a gold task; used to score the annotator, never shown.
  gold_winner  char(1) check (gold_winner in ('a', 'b')),
  difficulty   integer not null default 1 check (difficulty between 1 and 3),
  reward_cents integer not null default 3,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists task_pairs_domain_idx on public.task_pairs (domain) where active;

-- Everything the client is allowed to see. Note the absent gold_winner.
create or replace view public.task_pairs_public
with (security_invoker = true) as
  select id, domain, prompt, response_a, response_b, difficulty, reward_cents
  from public.task_pairs
  where active;

-- ─── judgments ──────────────────────────────────────────────────────────────
create table if not exists public.judgments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  task_id      uuid not null references public.task_pairs (id) on delete cascade,
  choice       judgment_choice not null,
  confidence   judgment_confidence,
  reason       text,
  -- Time from card render to decision. The whole product thesis is that this
  -- number stays in the 2-5s range, so it is a first-class column.
  latency_ms   integer,
  is_gold      boolean not null default false,
  was_correct  boolean,
  reward_cents integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, task_id)
);

create index if not exists judgments_user_idx on public.judgments (user_id, created_at desc);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.task_pairs enable row level security;
alter table public.judgments  enable row level security;

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile insertable" on public.profiles;
create policy "own profile insertable" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "own profile updatable" on public.profiles;
create policy "own profile updatable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Deliberately NO select policy on task_pairs: with RLS on and no policy, the
-- base table is unreadable to authenticated clients. The view is the only door,
-- and because it is security_invoker we grant it explicitly below.
drop policy if exists "active tasks readable" on public.task_pairs;
create policy "active tasks readable" on public.task_pairs
  for select using (active);

-- ...but revoke the answer-key column so even that policy can't leak it.
revoke all on public.task_pairs from anon, authenticated;
grant select (id, domain, prompt, response_a, response_b, difficulty, reward_cents)
  on public.task_pairs to authenticated;
grant select on public.task_pairs_public to authenticated;

drop policy if exists "own judgments readable" on public.judgments;
create policy "own judgments readable" on public.judgments
  for select using (auth.uid() = user_id);

-- No insert policy: judgments are only ever written through submit_judgment().
-- A client cannot insert a row and pick its own reward.

-- ─── submit_judgment ────────────────────────────────────────────────────────
-- Grades against the hidden gold answer, records the judgment, and atomically
-- moves balance / xp / level / streak. Returns the new totals so the client can
-- reconcile its optimistic state in the same round trip.
create or replace function public.submit_judgment(
  p_task_id    uuid,
  p_choice     judgment_choice,
  p_confidence judgment_confidence default null,
  p_reason     text default null,
  p_latency_ms integer default null
)
returns table (
  balance_cents integer,
  xp            integer,
  level         integer,
  judged_count  integer,
  streak_days   integer,
  accuracy      numeric,
  awarded_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_task      public.task_pairs%rowtype;
  v_is_gold   boolean;
  v_correct   boolean;
  v_award     integer;
  v_xp_gain   integer;
  v_today     date := (now() at time zone 'utc')::date;
  v_last      date;
  v_streak    integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_task from public.task_pairs where id = p_task_id and active;
  if not found then
    raise exception 'unknown task' using errcode = 'P0002';
  end if;

  -- Clamp the client-reported latency. It is user-supplied and only ever used
  -- as an analytics signal, so a bogus value must not poison the column.
  if p_latency_ms is not null then
    p_latency_ms := least(greatest(p_latency_ms, 0), 600000);
  end if;

  v_is_gold := v_task.gold_winner is not null;
  v_correct := case
    when p_choice = 'skip' then null
    when v_is_gold then (p_choice::text = v_task.gold_winner)
    else null
  end;

  -- Skips are free and pay nothing; a wrong gold answer pays nothing either.
  v_award := case
    when p_choice = 'skip' then 0
    when v_is_gold and v_correct is false then 0
    else v_task.reward_cents * v_task.difficulty
  end;
  v_xp_gain := case when p_choice = 'skip' then 0 else 10 * v_task.difficulty end;

  insert into public.judgments (
    user_id, task_id, choice, confidence, reason,
    latency_ms, is_gold, was_correct, reward_cents
  )
  values (
    v_user, p_task_id, p_choice, p_confidence, nullif(left(p_reason, 200), ''),
    p_latency_ms, v_is_gold, v_correct, v_award
  )
  on conflict (user_id, task_id) do nothing;

  if not found then
    -- Already judged this task; don't pay twice. Return current totals as-is.
    return query
      select p.balance_cents, p.xp, p.level, p.judged_count, p.streak_days,
             case when p.gold_seen = 0 then null
                  else round(p.gold_correct::numeric / p.gold_seen, 4) end,
             0
      from public.profiles p where p.id = v_user;
    return;
  end if;

  select p.last_active_on, p.streak_days into v_last, v_streak
  from public.profiles p where p.id = v_user;

  v_streak := case
    when v_last is null              then 1
    when v_last = v_today            then greatest(v_streak, 1)
    when v_last = v_today - 1        then v_streak + 1
    else 1
  end;

  update public.profiles p set
    balance_cents  = p.balance_cents + v_award,
    xp             = p.xp + v_xp_gain,
    judged_count   = p.judged_count + 1,
    gold_seen      = p.gold_seen + (case when v_is_gold and p_choice <> 'skip' then 1 else 0 end),
    gold_correct   = p.gold_correct + (case when v_correct then 1 else 0 end),
    streak_days    = v_streak,
    last_active_on = v_today
  where p.id = v_user;

  -- Level up while the running XP total clears the current level's bar.
  loop
    update public.profiles p set
      level = p.level + 1,
      xp    = p.xp - (100 + (p.level - 1) * 75)
    where p.id = v_user and p.xp >= (100 + (p.level - 1) * 75);
    exit when not found;
  end loop;

  return query
    select p.balance_cents, p.xp, p.level, p.judged_count, p.streak_days,
           case when p.gold_seen = 0 then null
                else round(p.gold_correct::numeric / p.gold_seen, 4) end,
           v_award
    from public.profiles p where p.id = v_user;
end;
$$;

revoke all on function public.submit_judgment from public, anon;
grant execute on function public.submit_judgment to authenticated;

-- ─── next_tasks ─────────────────────────────────────────────────────────────
-- The feed query: unseen, active, matching the annotator's domains (all
-- domains if they picked none). Randomised so two sessions don't line up.
create or replace function public.next_tasks(p_limit integer default 10)
returns setof public.task_pairs_public
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.task_pairs_public t
  where not exists (
    select 1 from public.judgments j
    where j.user_id = auth.uid() and j.task_id = t.id
  )
  and (
    coalesce(array_length((select p.domains from public.profiles p where p.id = auth.uid()), 1), 0) = 0
    or t.domain = any ((select p.domains from public.profiles p where p.id = auth.uid()))
  )
  order by random()
  limit least(greatest(p_limit, 1), 30);
$$;

revoke all on function public.next_tasks from public, anon;
grant execute on function public.next_tasks to authenticated;

-- ─── New user → profile row ─────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
