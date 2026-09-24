"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";
import { StatusBadge, statusLabel } from "@/components/ui/status-badge";

type Request = { id: string; requestNumber: string; firstName: string; lastName: string; purpose: string; requestedBorrowAt: string; requestedDueAt: string; status: string };

const statuses = ["draft", "submitted", "under_review", "approved", "rejected", "ready_for_release", "borrowed", "partially_returned", "returned", "cancelled"];

export function RequestList({ area, initialStatus = "" }: { area: "portal" | "super-admin"; initialStatus?: string }) {
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
    apiRequest<{ data: Request[]; total: number }>("/api/v1/borrow-requests/", { query: { q: search, status, page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Requests could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, status, page, retryVersion]);
  return <div className="space-y-5">
    {area === "portal" && <Link href="/portal/requests/new/" className="ui-button-primary">New borrowing request</Link>}
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setSearch(query); }} className="flex flex-wrap gap-3"><input aria-label="Search requests" className={`${inputClass} max-w-sm`} placeholder="Search number or purpose" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="ui-button-secondary">Search</button><select aria-label="Request status" className={`${inputClass} max-w-52`} value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></form>
    {error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Request</th>{area === "super-admin" && <th scope="col" className="px-4 py-3">Borrower</th>}<th scope="col" className="px-4 py-3">Purpose</th><th scope="col" className="px-4 py-3">Borrow date</th><th scope="col" className="px-4 py-3">Due date</th><th scope="col" className="px-4 py-3">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={area === "super-admin" ? 6 : 5} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={area === "super-admin" ? 6 : 5} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No requests found."}</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><Link href={`/${area}/requests/${row.id}/`} className="font-medium text-green-800 hover:underline">{row.requestNumber}</Link></td>{area === "super-admin" && <td className="px-4 py-3">{row.firstName} {row.lastName}</td>}<td className="max-w-60 truncate px-4 py-3">{row.purpose}</td><td className="px-4 py-3">{new Date(row.requestedBorrowAt).toLocaleString()}</td><td className="px-4 py-3">{new Date(row.requestedDueAt).toLocaleString()}</td><td className="px-4 py-3"><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="requests" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
