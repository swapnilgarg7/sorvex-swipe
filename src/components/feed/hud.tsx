"use client";

import { Flame } from "lucide-react";
import { useSession } from "@/store/session";
import { formatCents, levelProgress } from "@/lib/utils";

export function Hud() {
  const balanceCents = useSession((s) => s.balanceCents);
  const level = useSession((s) => s.level);
  const xp = useSession((s) => s.xp);
  const streakDays = useSession((s) => s.streakDays);
  const sessionJudged = useSession((s) => s.sessionJudged);
  const lastAward = useSession((s) => s.lastAward);

  return (
    <header className="shrink-0 px-4 pt-4 pb-3">
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight tabular-nums">
              {formatCents(balanceCents)}
            </span>
            <RewardTick award={lastAward} />
          </div>
          <p className="text-[11px] text-white/30">
            {sessionJudged} this session
          </p>
        </div>

        <div className="flex items-center gap-3">
          {streakDays > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1">
              <Flame className="h-3 w-3 text-orange-400" />
              <span className="text-xs font-medium text-orange-200 tabular-nums">
                {streakDays}
              </span>
            </div>
          )}
          <div className="text-right">
            <p className="text-[11px] tracking-wider text-white/30 uppercase">
              Level
            </p>
            <p className="text-sm font-semibold tabular-nums">{level}</p>
          </div>
        </div>
      </div>

      {/* XP toward the next level */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${levelProgress(xp, level) * 100}%`,
            background: "var(--gradient-brand)",
          }}
        />
      </div>
    </header>
  );
}

/**
 * Floats "+4¢" up off the balance when a judgment lands. The `key` restarts the
 * animation on each new award, and the keyframes end at opacity 0 — so no
 * state or timer is needed to hide it again.
 */
function RewardTick({ award }: { award: { cents: number; at: number } | null }) {
  if (!award) return null;

  return (
    <span
      key={award.at}
      className="animate-float-up absolute -top-1 left-full ml-1 text-xs font-semibold text-emerald-400"
    >
      +{award.cents}¢
    </span>
  );
}
