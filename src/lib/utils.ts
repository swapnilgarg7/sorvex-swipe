import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** XP needed to clear a given level. Cheap curve, gets slower as you climb. */
export function xpForLevel(level: number) {
  return 100 + (level - 1) * 75;
}

export function levelProgress(xp: number, level: number) {
  const needed = xpForLevel(level);
  return Math.min(1, Math.max(0, xp / needed));
}
