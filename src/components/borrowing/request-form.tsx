"use client";

import Link from "next/link";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { borrowRequestInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { FormField, inputClass } from "@/components/auth/auth-frame";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Boxes, CalendarDays } from "lucide-react";

type Catalog = { id: string; equipmentName: string; availableUnits: number };
type Line = { equipmentCatalogId: string; quantityRequested: number };
type Draft = {
  id: string;
  purpose: string;
  requestedBorrowAt: string;
  requestedDueAt: string;
  items: Line[];
};

function localDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function RequestForm({
  selectedEquipment,
  draft,
}: {
  selectedEquipment?: string;
  draft?: Draft;
}) {
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
  const [items, setItems] = useState<Line[]>(
    draft?.items ?? [
      { equipmentCatalogId: selectedEquipment ?? "", quantityRequested: 1 },
    ],
  );
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiRequest<{ data: Catalog[] }>("/api/v1/equipment/catalog/", {
        query: { q: catalogSearch, limit: 100 },
        signal: controller.signal,
      })
        .then((result) => {
          setCatalog(result.data);
          setCatalogError("");
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setCatalogError(
              cause instanceof Error
                ? cause.message
                : "Equipment could not be loaded.",
            );
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [catalogSearch, retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const submit =
      ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)
        ?.value === "submit";
    setError("");
    setFields({});
    const parsed = borrowRequestInput.safeParse({
      purpose,
      requestedBorrowAt: borrowAt ? new Date(borrowAt).toISOString() : "",
      requestedDueAt: dueAt ? new Date(dueAt).toISOString() : "",
      items,
    });
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    if (
      submit &&
      !(await confirm({
        title: "Submit this borrowing request?",
        description:
          "An administrator will review your purpose, dates, and equipment quantities. You can edit the request while it is a draft.",
        confirmLabel: "Submit request",
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await apiRequest<{ id: string }>(
        `/api/v1/borrow-requests/${savedId ? `${savedId}/` : ""}`,
        { method: savedId ? "PATCH" : "POST", body: parsed.data },
      );
      setSavedId(result.id);
      if (submit)
        await apiRequest(`/api/v1/borrow-requests/${result.id}/submit/`, {
          method: "POST",
        });
      toast(submit ? "Request submitted for review." : "Draft saved.");
      router.push(`/portal/requests/${result.id}/`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields ?? {});
      } else setError("The request could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="workspace-card space-y-7 p-5 sm:p-8">
      <p className="border-b border-[#e5ece4] pb-6 text-sm leading-7 text-[#526b59]">
        Choose dates and equipment, then save a draft or submit for review.
      </p>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-lg text-[#254533]">
          <CalendarDays
            size={19}
            className="text-[#4e8260]"
            aria-hidden="true"
          />{" "}
          Purpose and schedule
        </h3>
        <FormField
          id="purpose"
          label="Borrowing purpose"
          error={fields.purpose?.[0]}
        >
          <textarea
            id="purpose"
            required
            rows={3}
            className={inputClass}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="borrowAt"
            label="Borrow date and time"
            error={fields.requestedBorrowAt?.[0]}
          >
            <DateTimeField
              id="borrowAt"
              label="Borrow date and time"
              required
              value={borrowAt}
              onValueChange={setBorrowAt}
            />
          </FormField>
          <FormField
            id="dueAt"
            label="Due date and time"
            error={fields.requestedDueAt?.[0]}
          >
            <DateTimeField
              id="dueAt"
              label="Due date and time"
              min={borrowAt || undefined}
              required
              value={dueAt}
              onValueChange={setDueAt}
            />
          </FormField>
        </div>
      </section>
      <section className="border-t border-[#e5ece4] pt-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg text-[#254533]">
          <Boxes size={19} className="text-[#4e8260]" aria-hidden="true" />{" "}
          Equipment requested
        </h3>
        <FormField id="catalogSearch" label="Search equipment types">
          <input
            id="catalogSearch"
            className={inputClass}
            placeholder="Filter equipment options"
            value={catalogSearch}
            onChange={(event) => setCatalogSearch(event.target.value)}
          />
        </FormField>
        {catalogError && (
          <ErrorNotice
            message={catalogError}
            onRetry={() => setRetry((value) => value + 1)}
          />
        )}
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-[#e1eae0] bg-[#f7faf6] p-3 sm:grid-cols-[1fr_100px_auto]"
            >
              <CustomSelect
                id={`equipment-${index}`}
                label={`Equipment item ${index + 1}`}
                required
                value={item.equipmentCatalogId}
                placeholder="Choose equipment"
                emptyMessage="No equipment is available to request yet. Check back after the laboratory adds equipment."
                options={[
                  ...catalog.map((option) => ({
                    value: option.id,
                    label: `${option.equipmentName} (${option.availableUnits} available now)`,
                  })),
                  ...(item.equipmentCatalogId &&
                  !catalog.some(
                    (option) => option.id === item.equipmentCatalogId,
                  )
                    ? [
                        {
                          value: item.equipmentCatalogId,
                          label: "Selected equipment",
                        },
                      ]
                    : []),
                ]}
                onValueChange={(value) =>
                  setItems(
                    items.map((row, position) =>
                      position === index
                        ? { ...row, equipmentCatalogId: value }
                        : row,
                    ),
                  )
                }
              />
              <input
                aria-label={`Quantity for item ${index + 1}`}
                type="number"
                min={1}
                max={100}
                required
                className={inputClass}
                value={item.quantityRequested}
                onChange={(event) =>
                  setItems(
                    items.map((row, position) =>
                      position === index
                        ? {
                            ...row,
                            quantityRequested: Number(event.target.value),
                          }
                        : row,
                    ),
                  )
                }
              />
              <button
                type="button"
                disabled={items.length === 1}
                onClick={() =>
                  setItems(items.filter((_, position) => position !== index))
                }
                className="ui-button-secondary"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {fields.items?.[0] && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {fields.items[0]}
          </p>
        )}
        <button
          type="button"
          disabled={items.length >= 20}
          onClick={() =>
            setItems([
              ...items,
              { equipmentCatalogId: "", quantityRequested: 1 },
            ])
          }
          className="mt-3 text-sm font-medium text-green-800 hover:underline"
        >
          Add another equipment type
        </button>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 border-t border-[#e5ece4] pt-6">
        <button
          type="submit"
          value="draft"
          disabled={busy}
          className="ui-button-secondary"
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          value="submit"
          disabled={busy}
          className="ui-button-primary"
        >
          Submit request
        </button>
        <Link href="/portal/requests/" className="ui-button-secondary">
          Back to requests
        </Link>
      </div>
    </form>
  );
}
