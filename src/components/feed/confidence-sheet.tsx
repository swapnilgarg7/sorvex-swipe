"use client";

import { Sheet } from "@/components/ui/sheet";
import type { Confidence } from "@/types/db";

const OPTIONS: { value: Confidence; label: string; key: string }[] = [
  { value: "guess", label: "Guess", key: "1" },
  { value: "fairly", label: "Fairly sure", key: "2" },
  { value: "very", label: "Very sure", key: "3" },
];

/**
 * One tap, immediately after the swipe. A second signal for almost no cost —
 * a low-confidence preference is worth less than a confident one downstream.
 */
export function ConfidenceSheet({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: (c: Confidence) => void;
}) {
  return (
    <Sheet open={open} title="How confident are you?">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onSelect(o.value)}
            className="group relative flex h-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/80 transition-all duration-150 hover:border-white/25 hover:bg-white/[0.09] active:scale-[0.97]"
          >
            {o.label}
            <kbd className="hidden font-mono text-[10px] text-white/25 sm:block">
              {o.key}
            </kbd>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
