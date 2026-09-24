"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
}

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <div role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm"><WifiOff size={20} className="shrink-0" aria-hidden="true" /><p>You are offline. Reconnect before saving changes, then retry any failed request.</p></div>;
}
