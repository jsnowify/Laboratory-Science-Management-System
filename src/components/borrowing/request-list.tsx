"use client";
import { LoadingBars } from "@/components/ui/loading-skeleton";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";
import { StatusBadge, statusLabel } from "@/components/ui/status-badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { Search } from "lucide-react";

type Request = { id: string; requestNumber: string; firstName: string; lastName: string; purpose: string; requestedBorrowAt: string; requestedDueAt: string; status: string };

const statuses = ["draft", "submitted", "under_review", "approved", "rejected", "ready_for_release", "borrowed", "partially_returned", "returned", "cancelled"];

export function RequestList({ area, initialStatus = "", history = false }: { area: "portal" | "super-admin"; initialStatus?: string; history?: boolean }) {
  const [rows, setRows] = useState<Request[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(statuses.includes(initialStatus) ? initialStatus : "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Request[]; total: number }>("/api/v1/borrow-requests/", { query: { q: search, status, history: history ? "true" : undefined, page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Requests could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, status, history, page, retryVersion]);
  return <div className="space-y-5">
    {area === "portal" && !history && <div className="flex justify-end"><Link href="/portal/requests/new/" className="ui-button-primary">New borrowing request</Link></div>}
    {history && <p className="text-sm leading-6 text-[#526b59]">Completed, rejected, and cancelled requests are kept here for your records.</p>}
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setSearch(query); }} className="workspace-toolbar"><div className="relative min-w-[190px] flex-1 sm:max-w-sm"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#52725b]" aria-hidden="true" /><input aria-label="Search requests" className={`${inputClass} pl-10`} placeholder="Search number or purpose" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="ui-button-secondary">Search</button><CustomSelect id="request-status" label="Request status" className="w-full sm:ml-auto sm:max-w-52" value={status} placeholder="All statuses" options={[{ value: "", label: "All statuses" }, ...(history ? ["rejected", "returned", "cancelled"] : statuses).map((item) => ({ value: item, label: statusLabel(item) }))]} onValueChange={(value) => { setPage(1); setStatus(value); }} /></form>
    {error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Request</th>{area === "super-admin" && <th scope="col" className="px-4 py-3">Borrower</th>}<th scope="col" className="px-4 py-3">Purpose</th><th scope="col" className="px-4 py-3">Borrow date</th><th scope="col" className="px-4 py-3">Due date</th><th scope="col" className="px-4 py-3">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={area === "super-admin" ? 6 : 5} className="p-8 text-center"><LoadingBars /></td></tr> : rows.length === 0 ? <tr><td colSpan={area === "super-admin" ? 6 : 5} className="p-8 text-center text-slate-500">{error ? "Requests could not be loaded. Try again above." : search || status ? "No requests match these filters. Try another search or status." : history ? "No completed requests yet. Returned, rejected, and cancelled requests will appear here." : area === "portal" ? "No borrowing requests yet. Use New borrowing request above to start one." : "No borrowing requests have been submitted yet."}</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><Link href={`/${area}/requests/${row.id}/`} className="font-medium text-green-800 hover:underline">{row.requestNumber}</Link></td>{area === "super-admin" && <td className="px-4 py-3">{row.firstName} {row.lastName}</td>}<td className="max-w-60 truncate px-4 py-3">{row.purpose}</td><td className="px-4 py-3">{new Date(row.requestedBorrowAt).toLocaleString()}</td><td className="px-4 py-3">{new Date(row.requestedDueAt).toLocaleString()}</td><td className="px-4 py-3"><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="requests" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
