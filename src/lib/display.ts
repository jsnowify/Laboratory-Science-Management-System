const labels: Record<string, string> = {
  total_borrow_count: "Times borrowed",
  total_requests: "Requests",
  equipment_name: "Equipment",
  institutional_id: "Institutional ID",
  utilization_percentage: "Utilization (%)",
  person_type: "Account type",
};

export function columnLabel(key: string) {
  return (
    labels[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

export function visibleColumns(row: Record<string, unknown>) {
  return Object.keys(row).filter(
    (key) =>
      key === "institutional_id" ||
      key === "institutionalId" ||
      !(key === "id" || key.endsWith("_id") || key.endsWith("Id")),
  );
}

export function displayValue(value: unknown, column?: string) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString();
  if (column && /status|outcome|person_?type/i.test(column))
    return String(value).replaceAll("_", " ");
  return String(value);
}
