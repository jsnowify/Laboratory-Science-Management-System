"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

type Record = { returnRecordId: string; requestNumber: string; borrowerName: string; assetCode: string; equipmentName: string; conditionBefore: string; conditionAfter: string; outcome: string; releasedAt: string; dueAt: string; returnedAt: string; wasReturnedLate: boolean; remarks: string | null };

export function AccountabilityTable({ institutional }: { institutional: boolean }) {
  const [rows, setRows] = useState<Record[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Record[]; total: number }>("/api/v1/accountability/", { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Accountability records could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retryVersion]);
  return <div className="space-y-5">{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Request</th>{institutional && <th scope="col" className="px-4 py-3">Borrower</th>}<th scope="col" className="px-4 py-3">Equipment / asset</th><th scope="col" className="px-4 py-3">Release condition</th><th scope="col" className="px-4 py-3">Return condition</th><th scope="col" className="px-4 py-3">Outcome</th><th scope="col" className="px-4 py-3">Returned</th><th scope="col" className="px-4 py-3">Remarks</th></tr></thead><tbody>{loading ? <tr><td colSpan={institutional ? 8 : 7} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={institutional ? 8 : 7} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No returns have been recorded."}</td></tr> : rows.map((row) => <tr key={row.returnRecordId} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.requestNumber}</td>{institutional && <td className="px-4 py-3">{row.borrowerName}</td>}<td className="px-4 py-3">{row.equipmentName}<br /><span className="text-slate-500">{row.assetCode}</span></td><td className="px-4 py-3 capitalize">{row.conditionBefore}</td><td className="px-4 py-3 capitalize">{row.conditionAfter}</td><td className="px-4 py-3 capitalize"><StatusBadge status={row.outcome} /></td><td className="px-4 py-3">{new Date(row.returnedAt).toLocaleString()}{row.wasReturnedLate && <span className="ml-2 text-red-700">Late</span>}</td><td className="px-4 py-3">{row.remarks ?? "—"}</td></tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="records" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
