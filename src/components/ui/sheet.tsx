"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  title: string;
  /** Optional right-side escape hatch, e.g. "Skip". */
  action?: { label: string; onClick: () => void };
  className?: string;
  children: React.ReactNode;
}

/**
 * Bottom sheet used for the confidence and reason steps. Deliberately has no
 * backdrop and no dismiss-on-outside-click: it is part of the swipe flow, not
 * a modal interrupting it.
 */
export function Sheet({
  open,
  title,
  action,
  className,
  children,
}: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-white/10 bg-[#0F0F11]/95 px-5 pt-4 pb-6 backdrop-blur-xl",
            className,
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">{title}</p>
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-full px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/70"
              >
                {action.label}
              </button>
            )}
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
