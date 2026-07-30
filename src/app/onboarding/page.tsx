"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { createClient } from "@/lib/supabase/client";
import { DOMAINS } from "@/types/db";

export default function OnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(domain: string) {
    setDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // The auth trigger already created the row; upsert covers the edge case
    // where it did not (e.g. a user created before the trigger existed).
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      handle: handle.trim() || null,
      domains,
      onboarded_at: new Date().toISOString(),
    });

    if (error) {
      // 23505 = unique_violation, which here can only be the handle.
      setError(
        error.code === "23505"
          ? "That handle is already taken — try another."
          : error.message,
      );
      setSaving(false);
      return;
    }

    router.replace("/feed");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl leading-tight font-bold tracking-tight">
        What do you <span className="text-gradient-brand">know</span>?
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-white/55">
        Pick your areas. We&apos;ll route matching tasks to your feed — leave it
        empty to see everything.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <div>
          <label
            htmlFor="handle"
            className="mb-2 block text-xs tracking-wider text-white/30 uppercase"
          >
            Handle
          </label>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="swapnil"
            maxLength={24}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white transition duration-200 placeholder:text-white/25 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-3 text-xs tracking-wider text-white/30 uppercase">
            Expertise
          </p>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <Chip
                key={d}
                selected={domains.includes(d)}
                onClick={() => toggle(d)}
              >
                {d}
              </Chip>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" disabled={saving} className="w-full">
          {saving ? "Setting up…" : "Start judging"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </Button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </main>
  );
}
