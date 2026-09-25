export function canCancelRequest(status: string) {
  return status === "draft" || status === "submitted";
}

export function validApproval(requested: number, approved: number) {
  return (
    Number.isInteger(requested) &&
    Number.isInteger(approved) &&
    requested > 0 &&
    approved >= 0 &&
    approved <= requested
  );
}

export function returnRequestStatus(released: number, returned: number) {
  if (released < 1 || returned < 1 || returned > released)
    throw new Error("Invalid return counts");
  return returned === released
    ? ("returned" as const)
    : ("partially_returned" as const);
}
