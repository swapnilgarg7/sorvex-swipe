export type Choice = "a" | "b" | "skip";
export type Confidence = "guess" | "fairly" | "very";
export type AnnotatorTier = "preference" | "rating" | "ranking" | "editing";

// These are `type` rather than `interface` on purpose: the Supabase client
// generics require Row types assignable to Record<string, unknown>, and
// interfaces have no implicit index signature. Using `interface` here silently
// collapses every query result to `never`.

/** What the client is allowed to see — note there is no gold_winner here. */
export type TaskPair = {
  id: string;
  domain: string;
  prompt: string;
  response_a: string;
  response_b: string;
  difficulty: number;
  reward_cents: number;
};

export type Profile = {
  id: string;
  handle: string | null;
  domains: string[];
  tier: AnnotatorTier;
  xp: number;
  level: number;
  balance_cents: number;
  judged_count: number;
  gold_seen: number;
  gold_correct: number;
  streak_days: number;
  last_active_on: string | null;
  onboarded_at: string | null;
};

/** Totals returned by submit_judgment so the client can reconcile. */
export type JudgmentResult = {
  balance_cents: number;
  xp: number;
  level: number;
  judged_count: number;
  streak_days: number;
  accuracy: number | null;
  awarded_cents: number;
};

export const DOMAINS = [
  "Coding",
  "Math",
  "Medicine",
  "Law",
  "Creative Writing",
] as const;

export const REASONS = [
  "More accurate",
  "Better reasoning",
  "Better writing",
  "Safer",
  "More complete",
  "Other",
] as const;

/**
 * Minimal hand-written shape for the typed Supabase client. Only covers what
 * this app touches; regenerate with `supabase gen types` if the schema grows.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: {
      task_pairs_public: { Row: TaskPair; Relationships: [] };
    };
    Functions: {
      next_tasks: { Args: { p_limit: number }; Returns: TaskPair[] };
      submit_judgment: {
        Args: {
          p_task_id: string;
          p_choice: Choice;
          p_confidence: Confidence | null;
          p_reason: string | null;
          p_latency_ms: number | null;
        };
        Returns: JudgmentResult[];
      };
    };
    Enums: {
      judgment_choice: Choice;
      judgment_confidence: Confidence;
      annotator_tier: AnnotatorTier;
    };
    CompositeTypes: Record<never, never>;
  };
}
