"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Cookie, LockKeyhole, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "lsms-cookie-notice-v1";
const subscribe = () => () => {};

export function CookieNotice() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [open, setOpen] = useState(false);
  const browserReady = useSyncExternalStore(subscribe, () => true, () => false);
  let visible = browserReady && !acknowledged;
  if (visible) {
    try { visible = localStorage.getItem(STORAGE_KEY) !== "seen"; }
    catch { /* Private browsing may block storage. */ }
  }

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, "seen"); } catch { /* Private browsing may block storage. */ }
    setAcknowledged(true);
    setOpen(false);
  }

  return <>
    {visible && <aside aria-label="Cookie notice" className="fixed bottom-4 left-4 right-4 z-40 max-w-sm rounded-[15px] border border-[#d8e5d5] bg-[#fffef9] p-4 text-[#263d2c] shadow-[0_18px_55px_rgba(20,45,27,.18)] sm:right-auto sm:p-5">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#eaf2e6] text-[#2b653f]"><Cookie size={20} aria-hidden="true" /></span><div><h2 className="font-[Georgia,serif] text-lg">Your session and cookies</h2><p className="mt-1 text-sm leading-5 text-[#536454]">LSMS uses an essential cookie to keep you signed in and protect your account. We do not use advertising cookies.</p></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={acknowledge} className="ui-button-primary min-h-10 px-4 text-sm">Got it</button><button type="button" onClick={() => setOpen(true)} className="ui-button-secondary min-h-10 px-4 text-sm">Cookie details</button></div>
    </aside>}
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[70] bg-[#152b1c]/55" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90dvh] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[15px] border border-[#d8e5d5] bg-[#fffef9] p-6 text-[#263d2c] shadow-2xl outline-none">
      <div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-[10px] bg-[#eaf2e6] text-[#2b653f]"><LockKeyhole size={21} aria-hidden="true" /></span><Dialog.Close className="grid size-10 place-items-center rounded-[10px] hover:bg-[#eaf2e6]" aria-label="Close cookie details"><X size={18} /></Dialog.Close></div>
      <Dialog.Title className="mt-4 font-[Georgia,serif] text-2xl">Cookie details</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-[#536454]">The sign-in cookie is needed to recognize your session. It is sent only to LSMS, is unavailable to page scripts, and expires when your session ends. You can sign out to end your session.</Dialog.Description>
      <div className="mt-5 rounded-[10px] border border-[#d8e5d5] bg-[#f3f8f0] p-4"><p className="font-semibold">Essential sign-in cookie <span className="float-right text-sm text-[#396744]">Always on</span></p><p className="mt-1 text-sm text-[#536454]">Required for account access. This setting cannot be turned off while signed in.</p></div>
      <button type="button" onClick={acknowledge} className="ui-button-primary mt-6 w-full">Got it</button>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
