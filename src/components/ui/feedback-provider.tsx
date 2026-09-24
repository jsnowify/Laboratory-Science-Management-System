"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ConnectionStatus } from "./connection-status";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "warning" | "info";
type Confirmation = { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary" };
type Feedback = { confirm: (options: Confirmation) => Promise<boolean>; toast: (message: string, tone?: Tone) => void };
type Toast = { id: number; message: string; tone: Tone };

const Context = createContext<Feedback | null>(null);
const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };
const toneStyles = {
  success: "border-green-200 text-green-900",
  error: "border-red-200 text-red-900",
  warning: "border-amber-200 text-amber-900",
  info: "border-slate-200 text-slate-900",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Confirmation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const nextId = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const cancelButton = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setDialog(null);
  }, []);
  const confirm = useCallback((options: Confirmation) => new Promise<boolean>((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(options);
  }), []);
  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = ++nextId.current;
    setToasts((items) => [...items, { id, message, tone }]);
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((item) => setTimeout(() => setToasts((items) => items.filter((entry) => entry.id !== item.id)), 5000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const feedback = useMemo(() => ({ confirm, toast }), [confirm, toast]);
  return <Context.Provider value={feedback}>
    {children}
    <ConnectionStatus />
    <Dialog.Root open={Boolean(dialog)} onOpenChange={(open) => { if (!open) close(false); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45" />
        <Dialog.Content onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); previousFocus.current?.focus(); }} className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90dvh] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-950">{dialog?.title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">{dialog?.description}</Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={cancelButton} type="button" className="ui-button-secondary" onClick={() => close(false)}>Keep working</button>
            <button type="button" className={dialog?.tone === "danger" ? "ui-button-danger" : "ui-button-primary"} onClick={() => close(true)}>{dialog?.confirmLabel}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-sm flex-col gap-2 sm:left-auto sm:right-5 sm:mx-0" aria-live="polite">
      {toasts.map((item) => {
        const Icon = icons[item.tone];
        return <div key={item.id} role={item.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 text-sm shadow-lg ${toneStyles[item.tone]}`}>
          <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words">{item.message}</span>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded" aria-label="Dismiss message" onClick={() => setToasts((items) => items.filter((entry) => entry.id !== item.id))}><X size={16} /></button>
        </div>;
      })}
    </div>
  </Context.Provider>;
}

export function useFeedback() {
  const feedback = useContext(Context);
  if (!feedback) throw new Error("FeedbackProvider is missing");
  return feedback;
}
