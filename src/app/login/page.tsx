"use client";

import { useState } from "react";
import { ArrowRight, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
          <Zap className="h-3 w-3 text-purple-400" />
          Two seconds a task
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
          <p className="mb-1 font-medium text-amber-200">Supabase not configured</p>
          <p className="leading-relaxed text-amber-200/60">
            Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
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
          <Button
            type="submit"
            size="lg"
            disabled={status === "sending"}
            className="w-full"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
            {status !== "sending" && <ArrowRight className="h-4 w-4" />}
          </Button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}

      <p className="mt-8 text-center text-xs text-white/30">
        Sorvex Labs · human feedback infrastructure
      </p>
    </main>
  );
}
