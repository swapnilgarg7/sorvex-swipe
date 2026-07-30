"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { TaskCard } from "./task-card";
import { ConfidenceSheet } from "./confidence-sheet";
import { ReasonSheet } from "./reason-sheet";
import { useSession } from "@/store/session";
import type { Choice, Confidence } from "@/types/db";

/**
 * Fraction of the card's width you must drag past for the swipe to count.
 * A committed swipe should feel like a decision, not something you can trip
 * over — a nudge must always spring back.
 */
const THROW_RATIO = 0.38;
const MIN_THRESHOLD = 110;
/** A short drag still commits if it was thrown hard enough to be deliberate. */
const FLICK_VELOCITY = 700;
/** Distance at which the A/B hint reaches full strength. */
const HINT_FULL = 100;
/** How far off-screen a committed card flies. */
const EXIT_X = 700;

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
  /** True from the moment a choice is made until the card has left the screen. */
  const [flying, setFlying] = useState(false);
  const [lean, setLean] = useState(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-9, 0, 9]);
  // Hint strength tracks the drag: A on the left, B on the right.
  const aHint = useTransform(x, [-HINT_FULL, -16, 0], [1, 0, 0]);
  const bHint = useTransform(x, [0, 16, HINT_FULL], [0, 0, 1]);

  const deckRef = useRef<HTMLDivElement>(null);
  // Clock starts when the card is rendered, stops when a choice is made.
  // Seeded in the effect below, not during render — Date.now() is impure.
  const shownAt = useRef<number>(0);
  const latency = useRef(0);

  const top = queue[0];
  const next = queue[1];

  useEffect(() => {
    void fetchTasks(true);
  }, [fetchTasks]);

  useEffect(() => {
    shownAt.current = Date.now();
    x.set(0);
    y.set(0);
  }, [top?.id, x, y]);

  const threshold = useCallback(() => {
    const w = deckRef.current?.offsetWidth ?? 380;
    return Math.max(MIN_THRESHOLD, w * THROW_RATIO);
  }, []);

  /**
   * Commits the choice. The card flies fully off-screen FIRST; only once it is
   * gone does the confidence sheet open. Opening the sheet over a card that is
   * still sitting there reads as "my swipe didn't take".
   */
  const choose = useCallback(
    (c: Choice) => {
      if (!top || step !== "choose" || flying) return;

      latency.current = shownAt.current ? Date.now() - shownAt.current : 0;
      setChoice(c);
      setLean(0);
      setFlying(true);

      const settle = () => {
        if (c === "skip") {
          commit({
            taskId: top.id,
            choice: "skip",
            confidence: null,
            reason: null,
            latencyMs: latency.current,
          });
          setChoice(null);
          setFlying(false);
          return;
        }
        setStep("confidence");
      };

      if (c === "skip") {
        // Skips drop away downward rather than picking a side.
        void animate(y, 900, { duration: 0.28, ease: "easeIn" }).then(settle);
        return;
      }

      void animate(x, c === "a" ? -EXIT_X : EXIT_X, {
        duration: 0.26,
        ease: [0.22, 0.61, 0.36, 1],
      }).then(settle);
    },
    [top, step, flying, commit, x, y],
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
      setFlying(false);
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
        if (flying) return;
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
  }, [step, flying, choose, onConfidence]);

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

  const interactive = step === "choose" && !flying;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3">
      <div ref={deckRef} className="relative min-h-0 flex-1">
        {/* Next card, already rendered underneath. It rises into place as the
            current card flies off, so there is never a gap. */}
        {next && (
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: flying ? 1 : 0.965,
              opacity: flying ? 1 : 0.5,
            }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <TaskCard task={next} />
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={top.id}
            className="absolute inset-0 touch-pan-y"
            style={{ x, y, rotate, cursor: interactive ? "grab" : "default" }}
            drag={interactive ? "x" : false}
            // dragElastic 1 = the card tracks the finger 1:1. No constraints:
            // snap-back is animated by hand below so it cannot fight the
            // fly-off animation.
            dragElastic={1}
            dragMomentum={false}
            whileDrag={{ cursor: "grabbing" }}
            onDrag={(_, info) =>
              setLean(info.offset.x < -16 ? -1 : info.offset.x > 16 ? 1 : 0)
            }
            onDragEnd={(_, info) => {
              const farEnough = Math.abs(info.offset.x) > threshold();
              const fastEnough = Math.abs(info.velocity.x) > FLICK_VELOCITY;

              if (!farEnough && !fastEnough) {
                // Not a decision — spring back and leave the card in play.
                setLean(0);
                void animate(x, 0, {
                  type: "spring",
                  stiffness: 600,
                  damping: 40,
                });
                return;
              }

              // Direction comes from the throw when it was a flick, so a fast
              // cast that barely moved still resolves the way it was aimed.
              const dir = fastEnough ? info.velocity.x : info.offset.x;
              choose(dir < 0 ? "a" : "b");
            }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <TaskCard task={top} lean={lean} />
            <SwipeHint label="A" side="left" opacity={aHint} />
            <SwipeHint label="B" side="right" opacity={bHint} />
          </motion.div>
        </AnimatePresence>

        <ConfidenceSheet open={step === "confidence"} onSelect={onConfidence} />
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
          disabled={!interactive}
          onClick={() => choose("a")}
        />
        <button
          onClick={() => choose("skip")}
          disabled={!interactive}
          aria-label="Skip this task"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/35 transition-colors hover:text-white/70 disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <ChoiceButton
          side="right"
          label="B better"
          hint="→"
          disabled={!interactive}
          onClick={() => choose("b")}
        />
      </div>
    </div>
  );
}

/**
 * Full-card wash + oversized letter showing which response the current drag
 * would pick.
 *
 * Violet for A, blue for B — deliberately not green/red. Both answers are
 * legitimate preferences, and a right/wrong colour scheme would imply the
 * annotator is being marked, which is only true on the hidden gold tasks.
 */
function SwipeHint({
  label,
  side,
  opacity,
}: {
  label: string;
  side: "left" | "right";
  opacity: MotionValue<number>;
}) {
  const isA = side === "left";
  return (
    <motion.div
      aria-hidden
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl"
    >
      {/* Dark scrim first so the card text recedes, then the colour wash. */}
      <div className="absolute inset-0 rounded-3xl bg-[#08080A]/55" />
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: isA
            ? "linear-gradient(to right, rgba(139,92,246,0.6), rgba(139,92,246,0.15))"
            : "linear-gradient(to left, rgba(59,130,246,0.6), rgba(59,130,246,0.15))",
        }}
      />
      <div
        className="absolute inset-0 rounded-3xl border-2"
        style={{
          borderColor: isA ? "rgba(167,139,250,0.9)" : "rgba(96,165,250,0.9)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <span
          className="text-[120px] leading-none font-black tracking-tighter text-white"
          style={{ textShadow: "0 6px 40px rgba(0,0,0,0.5)" }}
        >
          {label}
        </span>
        <span className="mt-1 text-sm font-semibold tracking-[0.2em] text-white/85 uppercase">
          Better
        </span>
      </div>
    </motion.div>
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
