"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";

type Record = { id: string; formNumber: string; requestNumber: string; generatedAt: string; releasedAt: string | null };

export function RequisitionList() {
  const { confirm, toast } = useFeedback();
  const [rows, setRows] = useState<Record[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Record[]; total: number }>("/api/v1/iso/", { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Requisitions could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, version, retryVersion]);
  async function mark(row: Record) {
    if (busy) return;
    if (!await confirm({ title: `Mark ${row.formNumber} as released?`, description: "The requisition record will show that it was released. Confirm only after the physical handover is complete.", confirmLabel: "Mark released" })) return;
    setBusy(true);
    try { await apiRequest(`/api/v1/iso/${row.id}/release/`, { method: "POST" }); setVersion((value) => value + 1); toast("Requisition marked released."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Requisition could not be updated."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5"><p className="text-sm text-slate-600">Generated PDFs are development records and do not reproduce the official institutional template.</p>{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Form number</th><th scope="col" className="px-4 py-3">Request</th><th scope="col" className="px-4 py-3">Generated</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No requisitions generated."}</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.formNumber}</td><td className="px-4 py-3">{row.requestNumber}</td><td className="px-4 py-3">{new Date(row.generatedAt).toLocaleString()}</td><td className="px-4 py-3">{row.releasedAt ? "Released" : "Not released"}</td><td className="space-x-3 px-4 py-3"><a href={`/api/v1/iso/${row.id}/pdf/`} target="_blank" rel="noreferrer" className="font-medium text-green-800">Preview</a><a href={`/api/v1/iso/${row.id}/pdf/?download=true`} className="font-medium text-green-800">Download</a>{!row.releasedAt && <button disabled={busy} onClick={() => mark(row)} className="text-slate-700">Mark released</button>}</td></tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="requisitions" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
