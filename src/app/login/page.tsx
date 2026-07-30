"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  // ─── Magic link — disabled ────────────────────────────────────────────────
  // Supabase's built-in email service caps at ~2 messages/hour, which makes
  // this unusable during development ("email rate limit exceeded"). Restore it
  // once custom SMTP is configured under Project Settings → Authentication →
  // SMTP; `/auth/callback` already handles the code exchange.
  //
  // async function sendMagicLink() {
  //   const supabase = createClient();
  //   const { error } = await supabase.auth.signInWithOtp({
  //     email,
  //     options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  //   });
  //   if (error) throw error;
  //   setStatus("sent");
  // }

  async function signInWithPassword() {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // No account yet — create one. With "Confirm email" off this returns a
    // session immediately and never sends mail.
    if (error?.code === "invalid_credentials") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
    } else if (error) {
      throw error;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Email confirmation is still switched on, so there is no session yet.
      setStatus("sent");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("busy");
    try {
      await signInWithPassword();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
          <Zap className="h-3 w-3 text-purple-400" />
          Under a minute a task
        </div>
        <h1 className="text-4xl leading-[1.1] font-bold tracking-tight">
          Judge AI.
          <br />
          <span className="text-gradient-brand">Get paid.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/55">
          Pick the better response. Swipe, next, swipe. Every judgment trains
          frontier models — and pays out instantly.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200/80">
          <p className="mb-1 font-medium text-amber-200">
            Supabase not configured
          </p>
          <p className="leading-relaxed text-amber-200/60">
            Add{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            </code>{" "}
            to <code className="font-mono text-xs">.env.local</code>, then run{" "}
            <code className="font-mono text-xs">supabase/schema.sql</code> and{" "}
            <code className="font-mono text-xs">seed.sql</code>.
          </p>
        </div>
      ) : status === "sent" ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-sm text-white/50">
            We sent a sign-in link to {email}.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white transition duration-200 placeholder:text-white/25 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
          />

          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white transition duration-200 placeholder:text-white/25 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
          />

          <Button
            type="submit"
            size="lg"
            disabled={status === "busy"}
            className="w-full"
          >
            {status === "busy" ? "Working…" : "Continue"}
            {status !== "busy" && <ArrowRight className="h-4 w-4" />}
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <p className="pt-1 text-center text-xs text-white/30">
            New here? Entering an email and password creates your account.
          </p>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-white/30">
        Sorvex Labs · human feedback infrastructure
      </p>
    </main>
  );
}
