"use client";

import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Tap target for domain picking and the "Why?" sheet. Never a text input. */
export function Chip({ className, selected, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-150",
        "focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:outline-none",
        "active:scale-[0.97]",
        selected
          ? "border-transparent text-white"
          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white",
        className,
      )}
      {...props}
    >
      {selected && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: "var(--gradient-brand)" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
