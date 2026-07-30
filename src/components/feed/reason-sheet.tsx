"use client";

import { Sheet } from "@/components/ui/sheet";
import { REASONS } from "@/types/db";

/**
 * Shown roughly 1 in 15 judgments. Taps only — no free text, ever. Rationale
 * at this sampling rate costs the annotator ~1s and gives the dataset a
 * categorical "why" alongside the preference.
 */
export function ReasonSheet({
  open,
  onSelect,
  onSkip,
}: {
  open: boolean;
  onSelect: (reason: string) => void;
  onSkip: () => void;
}) {
  return (
    <Sheet
      open={open}
      title="Why?"
      action={{ label: "Skip", onClick: onSkip }}
    >
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => onSelect(r)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3.5 text-sm font-medium text-white/80 transition-all duration-150 hover:border-white/25 hover:bg-white/[0.09] active:scale-[0.97]"
          >
            {r}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
