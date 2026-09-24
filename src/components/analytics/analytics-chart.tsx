"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AnalyticsChart({ rows, title }: { rows: { label: string; value: number }[]; title: string }) {
  return <div className="mt-5 h-64 min-w-0 overflow-hidden" role="img" aria-label={`${title}. Exact values are listed in the table below.`}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={rows} accessibilityLayer><CartesianGrid vertical={false} stroke="#e2e8e4" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} /><Tooltip /><Bar dataKey="value" name="Total" fill="#166534" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>;
}
