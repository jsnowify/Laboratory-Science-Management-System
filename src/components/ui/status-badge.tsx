type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const labels: Record<string, [string, Tone]> = {
  draft: ["Draft", "neutral"], submitted: ["Submitted", "info"], under_review: ["Under review", "warning"],
  approved: ["Approved", "success"], rejected: ["Rejected", "danger"], ready_for_release: ["Ready for release", "success"],
  borrowed: ["Borrowed", "info"], partially_returned: ["Partially returned", "warning"], returned: ["Returned", "success"],
  cancelled: ["Cancelled", "neutral"], pending: ["Pending", "warning"], active: ["Active", "success"],
  suspended: ["Suspended", "danger"], archived: ["Archived", "neutral"], available: ["Available", "success"],
  inactive: ["Inactive", "neutral"],
  reserved: ["Reserved", "warning"], maintenance: ["Maintenance", "warning"], damaged: ["Damaged", "danger"],
  retired: ["Retired", "neutral"], normal: ["Normal", "success"], maintenance_required: ["Maintenance required", "warning"],
};
const styles: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

export function statusLabel(value: string) {
  return labels[value]?.[0] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = labels[status] ?? [statusLabel(status), "neutral" as const];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{label}
  </span>;
}
