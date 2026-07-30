import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./feed-client";
import type { Profile } from "@/types/db";

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return <FeedClient profile={profile} />;
}
