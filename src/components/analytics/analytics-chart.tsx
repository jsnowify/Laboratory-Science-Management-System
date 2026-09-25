"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartSeries = { key: string; name: string; color: string };
export type ChartRow = { label: string; [key: string]: string | number };

export default function AnalyticsChart({
  rows,
  title,
  series,
  kind,
  stacked = false,
  percent = false,
}: {
  rows: ChartRow[];
  title: string;
  series: ChartSeries[];
  kind: "line" | "bar";
  stacked?: boolean;
  percent?: boolean;
}) {
  const axis = (
    <>
      <CartesianGrid stroke="#e6eee7" strokeDasharray="3 4" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11, fill: "#52685a" }}
        tickFormatter={(value: string) =>
          value.length > 15 ? `${value.slice(0, 13)}…` : value
        }
      />
      <YAxis
        allowDecimals={percent}
        domain={percent ? [0, 100] : [0, "auto"]}
        tick={{ fontSize: 11, fill: "#52685a" }}
        width={percent ? 44 : 36}
        tickFormatter={percent ? (value: number) => `${value}%` : undefined}
      />
      <Tooltip
        formatter={(value, name) => [
          `${value ?? 0}${percent ? "%" : ""}`,
          String(name),
        ]}
        contentStyle={{
          border: "1px solid #dce9dc",
          borderRadius: 10,
          boxShadow: "0 8px 24px #193b2414",
        }}
      />
      {series.length > 1 && (
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
      )}
    </>
  );

  return (
    <div
      className="mt-5 min-w-0 max-w-full overflow-hidden rounded-xl border border-[#e2ebe2] bg-[#fcfdfb] px-2 py-4 sm:px-5"
      role="img"
      aria-label={`${title} graph. Exact values are listed in the table below.`}
    >
      <div className="h-72 min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {kind === "line" ? (
            <LineChart
              data={rows}
              margin={{ top: 10, right: 12, bottom: 8, left: 0 }}
              accessibilityLayer
            >
              {axis}
              {series.map(({ key, name, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={rows}
              margin={{ top: 10, right: 12, bottom: 8, left: 0 }}
              accessibilityLayer
            >
              {axis}
              {series.map(({ key, name, color }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={name}
                  fill={color}
                  stackId={stacked ? "total" : undefined}
                  radius={stacked ? 0 : [4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
