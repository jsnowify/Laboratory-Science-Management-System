"use client";

import Link from "next/link";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

type Notification = { id: string; title: string; message: string; readAt: string | null; createdAt: string; relatedEntityType?: string; relatedEntityId?: string };

export function NotificationList({ role }: { role: "super_admin" | "admin" | "student_faculty" }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Notification[]; total: number; unreadCount: number }>("/api/v1/notifications/", { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setUnread(result.unreadCount); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Notifications could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, version, retryVersion]);
  async function mark(path: string) {
    if (busy) return;
    setBusy(true);
    try { await apiRequest(path, { method: "POST" }); setVersion((value) => value + 1); window.dispatchEvent(new Event("lsms:notifications-read")); toast("Notifications updated."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Notification could not be updated."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-3xl space-y-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-600">{unread} unread</p><button disabled={busy || unread === 0} onClick={() => mark("/api/v1/notifications/read-all/")} className="text-sm font-medium text-green-800 disabled:opacity-40">Mark all read</button></div>{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    {loading ? <p className="rounded-xl bg-white p-8 text-center">Loading…</p> : rows.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">No notifications yet.</p> : <ul className="space-y-2">{rows.map((row) => <li key={row.id} className={`rounded-xl border p-4 ${row.readAt ? "border-slate-200 bg-white" : "border-green-200 bg-green-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1 basis-48 break-words"><h2 className="font-medium">{row.title}{!row.readAt && <span className="ml-2 text-xs font-semibold text-green-800">Unread</span>}</h2><p className="mt-1 text-sm text-slate-700">{row.message}</p><time dateTime={row.createdAt} className="mt-2 block text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</time>{row.relatedEntityType === "borrow_requests" && row.relatedEntityId && role !== "admin" && <Link href={`/${role === "super_admin" ? "super-admin" : "portal"}/requests/${row.relatedEntityId}/`} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-green-800 underline">View request</Link>}</div>{!row.readAt && <button disabled={busy} onClick={() => mark(`/api/v1/notifications/${row.id}/read/`)} className="whitespace-nowrap text-xs font-medium text-green-800">Mark read</button>}</div></li>)}</ul>}
    <Pagination page={page} total={total} label="notifications" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
