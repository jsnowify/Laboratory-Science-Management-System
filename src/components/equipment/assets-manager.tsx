"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { assetInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";

type Asset = {
  id: string;
  equipmentCatalogId: string;
  equipmentName: string;
  assetCode: string;
  serialNumber: string | null;
  departmentId: string | null;
  currentCondition: "excellent" | "good" | "fair" | "damaged";
  operationalStatus: "active" | "maintenance" | "damaged" | "retired";
  acquisitionDate: string | null;
  notes: string | null;
  archivedAt: string | null;
  availabilityStatus: string;
};
type Option = { id: string; name?: string; equipmentName?: string };
const empty = {
  equipmentCatalogId: "",
  assetCode: "",
  serialNumber: "",
  departmentId: "",
  currentCondition: "good" as Asset["currentCondition"],
  operationalStatus: "active" as Asset["operationalStatus"],
  acquisitionDate: "",
  notes: "",
};

export function AssetsManager() {
  const { confirm, toast } = useFeedback();
  const editor = useRef<HTMLDetailsElement>(null);
  const [rows, setRows] = useState<Asset[]>([]);
  const [catalog, setCatalog] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [values, setValues] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    apiRequest<{ data: Option[] }>("/api/v1/equipment/catalog/", {
      query: { limit: 100 },
    })
      .then((page) => setCatalog(page.data))
      .catch(() => setLookupError("Equipment options could not be loaded. Try again before adding a record."));
    apiRequest<{ data: Option[] }>("/api/v1/departments/", {
      query: { limit: 100 },
    })
      .then((page) => setDepartments(page.data))
      .catch(() => setLookupError("Equipment options could not be loaded. Try again before adding a record."));
  }, [retryVersion]);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Asset[]; total: number }>("/api/v1/equipment/assets/", {
      query: { q: search, page, limit: 20, includeInactive: "true" },
      signal: controller.signal,
    })
      .then((result) => {
        setRows(result.data);
        setTotal(result.total);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Assets could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, page, version, retryVersion]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const parsed = assetInput.safeParse({
      ...values,
      departmentId: values.departmentId || undefined,
      acquisitionDate: values.acquisitionDate || undefined,
    });
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    setError("");
    setFields({});
    try {
      await apiRequest(
        `/api/v1/equipment/assets/${editing ? `${editing}/` : ""}`,
        { method: editing ? "PATCH" : "POST", body: parsed.data },
      );
      setValues(empty);
      setEditing(null);
      setVersion((value) => value + 1);
      toast(`Physical asset ${editing ? "updated" : "added"}.`);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields ?? {});
      } else setError("Asset could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(row: Asset) {
    if (busy) return;
    if (!await confirm({ title: `Archive asset ${row.assetCode}?`, description: "This physical asset will not be available for future borrowing. Its borrowing history will remain.", confirmLabel: "Archive asset", tone: "danger" })) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/equipment/assets/${row.id}/`, {
        method: "PATCH",
        body: { archive: true },
      });
      setVersion((value) => value + 1);
      toast(`Asset ${row.assetCode} archived.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Asset could not be archived.",
      );
    }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      {lookupError && <ErrorNotice message={lookupError} onRetry={() => { setLookupError(""); setRetryVersion((value) => value + 1); }} />}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Search assets"
          className={`${inputClass} max-w-sm`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search asset or serial code"
        />
        <button className="ui-button-secondary">
          Search
        </button>
      </form>
      <details ref={editor} className="ui-panel max-w-4xl"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-green-800">{editing ? "Edit physical asset" : "Add physical asset"}</summary><form
        onSubmit={save}
        className="border-t border-slate-200 p-4 sm:p-5"
      >
        <h2 className="mb-4 font-semibold">
          {editing ? "Edit physical asset" : "Add physical asset"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            id="equipmentCatalogId"
            label="Equipment type"
            error={fields.equipmentCatalogId?.[0]}
          >
            <select
              id="equipmentCatalogId"
              required
              className={inputClass}
              value={values.equipmentCatalogId}
              onChange={(event) =>
                setValues({ ...values, equipmentCatalogId: event.target.value })
              }
            >
              <option value="">Choose equipment</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.equipmentName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="assetCode"
            label="Asset code"
            error={fields.assetCode?.[0]}
          >
            <input
              id="assetCode"
              required
              className={inputClass}
              value={values.assetCode}
              onChange={(event) =>
                setValues({ ...values, assetCode: event.target.value })
              }
            />
          </FormField>
          <FormField
            id="serialNumber"
            label="Serial number (optional)"
            error={fields.serialNumber?.[0]}
          >
            <input
              id="serialNumber"
              className={inputClass}
              value={values.serialNumber}
              onChange={(event) =>
                setValues({ ...values, serialNumber: event.target.value })
              }
            />
          </FormField>
          <FormField
            id="departmentId"
            label="Department (optional)"
            error={fields.departmentId?.[0]}
          >
            <select
              id="departmentId"
              className={inputClass}
              value={values.departmentId}
              onChange={(event) =>
                setValues({ ...values, departmentId: event.target.value })
              }
            >
              <option value="">No department</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="currentCondition"
            label="Condition"
            error={fields.currentCondition?.[0]}
          >
            <select
              id="currentCondition"
              className={inputClass}
              value={values.currentCondition}
              onChange={(event) =>
                setValues({
                  ...values,
                  currentCondition: event.target
                    .value as Asset["currentCondition"],
                })
              }
            >
              {["excellent", "good", "fair", "damaged"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField
            id="operationalStatus"
            label="Operational status"
            error={fields.operationalStatus?.[0]}
          >
            <select
              id="operationalStatus"
              className={inputClass}
              value={values.operationalStatus}
              onChange={(event) =>
                setValues({
                  ...values,
                  operationalStatus: event.target
                    .value as Asset["operationalStatus"],
                })
              }
            >
              {["active", "maintenance", "damaged", "retired"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField
            id="acquisitionDate"
            label="Acquisition date"
            error={fields.acquisitionDate?.[0]}
          >
            <input
              id="acquisitionDate"
              type="date"
              className={inputClass}
              value={values.acquisitionDate}
              onChange={(event) =>
                setValues({ ...values, acquisitionDate: event.target.value })
              }
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="notes" label="Notes" error={fields.notes?.[0]}>
              <input
                id="notes"
                className={inputClass}
                value={values.notes}
                onChange={(event) =>
                  setValues({ ...values, notes: event.target.value })
                }
              />
            </FormField>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={busy} className={`${primaryClass} w-auto`}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add asset"}
          </button>
          {editing && (
            <button
              type="button"
              className="ui-button-secondary"
              onClick={() => {
                setEditing(null);
                setValues(empty);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form></details>
      {error && (
        <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />
      )}
      <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}>
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Asset code</th>
              <th scope="col" className="px-4 py-3">Equipment</th>
              <th scope="col" className="px-4 py-3">Condition</th>
              <th scope="col" className="px-4 py-3">Operational</th>
              <th scope="col" className="px-4 py-3">Availability</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No physical assets found."}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.assetCode}</td>
                  <td className="px-4 py-3">{row.equipmentName}</td>
                  <td className="px-4 py-3 capitalize">
                    {row.currentCondition}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.operationalStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={row.availabilityStatus} /></td>
                  <td className="space-x-3 px-4 py-3">
                    <button disabled={busy}
                      className="font-medium text-green-800"
                      onClick={() => {
                        if (editor.current) { editor.current.open = true; editor.current.scrollIntoView({ block: "start" }); requestAnimationFrame(() => editor.current?.querySelector<HTMLInputElement>("input, select")?.focus()); } setEditing(row.id);
                        setValues({
                          equipmentCatalogId: row.equipmentCatalogId,
                          assetCode: row.assetCode,
                          serialNumber: row.serialNumber ?? "",
                          departmentId: row.departmentId ?? "",
                          currentCondition: row.currentCondition,
                          operationalStatus: row.operationalStatus,
                          acquisitionDate: row.acquisitionDate ?? "",
                          notes: row.notes ?? "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <a
                      className="font-medium text-green-800"
                      href={`/api/v1/equipment/assets/${row.id}/qr/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      QR
                    </a>
                    {!row.archivedAt && (
                      <button disabled={busy}
                        className="text-slate-600"
                        onClick={() => archive(row)}
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} label="assets" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
    </div>
  );
}
