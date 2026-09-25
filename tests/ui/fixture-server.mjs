// Isolated UI fixtures. This server never connects to the LSMS API or database.
import { createServer } from "node:http";

const id = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";
const date = "2026-09-24T08:00:00.000Z";
const profile = { id, institutionalId: "TEST-001", firstName: "Test", lastName: "Borrower", middleName: null, email: "test.account@example.invalid", personType: "student", accountStatus: "active" };
const userRows = [
  { ...profile, role: "student_faculty", accountStatus: "pending" },
  { ...profile, id: "22222222-2222-4222-8222-222222222222", institutionalId: "ADMIN-001", firstName: "Test", lastName: "Administrator", email: "admin@example.invalid", role: "admin", personType: null },
  { ...profile, id: "33333333-3333-4333-8333-333333333333", institutionalId: "ROOT-001", firstName: "Test", lastName: "Super Admin", email: "super.admin@example.invalid", role: "super_admin", personType: null },
];
const catalog = { id, equipmentName: "Compound microscope", categoryId: id, description: "Optical equipment for laboratory activities.", manufacturer: "Test manufacturer", model: "Lab model", unitOfMeasure: "unit", totalUnits: 8, availableUnits: 5, reservedUnits: 1, isActive: true };
const asset = { id, equipmentCatalogId: id, equipmentName: catalog.equipmentName, assetCode: "MIC-003", serialNumber: "TEST-SERIAL", departmentId: id, currentCondition: "good", operationalStatus: "active", availabilityStatus: "available", acquisitionDate: "2026-01-01", notes: null, archivedAt: null };
const custody = { allocationId: id, requestNumber: "BR-2026-0001", institutionalId: "TEST-001", borrowerName: "Test Borrower", assetCode: asset.assetCode, equipmentName: catalog.equipmentName, releasedAt: date, dueAt: date, releaseCondition: "good", isOverdue: true, overdueDuration: "1 day" };
const organization = { id, code: "TEST", name: "Test laboratory", collegeId: id, description: "Test category", isActive: true };
function requestDetail(requestId, status = "submitted") {
  return { id: requestId, requestNumber: "BR-2026-0001", institutionalId: "TEST-001", firstName: "Test", lastName: "Borrower", purpose: "Laboratory observation and sample analysis", requestedBorrowAt: date, requestedDueAt: "2026-09-25T08:00:00.000Z", status, reviewNotes: null, rejectionReason: null,
    items: [{ id: itemId, equipmentCatalogId: id, equipmentName: catalog.equipmentName, quantityRequested: 1, quantityApproved: ["submitted", "draft"].includes(status) ? null : 1 }],
    allocations: ["ready_for_release", "borrowed"].includes(status) ? [{ id, borrowRequestItemId: itemId, equipmentAssetId: id, assetCode: asset.assetCode, allocationStatus: "reserved", releaseCondition: null, releasedAt: null }] : [],
    history: [{ newStatus: status, changedAt: date, remarks: "Test record" }] };
}
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4100");
  const role = /lsms-ui-role=(admin|super_admin|student_faculty)/.exec(req.headers.cookie ?? "")?.[1] ?? "super_admin";
  const list = (data) => ({ data, total: data.length, page: 1, limit: 20 });
  let result;
  if (req.method !== "GET") result = { ok: true, id };
  else if (url.pathname === "/health/") result = { ok: true };
  else if (url.pathname === "/api/v1/me/") {
    if (!/lsms-ui-role=|lsms-ui-pending=1/.test(req.headers.cookie ?? "")) { res.writeHead(401, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } })); return; }
    result = { ...(userRows.find((user) => user.role === role) ?? profile), role, accountStatus: /lsms-ui-pending=1/.test(req.headers.cookie ?? "") ? "pending" : "active" };
  }
  else if (url.pathname === "/api/v1/dashboard/") result = { cards: (role === "super_admin" ? ["Submitted requests", "Under review", "Ready for release", "Borrowed assets", "Overdue assets", "Returns this week"] : role === "admin" ? ["Physical assets", "Available", "Borrowed", "Maintenance", "Damaged", "Pending accounts", "Recorded asset uses"] : ["Draft requests", "Submitted requests", "Approved requests", "Assets in custody", "Unread notifications"]).map((label, index) => ({ label, value: index + 1 })), ...(role === "super_admin" ? { audit: { total: 2, adminTotal: 1, recent: [{ id, action: "equipment_asset.created", entityType: "equipment_assets", createdAt: date, firstName: "Test", lastName: "Admin", actorRole: "admin" }] } } : {}) };
  else if (url.pathname === "/api/v1/audit/") result = list(role === "admin" ? [{ id, action: "borrow_request.submitted", entityType: "borrow_requests", entityId: id, targetLabel: "BR-2026-0001 · Test Borrower", metadata: null, createdAt: date, actorFirstName: "Test", actorLastName: "Borrower", actorRole: "student_faculty" }] : [{ id, action: "equipment_asset.created", entityType: "equipment_assets", entityId: id, targetLabel: "Compound microscope · MIC-003", metadata: null, createdAt: date, actorFirstName: "Test", actorLastName: "Admin", actorInstitutionalId: "TEST-ADMIN", actorRole: "admin" }]);
  else if (url.pathname === "/api/v1/notifications/") result = { ...list([{ id, title: "Request approved", message: "Your equipment request is ready for allocation.", createdAt: date, readAt: null, relatedEntityType: "borrow_requests", relatedEntityId: id }]), unreadCount: 1 };
  else if (url.pathname === "/api/v1/users/") result = list(userRows.filter((user) => (role === "super_admin" || user.role === "student_faculty") && (!url.searchParams.get("status") || user.accountStatus === url.searchParams.get("status")) && (!url.searchParams.get("role") || user.role === url.searchParams.get("role"))));
  else if (url.pathname === "/api/v1/equipment/catalog/") result = list([catalog]);
  else if (url.pathname === "/api/v1/equipment/assets/") result = list([asset]);
  else if (url.pathname.startsWith("/api/v1/equipment/qr/")) result = { ...asset, categoryName: "Microscopy", departmentName: "Test laboratory" };
  else if (/^\/api\/v1\/(colleges|courses|departments|equipment\/categories)\/$/.test(url.pathname)) result = list([organization]);
  else if (url.pathname === "/api/v1/borrow-requests/") result = list([requestDetail(id, url.searchParams.get("status") || "submitted")]);
  else if (/^\/api\/v1\/borrow-requests\/[^/]+\/$/.test(url.pathname)) {
    const requestId = url.pathname.split("/")[4];
    result = requestDetail(requestId, ({ "2": "approved", "3": "ready_for_release", "4": "borrowed", "5": "draft" })[requestId.slice(-1)] || "submitted");
  }
  else if (url.pathname === "/api/v1/custody/" || url.pathname === "/api/v1/overdue/") result = list([custody]);
  else if (url.pathname === "/api/v1/accountability/") result = list([{ ...custody, returnRecordId: id, conditionBefore: "good", conditionAfter: "damaged", outcome: "damaged", returnedAt: date, wasReturnedLate: true, remarks: "Lens needs inspection." }]);
  else if (url.pathname === "/api/v1/iso/") result = list([{ id, formNumber: "TEST-ISO-001", requestNumber: "BR-2026-0001", generatedAt: date, releasedAt: null }]);
  else if (url.pathname.startsWith("/api/v1/analytics/")) {
    const key = url.pathname.split("/")[4];
    const analytics = {
      "borrowing-trends": [{ month: "2026-08-01", total_requests: 3, accepted_requests: 2, rejected_requests: 1, cancelled_requests: 0 }, { month: "2026-09-01", total_requests: 5, accepted_requests: 4, rejected_requests: 0, cancelled_requests: 1 }],
      "equipment-usage": [{ equipment_name: "Compound microscope", total_borrow_count: 6, unique_assets_used: 3 }],
      "inventory-utilization": [{ equipment_name: "Compound microscope", current_utilization_percent: 37.5 }],
      "user-frequency": [{ institutional_id: "TEST-001", user_name: "Test Borrower", total_requests: 5, total_assets_borrowed: 6 }],
      "college-frequency": [{ college_code: "SCI", college_name: "Science", total_requests: 5, total_assets_borrowed: 6 }],
      "course-frequency": [{ course_code: "BIO", course_name: "Biology", total_requests: 5, total_assets_borrowed: 6 }],
      "peak-periods": [{ day_of_week: 1, day_name: "Monday", hour_of_day: 9, total_assets_released: 4 }],
      "inventory-overview": [{ equipment_name: "Compound microscope", available_units: 5, reserved_units: 1, borrowed_units: 2, maintenance_units: 0, damaged_units: 0, retired_units: 0 }],
    };
    result = list(analytics[key] ?? []);
  }
  else if (url.pathname.startsWith("/api/v1/reports/")) result = list([{ equipment_id: id, equipment_name: catalog.equipmentName, asset_code: asset.assetCode, availability_status: "available", total_units: 8 }]);
  else { res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: { message: "No UI fixture for this route" } })); return; }
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(result));
});
server.listen(4100, "127.0.0.1", () => process.stdout.write("UI fixture server listening on 4100\n"));
