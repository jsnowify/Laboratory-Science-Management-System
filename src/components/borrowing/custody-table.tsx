"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { FormField, inputClass } from "@/components/auth/auth-frame";
import { statusLabel } from "@/components/ui/status-badge";
import { useFeedback } from "@/components/ui/feedback-provider";

type Custody = { allocationId: string; requestNumber: string; institutionalId: string; borrowerName: string; assetCode: string; equipmentName: string; releasedAt: string; dueAt: string; releaseCondition: string; isOverdue: boolean };

export function CustodyTable({ canReturn }: { canReturn: boolean }) {
  const { confirm, toast } = useFeedback();
  const returnPanel = useRef<HTMLElement>(null);
  const [rows, setRows] = useState<Custody[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Custody | null>(null);
  const [condition, setCondition] = useState("");
  const [outcome, setOutcome] = useState("normal");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Custody[]; total: number }>("/api/v1/custody/", { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Custody records could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, version, retryVersion]);

  async function recordReturn() {
    if (!selected || !condition || busy || (condition === "damaged" && outcome !== "damaged")) return;
    if (!await confirm({ title: `Process return of ${selected.assetCode}?`, description: `${selected.equipmentName} was borrowed by ${selected.borrowerName}. The return will update custody and the asset's condition.`, confirmLabel: "Process return" })) return;
    setBusy(true); setError("");
    try { await apiRequest("/api/v1/returns/", { method: "POST", body: { allocationId: selected.allocationId, conditionAfter: condition, outcome, remarks } }); setSelected(null); setCondition(""); setRemarks(""); setVersion((value) => value + 1); toast(`Return recorded for ${selected.assetCode}.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Return could not be recorded."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    {error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-4 py-3">Request</th>{canReturn && <th scope="col" className="px-4 py-3">Borrower</th>}<th scope="col" className="px-4 py-3">Equipment</th><th scope="col" className="px-4 py-3">Asset</th><th scope="col" className="px-4 py-3">Released</th><th scope="col" className="px-4 py-3">Due</th><th scope="col" className="px-4 py-3">Condition at release</th>{canReturn && <th scope="col" className="px-4 py-3">Action</th>}</tr></thead><tbody>{loading ? <tr><td colSpan={canReturn ? 8 : 6} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={canReturn ? 8 : 6} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No equipment is currently in custody."}</td></tr> : rows.map((row) => <tr key={row.allocationId} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.requestNumber}</td>{canReturn && <td className="px-4 py-3">{row.borrowerName}<br /><span className="text-slate-500">{row.institutionalId}</span></td>}<td className="px-4 py-3">{row.equipmentName}</td><td className="px-4 py-3">{row.assetCode}</td><td className="px-4 py-3">{new Date(row.releasedAt).toLocaleString()}</td><td className={`px-4 py-3 ${row.isOverdue ? "font-semibold text-red-700" : ""}`}>{new Date(row.dueAt).toLocaleString()}{row.isOverdue && <span className="mt-1 block text-xs font-semibold">Overdue</span>}</td><td className="px-4 py-3 capitalize">{row.releaseCondition}</td>{canReturn && <td className="px-4 py-3"><button className="font-medium text-green-800 hover:underline" onClick={() => { setSelected(row); setCondition(""); setOutcome("normal"); setRemarks(""); requestAnimationFrame(() => { returnPanel.current?.scrollIntoView({ block: "start" }); returnPanel.current?.querySelector<HTMLSelectElement>("select")?.focus(); }); }}>Record return</button></td>}</tr>)}</tbody></table></div>
    {selected && <section ref={returnPanel} className="ui-panel max-w-3xl p-4 sm:p-6" aria-busy={busy}><h2 className="font-semibold">Return {selected.assetCode}</h2><dl className="mt-4 grid gap-3 border-b border-slate-200 pb-4 text-sm sm:grid-cols-2">{[["Equipment", selected.equipmentName], ["Borrower", selected.borrowerName], ["Request", selected.requestNumber], ["Released", new Date(selected.releasedAt).toLocaleString()], ["Due", new Date(selected.dueAt).toLocaleString()], ["Condition at release", statusLabel(selected.releaseCondition)]].map(([label, value]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField id="conditionAfter" label="Condition on return"><select id="conditionAfter" className={inputClass} value={condition} onChange={(event) => { setCondition(event.target.value); if (event.target.value === "damaged") setOutcome("damaged"); }}><option value="">Choose condition</option>{["excellent", "good", "fair", "damaged"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></FormField><FormField id="outcome" label="Return outcome"><select id="outcome" className={inputClass} value={outcome} onChange={(event) => setOutcome(event.target.value)}>{["normal", "damaged", "maintenance_required"].map((item) => <option key={item} value={item} disabled={condition === "damaged" && item !== "damaged"}>{statusLabel(item)}</option>)}</select></FormField><div className="sm:col-span-2"><FormField id="remarks" label={outcome === "normal" ? "Remarks (optional)" : "Remarks (required)"}><textarea id="remarks" required={outcome !== "normal"} rows={3} className={inputClass} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></FormField></div></div><p className="mt-3 text-sm text-slate-600">Damaged or maintenance returns require remarks explaining what needs attention.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || !condition || (outcome !== "normal" && !remarks.trim())} onClick={recordReturn} className="ui-button-primary">{busy ? "Saving…" : "Confirm return"}</button><button disabled={busy} className="ui-button-secondary" onClick={() => setSelected(null)}>Cancel</button></div></section>}
    <Pagination page={page} total={total} label="active custody records" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
