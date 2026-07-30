"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { TaskCard } from "./task-card";
import { ConfidenceSheet } from "./confidence-sheet";
import { ReasonSheet } from "./reason-sheet";
import { useSession } from "@/store/session";
import type { Choice, Confidence } from "@/types/db";

/** Drag past this (px) and the card commits on release. */
const THROW_THRESHOLD = 80;
/** A flick shorter than the threshold still commits if it is fast enough. */
const FLICK_VELOCITY = 380;
/** Distance at which the A/B hint reaches full strength. */
const HINT_FULL = 90;

type Step = "choose" | "confidence" | "reason";

export function SwipeDeck() {
  const queue = useSession((s) => s.queue);
  const loading = useSession((s) => s.loading);
  const error = useSession((s) => s.error);
  const fetchTasks = useSession((s) => s.fetchTasks);
  const commit = useSession((s) => s.commit);
  const shouldAskReason = useSession((s) => s.shouldAskReason);

  const [step, setStep] = useState<Step>("choose");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [exitX, setExitX] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-9, 0, 9]);
  // Hint strength tracks the drag: A on the left, B on the right.
  const aHint = useTransform(x, [-HINT_FULL, -14, 0], [1, 0, 0]);
  const bHint = useTransform(x, [0, 14, HINT_FULL], [0, 0, 1]);
  const [lean, setLean] = useState(0);

  // Clock starts when the card is rendered, stops when a choice is made.
  // Seeded in the effect below, not during render — Date.now() is impure.
  const shownAt = useRef<number>(0);
  const top = queue[0];
  const next = queue[1];

  useEffect(() => {
    void fetchTasks(true);
  }, [fetchTasks]);

  useEffect(() => {
    shownAt.current = Date.now();
    x.set(0);
  }, [top?.id, x]);

  const latency = useRef(0);

  const choose = useCallback(
    (c: Choice) => {
      if (!top || step !== "choose") return;
      latency.current = shownAt.current ? Date.now() - shownAt.current : 0;
      setChoice(c);
      setLean(0);
      setExitX(c === "a" ? -520 : c === "b" ? 520 : 0);

      if (c === "skip") {
        commit({
          taskId: top.id,
          choice: "skip",
          confidence: null,
          reason: null,
          latencyMs: latency.current,
        });
        return;
      }
      setStep("confidence");
    },
    [top, step, commit],
  );

  const finish = useCallback(
    (conf: Confidence, reason: string | null) => {
      if (!top || !choice) return;
      commit({
        taskId: top.id,
        choice,
        confidence: conf,
        reason,
        latencyMs: latency.current,
      });
      setStep("choose");
      setChoice(null);
      setConfidence(null);
    },
    [top, choice, commit],
  );

  const onConfidence = useCallback(
    (conf: Confidence) => {
      setConfidence(conf);
      // Every ~15th judgment, one extra tap for the rationale. Never typing.
      if (shouldAskReason()) {
        setStep("reason");
        return;
      }
      finish(conf, null);
    },
    [shouldAskReason, finish],
  );

  // Keyboard is a first-class path, not an accessibility afterthought — it is
  // how a fast annotator actually clears a queue.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (step === "choose") {
        if (e.key === "ArrowLeft") return choose("a");
        if (e.key === "ArrowRight") return choose("b");
        if (e.key === "ArrowDown" || e.key === "s") return choose("skip");
        return;
      }
      if (step === "confidence") {
        const map: Record<string, Confidence> = {
          "1": "guess",
          "2": "fairly",
          "3": "very",
        };
        const conf = map[e.key];
        if (conf) onConfidence(conf);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, choose, onConfidence]);

  if (!top) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 text-center">
        {error ? (
          <div>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => void fetchTasks(true)}
              className="mt-3 text-sm text-white/50 underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="text-sm text-white/35">Loading tasks…</p>
        ) : (
          <div>
            <p className="text-[15px] font-medium">You&apos;re all caught up.</p>
            <p className="mt-1.5 text-sm text-white/45">
              No unseen tasks in your domains. New batches land continuously.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3">
      <div className="relative min-h-0 flex-1">
        {/* Next card, already rendered underneath. There is never a spinner
            between two tasks. */}
        {next && (
          <div className="absolute inset-0 scale-[0.965] opacity-50">
            <TaskCard task={next} />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={top.id}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ x, rotate, opacity }}
            drag={step === "choose" ? "x" : false}
            dragElastic={0.55}
            dragConstraints={{ left: 0, right: 0 }}
            onDrag={(_, info) =>
              setLean(
                info.offset.x < -30 ? -1 : info.offset.x > 30 ? 1 : 0,
              )
            }
            onDragEnd={(_, info) => {
              const past =
                Math.abs(info.offset.x) > THROW_THRESHOLD ||
                Math.abs(info.velocity.x) > 620;
              if (!past) {
                setLean(0);
                return;
              }
              choose(info.offset.x < 0 ? "a" : "b");
            }}
            exit={{
              x: exitX,
              opacity: 0,
              transition: { duration: 0.18, ease: "easeOut" },
            }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            <TaskCard task={top} lean={lean} />
          </motion.div>
        </AnimatePresence>

        <ConfidenceSheet
          open={step === "confidence"}
          onSelect={onConfidence}
        />
        <ReasonSheet
          open={step === "reason"}
          onSelect={(reason) => confidence && finish(confidence, reason)}
          onSkip={() => confidence && finish(confidence, null)}
        />
      </div>

      {/* Tap targets — the third way in, alongside swipe and keyboard. */}
      <div className="mt-3 flex shrink-0 items-center gap-2">
        <ChoiceButton
          side="left"
          label="A better"
          hint="←"
          disabled={step !== "choose"}
          onClick={() => choose("a")}
        />
        <button
          onClick={() => choose("skip")}
          disabled={step !== "choose"}
          aria-label="Skip this task"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/35 transition-colors hover:text-white/70 disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <ChoiceButton
          side="right"
          label="B better"
          hint="→"
          disabled={step !== "choose"}
          onClick={() => choose("b")}
        />
      </div>
    </div>
  );
}

function ChoiceButton({
  side,
  label,
  hint,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex h-12 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-white/80 transition-all duration-150 hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.98] disabled:opacity-30"
    >
      {side === "left" && <ChevronLeft className="h-4 w-4 text-white/40" />}
      {label}
      {side === "right" && <ChevronRight className="h-4 w-4 text-white/40" />}
      <kbd className="ml-0.5 hidden font-mono text-[10px] text-white/25 sm:inline">
        {hint}
      </kbd>
    </button>
  );
}
