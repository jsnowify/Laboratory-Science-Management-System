"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

type Overdue = { allocationId: string; requestNumber: string; borrowerName: string; institutionalId: string; equipmentName: string; assetCode: string; releasedAt: string; dueAt: string; overdueDuration: string };

export function OverdueTable() {
  const [rows, setRows] = useState<Overdue[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Overdue[]; total: number }>("/api/v1/overdue/", { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Overdue records could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retryVersion]);
  return <div className="space-y-5">{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Request</th><th scope="col" className="px-4 py-3">Borrower</th><th scope="col" className="px-4 py-3">Equipment / asset</th><th scope="col" className="px-4 py-3">Released</th><th scope="col" className="px-4 py-3">Due</th><th scope="col" className="px-4 py-3">Overdue</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No equipment is overdue."}</td></tr> : rows.map((row) => <tr key={row.allocationId} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.requestNumber}</td><td className="px-4 py-3">{row.borrowerName}<br /><span className="text-slate-500">{row.institutionalId}</span></td><td className="px-4 py-3">{row.equipmentName}<br /><span className="text-slate-500">{row.assetCode}</span></td><td className="px-4 py-3">{new Date(row.releasedAt).toLocaleString()}</td><td className="px-4 py-3 text-red-700">{new Date(row.dueAt).toLocaleString()}</td><td className="px-4 py-3 text-red-700">{row.overdueDuration}</td></tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="overdue assets" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
