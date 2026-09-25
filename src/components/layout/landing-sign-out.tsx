"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useFeedback } from "@/components/ui/feedback-provider";

export function LandingSignOut() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);

  return <button type="button" disabled={busy} className="inline-flex min-h-11 items-center text-sm font-medium text-[#2c382b] hover:underline disabled:opacity-60" onClick={async () => {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      router.refresh();
    } catch {
      toast("We couldn't sign you out. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }}>{busy ? "Signing out…" : "Sign out"}</button>;
}
