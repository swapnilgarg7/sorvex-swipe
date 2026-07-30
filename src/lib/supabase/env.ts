/**
 * Supabase connection details.
 *
 * Accepts either the newer PUBLISHABLE_KEY name or the older ANON_KEY name so
 * whichever pair of keys you paste into .env.local works without edits.
 */

// These must be referenced as full literals, not computed — Next inlines
// NEXT_PUBLIC_* vars into the client bundle by exact textual match.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** False until the env vars are filled in; lets the UI explain itself. */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
