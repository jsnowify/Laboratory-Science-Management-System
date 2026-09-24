"use client";

import Link from "next/link";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { borrowRequestInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { FormField, inputClass } from "@/components/auth/auth-frame";

type Catalog = { id: string; equipmentName: string; availableUnits: number };
type Line = { equipmentCatalogId: string; quantityRequested: number };
type Draft = { id: string; purpose: string; requestedBorrowAt: string; requestedDueAt: string; items: Line[] };

function localDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function RequestForm({ selectedEquipment, draft }: { selectedEquipment?: string; draft?: Draft }) {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [savedId, setSavedId] = useState(draft?.id);
  const [catalogError, setCatalogError] = useState("");
  const [retry, setRetry] = useState(0);
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [purpose, setPurpose] = useState(draft?.purpose ?? "");
  const [borrowAt, setBorrowAt] = useState(localDate(draft?.requestedBorrowAt));
  const [dueAt, setDueAt] = useState(localDate(draft?.requestedDueAt));
  const [items, setItems] = useState<Line[]>(draft?.items ?? [{ equipmentCatalogId: selectedEquipment ?? "", quantityRequested: 1 }]);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiRequest<{ data: Catalog[] }>("/api/v1/equipment/catalog/", { query: { q: catalogSearch, limit: 100 }, signal: controller.signal })
        .then((result) => { setCatalog(result.data); setCatalogError(""); })
        .catch((cause) => { if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : "Equipment could not be loaded."); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [catalogSearch, retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const submit = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "submit";
    setError(""); setFields({});
    const parsed = borrowRequestInput.safeParse({ purpose, requestedBorrowAt: borrowAt ? new Date(borrowAt).toISOString() : "", requestedDueAt: dueAt ? new Date(dueAt).toISOString() : "", items });
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); return; }
    if (submit && !await confirm({ title: "Submit this borrowing request?", description: "An administrator will review your purpose, dates, and equipment quantities. You can edit the request while it is a draft.", confirmLabel: "Submit request" })) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ id: string }>(`/api/v1/borrow-requests/${savedId ? `${savedId}/` : ""}`, { method: savedId ? "PATCH" : "POST", body: parsed.data });
      setSavedId(result.id);
      if (submit) await apiRequest(`/api/v1/borrow-requests/${result.id}/submit/`, { method: "POST" });
      toast(submit ? "Request submitted for review." : "Draft saved.");
      router.push(`/portal/requests/${result.id}/`);
      router.refresh();
    } catch (cause) { if (cause instanceof ApiError) { setError(cause.message); setFields(cause.fields ?? {}); } else setError("The request could not be saved."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
    <p className="text-sm leading-6 text-slate-600">Choose your dates and equipment. Save a draft to finish later, or submit it for administrator review.</p>
    <FormField id="purpose" label="Borrowing purpose" error={fields.purpose?.[0]}><textarea id="purpose" required rows={3} className={inputClass} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="borrowAt" label="Borrow date and time" error={fields.requestedBorrowAt?.[0]}><input id="borrowAt" required type="datetime-local" className={inputClass} value={borrowAt} onChange={(event) => setBorrowAt(event.target.value)} /></FormField><FormField id="dueAt" label="Due date and time" error={fields.requestedDueAt?.[0]}><input id="dueAt" min={borrowAt || undefined} required type="datetime-local" className={inputClass} value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></FormField></div>
    <div className="border-t border-slate-200 pt-5"><h2 className="mb-3 font-semibold">Equipment requested</h2><FormField id="catalogSearch" label="Search equipment types"><input id="catalogSearch" className={inputClass} placeholder="Filter equipment options" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} /></FormField>
      {catalogError && <ErrorNotice message={catalogError} onRetry={() => setRetry((value) => value + 1)} />}<div className="mt-4 space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_100px_auto]"><select aria-label={`Equipment item ${index + 1}`} required className={inputClass} value={item.equipmentCatalogId} onChange={(event) => setItems(items.map((row, position) => position === index ? { ...row, equipmentCatalogId: event.target.value } : row))}><option value="">Choose equipment</option>{catalog.map((option) => <option key={option.id} value={option.id}>{option.equipmentName} ({option.availableUnits} available now)</option>)}{item.equipmentCatalogId && !catalog.some((option) => option.id === item.equipmentCatalogId) && <option value={item.equipmentCatalogId}>Selected equipment</option>}</select><input aria-label={`Quantity for item ${index + 1}`} type="number" min={1} max={100} required className={inputClass} value={item.quantityRequested} onChange={(event) => setItems(items.map((row, position) => position === index ? { ...row, quantityRequested: Number(event.target.value) } : row))} /><button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, position) => position !== index))} className="rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-40">Remove</button></div>)}</div>
      {fields.items?.[0] && <p role="alert" className="mt-2 text-sm text-red-700">{fields.items[0]}</p>}
      <button type="button" disabled={items.length >= 20} onClick={() => setItems([...items, { equipmentCatalogId: "", quantityRequested: 1 }])} className="mt-3 text-sm font-medium text-green-800 hover:underline">Add another equipment type</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3"><button type="submit" value="draft" disabled={busy} className="ui-button-secondary">{busy ? "Saving…" : "Save draft"}</button><button type="submit" value="submit" disabled={busy} className="ui-button-primary">Submit request</button><Link href="/portal/requests/" className="ui-button-secondary">Back to requests</Link></div>
  </form>;
}
