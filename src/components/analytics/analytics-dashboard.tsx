"use client";

import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorNotice } from "@/components/ui/error-notice";
import { inputClass } from "@/components/auth/auth-frame";
import { columnLabel, visibleColumns, displayValue } from "@/lib/display";
const AnalyticsChart = dynamic(() => import("./analytics-chart"), { ssr: false, loading: () => <div className="mt-5 h-64 animate-pulse rounded-lg bg-slate-50" aria-label="Loading chart" /> });
import { apiRequest } from "@/lib/api/client";

type Row = Record<string, string | number | null>;
const sections = [
  ["borrowing-trends", "Monthly borrowing trends"], ["equipment-usage", "Equipment usage"],
  ["inventory-utilization", "Inventory utilization"], ["user-frequency", "Borrowing frequency by user"],
  ["college-frequency", "Borrowing frequency by college"], ["course-frequency", "Borrowing frequency by course"],
  ["peak-periods", "Peak borrowing periods"], ["inventory-overview", "Inventory overview"],
] as const;



function AnalyticsSection({ name, title }: { name: string; title: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Row[]; total: number }>(`/api/v1/analytics/${name}/`, { query: { page, limit: 20 }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Data could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [name, page, retryVersion]);
  const chartRows = rows.map((row) => name === "borrowing-trends" ? { label: new Date(String(row.month)).toLocaleDateString(undefined, { month: "short", year: "2-digit" }), value: Number(row.total_requests) } : { label: String(row.equipment_name), value: Number(row.total_borrow_count) });
  const columns = rows[0] ? visibleColumns(rows[0]) : [];
  const chart = name === "borrowing-trends" || name === "equipment-usage";
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{title}</h2>{error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />}
    {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">No data yet.</p> : <>
      {chart && <AnalyticsChart rows={chartRows} title={title} />}
      <div className="ui-table-scroll mt-4" tabIndex={0} role="region" aria-label="Analytics data"><table className="w-full min-w-[480px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{columns.map((key) => <th scope="col" key={key} className="px-3 py-2 font-medium capitalize">{columnLabel(key)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{columns.map((column) => <td key={column} className="px-3 py-2">{displayValue(row[column], column)}</td>)}</tr>)}</tbody></table></div>
      <Pagination page={page} total={total} label="rows" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
    </>}
  </section>;
}

export function AnalyticsDashboard() {
  const [selected, setSelected] = useState<string>(sections[0][0]);
  const title = sections.find(([name]) => name === selected)?.[1] ?? "Analytics";
  return <div className="max-w-6xl space-y-5"><div className="max-w-md"><label htmlFor="analytics-report" className="mb-2 block text-sm font-semibold">Choose an analysis</label><select id="analytics-report" className={inputClass} value={selected} onChange={(event) => setSelected(event.target.value)}>{sections.map(([name, label]) => <option key={name} value={name}>{label}</option>)}</select></div><p className="text-sm text-slate-600">Charts summarize the current page of results. Use the table for exact values.</p><AnalyticsSection key={selected} name={selected} title={title} /></div>;
}
