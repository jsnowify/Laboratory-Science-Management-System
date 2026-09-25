"use client";

import { AlertCircle } from "lucide-react";

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#f2c9c4] bg-[#fff8f6] p-4 text-sm text-[#842b26] shadow-[0_8px_24px_rgba(132,43,38,.05)]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ffe9e5]">
        <AlertCircle size={18} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 break-words leading-6">{message}</p>
      {onRetry && (
        <button type="button" className="ui-button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
