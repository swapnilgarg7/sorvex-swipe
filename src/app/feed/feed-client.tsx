"use client";

import { useEffect } from "react";
import { Hud } from "@/components/feed/hud";
import { SwipeDeck } from "@/components/feed/swipe-deck";
import { useSession } from "@/store/session";
import type { Profile } from "@/types/db";

export function FeedClient({ profile }: { profile: Profile }) {
  const hydrate = useSession((s) => s.hydrate);

  // Seed the store from the server-rendered profile so the HUD is correct on
  // first paint rather than counting up from zero.
  useEffect(() => {
    hydrate({
      balanceCents: profile.balance_cents,
      xp: profile.xp,
      level: profile.level,
      judgedCount: profile.judged_count,
      streakDays: profile.streak_days,
      accuracy:
        profile.gold_seen > 0 ? profile.gold_correct / profile.gold_seen : null,
    });
  }, [profile, hydrate]);

  return (
    <div className="flex h-dvh flex-col">
      <Hud />
      <SwipeDeck />
    </div>
  );
}
