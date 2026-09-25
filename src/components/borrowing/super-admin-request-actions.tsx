"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { FormField, inputClass } from "@/components/auth/auth-frame";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ErrorNotice } from "@/components/ui/error-notice";
import { CustomSelect } from "@/components/ui/custom-select";
import type { RequestDetail } from "./request-summary";

type Asset = { id: string; assetCode: string; operationalStatus: string; availabilityStatus: string };
type Condition = "excellent" | "good" | "fair" | "damaged" | "";
const stages = ["Review quantities", "Allocate assets", "Release equipment", "Record returns"];

export function SuperAdminRequestActions({ request }: { request: RequestDetail }) {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [approved, setApproved] = useState<Record<string, number>>({});
  const [itemId, setItemId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [retry, setRetry] = useState(0);
  const [conditions, setConditions] = useState<Record<string, Condition>>({});
  const selectedItem = request.items.find((item) => item.id === itemId);
  const selectedCatalogId = selectedItem?.equipmentCatalogId;
  useEffect(() => {
    if (!selectedCatalogId) return;
    const controller = new AbortController();
    apiRequest<{ data: Asset[] }>("/api/v1/equipment/assets/", { query: { catalogId: selectedCatalogId, limit: 100 }, signal: controller.signal })
      .then((result) => { setAssets(result.data); setAssetError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setAssetError(cause instanceof Error ? cause.message : "Assets could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setAssetLoading(false); });
    return () => controller.abort();
  }, [selectedCatalogId, retry]);

  async function action(path: string, body: unknown = {}) {
    if (busy) return;
    const confirmations: Record<string, { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary" }> = {
      approve: { title: `Approve ${request.requestNumber}?`, description: `${approvedTotal} unit(s) will be approved for ${request.firstName} ${request.lastName}. You will allocate the physical assets next.`, confirmLabel: "Approve request" },
      reject: { title: `Reject ${request.requestNumber}?`, description: `The borrower will see this reason: ${reason.trim()}`, confirmLabel: "Reject request", tone: "danger" },
      release: { title: "Confirm physical handover?", description: `${request.allocations.length} asset(s) will enter the custody of ${request.firstName} ${request.lastName}, due ${new Date(request.requestedDueAt).toLocaleString()}. Confirm only when the equipment is handed over.`, confirmLabel: "Release equipment" },
    };
    if (confirmations[path] && !await confirm(confirmations[path])) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/v1/borrow-requests/${request.id}/${path}/`, { method: "POST", body });
      if (path === "allocations") { setAssetId(""); setItemId(""); setAssets([]); }
      toast(({ review: "Review started.", approve: "Request approved. Allocate assets next.", reject: "Request rejected.", allocations: "Asset allocated.", release: "Equipment released.", iso: "Requisition record generated." } as Record<string, string>)[path] ?? "Changes saved.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }

  const canDecide = request.status === "submitted" || request.status === "under_review";
  const canAllocate = request.status === "approved";
  const canRelease = request.status === "ready_for_release";
  const stage = canDecide ? 0 : canAllocate ? 1 : canRelease ? 2 : 3;
  const approvedTotal = request.items.reduce((sum, item) => sum + (approved[item.id] ?? item.quantityRequested), 0);
  const invalidQuantities = approvedTotal < 1 || request.items.some((item) => { const quantity = approved[item.id] ?? item.quantityRequested; return !Number.isInteger(quantity) || quantity < 0 || quantity > item.quantityRequested; });
  const availableAssets = assets.filter((asset) => asset.operationalStatus === "active" && asset.availabilityStatus === "available" && !request.allocations.some((allocation) => allocation.equipmentAssetId === asset.id));
  const remainingItems = request.items.filter((item) => (item.quantityApproved ?? 0) > request.allocations.filter((allocation) => allocation.borrowRequestItemId === item.id).length);
  const isClosed = ["rejected", "cancelled", "returned"].includes(request.status);
  return <section className="ui-panel space-y-5 p-4 sm:p-6" aria-busy={busy}>
    {!isClosed && <ol aria-label="Borrowing progress" className="grid gap-2 border-b border-slate-200 pb-5 sm:grid-cols-4">{stages.map((label, index) => <li key={label} aria-current={stage === index ? "step" : undefined} className={`flex items-center gap-2 text-sm ${stage === index ? "font-semibold text-green-800" : "text-slate-500"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${stage === index ? "bg-green-100" : "bg-slate-100"}`}>{index + 1}</span>{label}</li>)}</ol>}
    {error && <ErrorNotice message={error} />}
    {canDecide && <div className="space-y-5"><div><h2 className="text-lg font-semibold">Review this request</h2><p className="mt-1 text-sm text-slate-600">Check the purpose and borrowing dates above, then approve the quantities you can provide.</p></div>
      <FormField id="reviewNotes" label="Review notes (optional)"><textarea id="reviewNotes" rows={2} className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} /></FormField>
      <div className="space-y-3">{request.items.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block font-medium">{item.equipmentName}</span><span className="text-slate-600">{item.quantityRequested} requested</span></span><input aria-label={`Approved quantity for ${item.equipmentName}`} type="number" min={0} max={item.quantityRequested} className={`${inputClass} max-w-24`} value={approved[item.id] ?? item.quantityRequested} onChange={(event) => setApproved({ ...approved, [item.id]: Number(event.target.value) })} /></label>)}</div>
      {invalidQuantities && <p className="text-sm text-amber-800">Approve at least one unit. Quantities must be whole numbers within the requested amounts.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || invalidQuantities} onClick={() => action("approve", { items: request.items.map((item) => ({ itemId: item.id, quantityApproved: approved[item.id] ?? item.quantityRequested })), notes })} className="ui-button-primary">{busy ? "Processing..." : "Approve quantities"}</button>{request.status === "submitted" && <button type="button" disabled={busy} onClick={() => action("review", { notes })} className="ui-button-secondary">Mark as under review</button>}</div>
      <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer py-2 text-sm font-medium text-red-800">Reject this request</summary><div className="mt-3 space-y-3"><FormField id="rejectReason" label="Reason shown to the borrower"><textarea id="rejectReason" rows={2} minLength={5} className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} /></FormField><p className="text-xs text-slate-600">Explain why the request cannot proceed (at least 5 characters).</p><button type="button" disabled={busy || reason.trim().length < 5} onClick={() => action("reject", { reason, notes })} className="ui-button-danger">Reject request</button></div></details>
    </div>}
    {canAllocate && <div className="space-y-4"><div><h2 className="text-lg font-semibold">Allocate physical assets</h2><p className="mt-1 text-sm text-slate-600">{request.allocations.length} of {request.items.reduce((sum, item) => sum + (item.quantityApproved ?? 0), 0)} approved units allocated. Select the equipment, then assign an available asset.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="approved-item" label="Approved equipment"><CustomSelect id="approved-item" label="Approved equipment" value={itemId} placeholder="Choose equipment" emptyMessage="No approved equipment still needs an asset. Review or approve the request first." options={remainingItems.map((item) => ({ value: item.id, label: item.equipmentName }))} onValueChange={(value) => { setItemId(value); setAssetId(""); setAssets([]); setAssetLoading(Boolean(value)); setAssetError(""); }} /></FormField><FormField id="physical-asset" label="Physical asset"><CustomSelect id="physical-asset" label="Physical asset" disabled={!itemId || assetLoading} value={assetId} placeholder={assetLoading ? "Loading assets..." : "Choose available asset"} emptyMessage="No physical assets are available for this equipment. Add an asset or select another type." options={availableAssets.map((asset) => ({ value: asset.id, label: asset.assetCode }))} onValueChange={setAssetId} /></FormField></div>
      {assetError && <ErrorNotice message={assetError} onRetry={() => { setAssetLoading(true); setRetry((value) => value + 1); }} />}
      {itemId && !assetLoading && !assetError && availableAssets.length === 0 && <p className="text-sm text-amber-800">No available assets found for this equipment. Check the inventory before continuing.</p>}
      <p className="text-xs text-slate-600">Availability is checked again when you allocate. An asset cannot have overlapping reservations.</p><button type="button" disabled={busy || !itemId || !assetId || !remainingItems.some((item) => item.id === itemId)} onClick={() => action("allocations", { itemId, assetId })} className="ui-button-primary">{busy ? "Allocating..." : "Allocate asset"}</button>
    </div>}
    {canRelease && <div className="space-y-4"><div><h2 className="text-lg font-semibold">Inspect and release equipment</h2><p className="mt-1 text-sm text-slate-600">All approved units are allocated. Inspect each asset and record its condition before handover.</p></div><div className="grid gap-4 sm:grid-cols-2">{request.allocations.map((allocation) => <FormField key={allocation.id} id={`condition-${allocation.id}`} label={`${allocation.assetCode} condition`}><CustomSelect id={`condition-${allocation.id}`} label={`${allocation.assetCode} condition`} value={conditions[allocation.id] ?? ""} placeholder="Choose condition" options={["excellent", "good", "fair", "damaged"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onValueChange={(value) => setConditions({ ...conditions, [allocation.id]: value as Condition })} /></FormField>)}</div><p className="text-xs text-slate-600">A condition is required for every asset.</p><button type="button" disabled={busy || request.allocations.length === 0 || request.allocations.some((allocation) => !conditions[allocation.id])} onClick={() => action("release", { allocations: request.allocations.map((allocation) => ({ allocationId: allocation.id, condition: conditions[allocation.id] })) })} className="ui-button-primary">{busy ? "Releasing..." : "Confirm physical release"}</button></div>}
    {(request.status === "borrowed" || request.status === "partially_returned") && <div><h2 className="text-lg font-semibold">Equipment is in custody</h2><p className="my-3 text-sm text-slate-600">Record each asset&apos;s return and inspected condition from the custody page.</p><Link className="ui-button-primary" href="/super-admin/custody/">Open custody and returns</Link></div>}
    {isClosed && <p className="text-sm text-slate-600">This request is closed. Its details and history remain available for reference.</p>}
    {["approved", "ready_for_release", "borrowed", "partially_returned", "returned"].includes(request.status) && <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer py-2 text-sm font-semibold">Requisition document</summary><p className="my-3 text-sm text-slate-600">Generate a reference copy of this request. The official institutional form layout is not yet configured.</p><button type="button" disabled={busy} onClick={() => action("iso")} className="ui-button-secondary">Generate requisition</button><Link href="/super-admin/iso/" className="ml-3 inline-flex min-h-11 items-center text-sm font-medium text-green-800 underline">View requisitions</Link></details>}
  </section>;
}
