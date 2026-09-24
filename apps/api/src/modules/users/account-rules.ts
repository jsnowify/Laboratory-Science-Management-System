export type Status = "pending" | "active" | "suspended" | "archived";

export function canSetStatus(from: Status, to: Status) {
  return (
    (from === "pending" && to === "active") ||
    (from === "active" && (to === "suspended" || to === "archived")) ||
    (from === "suspended" && (to === "active" || to === "archived"))
  );
}
