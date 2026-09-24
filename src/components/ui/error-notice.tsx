"use client";

import { AlertCircle } from "lucide-react";

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
    <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <p className="min-w-0 flex-1 break-words leading-6">{message}</p>
    {onRetry && <button type="button" className="ui-button-secondary" onClick={onRetry}>Try again</button>}
  </div>;
}
