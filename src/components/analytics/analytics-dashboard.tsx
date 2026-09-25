"use client";

import { Pagination } from "@/components/ui/pagination";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorNotice } from "@/components/ui/error-notice";
import { CustomSelect } from "@/components/ui/custom-select";
import { CardLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { columnLabel, visibleColumns, displayValue } from "@/lib/display";
import type { ChartRow, ChartSeries } from "./analytics-chart";
const AnalyticsChart = dynamic(() => import("./analytics-chart"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton-bar mt-5 h-64 rounded-xl"
      role="status"
      aria-label="Loading chart"
    />
  ),
});
import { apiRequest } from "@/lib/api/client";

type Row = Record<string, string | number | null>;
const sections = [
  ["borrowing-trends", "Monthly borrowing trends"],
  ["equipment-usage", "Equipment usage"],
  ["inventory-utilization", "Inventory utilization"],
  ["user-frequency", "Borrowing frequency by user"],
  ["college-frequency", "Borrowing frequency by college"],
  ["course-frequency", "Borrowing frequency by course"],
  ["peak-periods", "Peak borrowing periods"],
  ["inventory-overview", "Inventory overview"],
] as const;
type AnalysisKey = (typeof sections)[number][0];
type ChartConfig = {
  kind: "line" | "bar";
  series: ChartSeries[];
  label: (row: Row) => string;
  stacked?: boolean;
  percent?: boolean;
};
const green = "#255b3a";
const sage = "#83a88d";
const gold = "#b58437";
const rust = "#aa6247";
const blue = "#527d91";
const slate = "#718078";
const metric = (key: string, name: string, color: string): ChartSeries => ({
  key,
  name,
  color,
});
const equipmentLabel = (row: Row) =>
  String(row.equipment_name ?? "Unknown equipment");
const chartConfigs: Record<AnalysisKey, ChartConfig> = {
  "borrowing-trends": {
    kind: "line",
    label: (row) => {
      const date = new Date(String(row.month));
      return Number.isNaN(date.getTime())
        ? String(row.month ?? "Unknown month")
        : date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          });
    },
    series: [
      metric("total_requests", "Requests", green),
      metric("accepted_requests", "Accepted", sage),
      metric("rejected_requests", "Rejected", rust),
      metric("cancelled_requests", "Cancelled", gold),
    ],
  },
  "equipment-usage": {
    kind: "bar",
    label: equipmentLabel,
    series: [
      metric("total_borrow_count", "Borrows", green),
      metric("unique_assets_used", "Assets used", sage),
    ],
  },
  "inventory-utilization": {
    kind: "bar",
    label: equipmentLabel,
    percent: true,
    series: [metric("current_utilization_percent", "Utilization", green)],
  },
  "user-frequency": {
    kind: "bar",
    label: (row) =>
      String(row.user_name ?? row.institutional_id ?? "Unknown user"),
    series: [
      metric("total_requests", "Requests", green),
      metric("total_assets_borrowed", "Assets borrowed", sage),
    ],
  },
  "college-frequency": {
    kind: "bar",
    label: (row) =>
      String(row.college_name ?? row.college_code ?? "Unknown college"),
    series: [
      metric("total_requests", "Requests", green),
      metric("total_assets_borrowed", "Assets borrowed", sage),
    ],
  },
  "course-frequency": {
    kind: "bar",
    label: (row) =>
      String(row.course_name ?? row.course_code ?? "Unknown course"),
    series: [
      metric("total_requests", "Requests", green),
      metric("total_assets_borrowed", "Assets borrowed", sage),
    ],
  },
  "peak-periods": {
    kind: "bar",
    label: (row) =>
      `${String(row.day_name ?? "Day")} ${String(row.hour_of_day ?? 0).padStart(2, "0")}:00`,
    series: [metric("total_assets_released", "Assets released", green)],
  },
  "inventory-overview": {
    kind: "bar",
    label: equipmentLabel,
    stacked: true,
    series: [
      metric("available_units", "Available", green),
      metric("reserved_units", "Reserved", sage),
      metric("borrowed_units", "Borrowed", blue),
      metric("maintenance_units", "Maintenance", gold),
      metric("damaged_units", "Damaged", rust),
      metric("retired_units", "Retired", slate),
    ],
  },
};

function toChartRows(rows: Row[], config: ChartConfig): ChartRow[] {
  return rows.map(
    (row) =>
      Object.fromEntries([
        ["label", config.label(row)],
        ...config.series.map(({ key }) => [key, Number(row[key] ?? 0) || 0]),
      ]) as ChartRow,
  );
}

function AnalyticsSection({
  name,
  title,
}: {
  name: AnalysisKey;
  title: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Row[]; total: number }>(`/api/v1/analytics/${name}/`, {
      query: { page, limit: 20 },
      signal: controller.signal,
    })
      .then((result) => {
        setRows(result.data);
        setTotal(result.total);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Data could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [name, page, retryVersion]);
  const config = chartConfigs[name];
  const orderedRows =
    name === "borrowing-trends"
      ? [...rows].sort((a, b) => String(a.month).localeCompare(String(b.month)))
      : name === "peak-periods"
        ? [...rows].sort(
            (a, b) =>
              Number(a.day_of_week) - Number(b.day_of_week) ||
              Number(a.hour_of_day) - Number(b.hour_of_day),
          )
        : rows;
  const chartRows = toChartRows(orderedRows, config);
  const columns = rows[0] ? visibleColumns(rows[0]) : [];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {error && (
        <ErrorNotice
          message={error}
          onRetry={() => {
            setLoading(true);
            setRetryVersion((value) => value + 1);
          }}
        />
      )}
      {loading ? (
        <div className="mt-4">
          <CardLoadingSkeleton label={`Loading ${title} analysis`} />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[#dce8dc] bg-[#f7faf6] p-5 text-sm text-[#526b59]">
          No activity has been recorded for this analysis yet. A graph will
          appear here when matching records are available.
        </p>
      ) : (
        <>
          <AnalyticsChart
            rows={chartRows}
            title={title}
            series={config.series}
            kind={config.kind}
            stacked={config.stacked}
            percent={config.percent}
          />
          <div
            className="ui-table-scroll mt-4"
            tabIndex={0}
            role="region"
            aria-label="Analytics data"
          >
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {columns.map((key) => (
                    <th
                      scope="col"
                      key={key}
                      className="px-3 py-2 font-medium capitalize"
                    >
                      {columnLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {columns.map((column) => (
                      <td key={column} className="px-3 py-2">
                        {displayValue(row[column], column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={total}
            label="rows"
            loading={loading}
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
          />
        </>
      )}
    </section>
  );
}

export function AnalyticsDashboard() {
  const [selected, setSelected] = useState<AnalysisKey>(sections[0][0]);
  const title =
    sections.find(([name]) => name === selected)?.[1] ?? "Analytics";
  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <label
          htmlFor="analytics-report"
          className="mb-2 block text-sm font-semibold"
        >
          Choose an analysis
        </label>
        <CustomSelect
          id="analytics-report"
          value={selected}
          placeholder="Choose an analysis"
          options={sections.map(([name, label]) => ({ value: name, label }))}
          onValueChange={(value) => setSelected(value as AnalysisKey)}
        />
      </div>
      <p className="text-sm text-slate-600">
        Charts summarize the current page of results. Use the table for exact
        values.
      </p>
      <AnalyticsSection key={selected} name={selected} title={title} />
    </div>
  );
}
