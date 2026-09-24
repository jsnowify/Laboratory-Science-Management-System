"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { columnLabel, visibleColumns, displayValue } from "@/lib/display";
import { inputClass } from "@/components/auth/auth-frame";

type ReportKey = "inventory" | "borrowing-history" | "equipment-usage" | "utilization" | "borrowing-frequency" | "custody" | "overdue" | "accountability";
type Row = Record<string, string | number | boolean | null>;

export function ReportBrowser({ reports }: { reports: readonly ReportKey[] }) {
  const [selected, setSelected] = useState<ReportKey>(reports[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Row[]; total: number }>(`/api/v1/reports/${selected}/`, { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Report could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, page, retryVersion]);
  const columns = rows[0] ? visibleColumns(rows[0]) : [];
  return <div className="space-y-5"><div className="flex flex-wrap items-center gap-3 print:hidden"><label htmlFor="report" className="text-sm font-medium">Report</label><select id="report" className={`${inputClass} max-w-64 capitalize`} value={selected} onChange={(event) => { setLoading(true); setPage(1); setSelected(event.target.value as ReportKey); }}>{reports.map((key) => <option key={key} value={key}>{key.replaceAll("-", " ")}</option>)}</select><a href={`/api/v1/reports/${selected}/csv/`} className="ui-button-secondary">Export CSV</a><button onClick={() => window.print()} className="ui-button-secondary">Print</button></div>
    <p className="text-xs text-slate-500 print:hidden">Print includes the current page. CSV export includes up to 10,000 rows, including record identifiers.</p>
    {error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{rows[0] && columns.map((key) => <th scope="col" key={key} className="px-3 py-2 font-medium capitalize">{columnLabel(key)}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={Math.max(1, columns.length)} className="p-8 text-center">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={Math.max(1, columns.length)} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No report data available."}</td></tr> : rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{columns.map((column) => <td key={column} className="px-3 py-2">{displayValue(row[column], column)}</td>)}</tr>)}</tbody></table></div>
    <Pagination page={page} total={total} label="records" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
