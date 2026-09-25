"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useFeedback } from "@/components/ui/feedback-provider";

export function SignOut() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await authClient.signOut();
          if (result.error) {
            toast("We couldn't sign you out. Try again.", "error");
            return;
          }
          router.push("/login/");
          router.refresh();
        } catch {
          toast("Cannot connect to LSMS. Try signing out again.", "error");
        } finally {
          setBusy(false);
        }
      }}
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      <LogOut size={17} aria-hidden="true" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
