"use client";

import { cn } from "@/lib/utils";
import type { TaskPair } from "@/types/db";

const DIFFICULTY_LABEL = ["", "Quick", "Involved", "Hard"];

interface TaskCardProps {
  task: TaskPair;
  /** -1 → leaning A, 1 → leaning B, 0 → neutral. Drives the edge highlight. */
  lean?: number;
}

export function TaskCard({ task, lean = 0 }: TaskCardProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0F0F11]/90 backdrop-blur-xl">
      {/* Meta strip */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="text-xs font-medium tracking-wider text-white/45 uppercase">
          {task.domain}
        </span>
        <span className="text-[11px] text-white/30">
          {DIFFICULTY_LABEL[task.difficulty] ?? "Quick"}
        </span>
      </div>

      {/* Prompt */}
      <div className="shrink-0 px-4 py-3.5">
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white/70">
          {task.prompt}
        </p>
      </div>

      {/* The two responses. No instructions, no rubric — just A and B. */}
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 px-3 pb-3">
        <Response
          label="A"
          text={task.response_a}
          active={lean < 0}
          accent="from-violet-500/60"
        />
        <Response
          label="B"
          text={task.response_b}
          active={lean > 0}
          accent="from-blue-500/60"
        />
      </div>
    </div>
  );
}

function Response({
  label,
  text,
  active,
  accent,
}: {
  label: string;
  text: string;
  active: boolean;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 rounded-2xl border bg-white/[0.03] transition-colors duration-150",
        active ? "border-white/25 bg-white/[0.07]" : "border-white/[0.07]",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent transition-opacity duration-150",
          accent,
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="card-scroll h-full px-3.5 py-3">
        <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-white/30">
          {label}
        </span>
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white/85">
          {text}
        </p>
      </div>
    </div>
  );
}
