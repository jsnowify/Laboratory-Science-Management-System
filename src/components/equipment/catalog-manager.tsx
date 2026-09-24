"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { catalogInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";

type Catalog = {
  id: string;
  categoryId: string;
  equipmentName: string;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  unitOfMeasure: string;
  isActive: boolean;
  totalUnits: number;
  availableUnits: number;
};
type Category = { id: string; name: string };
const empty = {
  categoryId: "",
  equipmentName: "",
  description: "",
  manufacturer: "",
  model: "",
  unitOfMeasure: "unit",
};

export function CatalogManager() {
  const { confirm, toast } = useFeedback();
  const editor = useRef<HTMLDetailsElement>(null);
  const [rows, setRows] = useState<Catalog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    apiRequest<{ data: Category[] }>("/api/v1/equipment/categories/", {
      query: { limit: 100 },
    })
      .then((page) => setCategories(page.data))
      .catch(() => setLookupError("Equipment categories could not be loaded. Try again before adding a record."));
  }, [retryVersion]);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Catalog[]; total: number }>(
      "/api/v1/equipment/catalog/",
      {
        query: { q: search, page, limit: 20, includeInactive: "true" },
        signal: controller.signal,
      },
    )
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
              : "Catalog could not be loaded.",
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
    const parsed = catalogInput.safeParse(values);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    setError("");
    setFields({});
    try {
      await apiRequest(
        `/api/v1/equipment/catalog/${editing ? `${editing}/` : ""}`,
        { method: editing ? "PATCH" : "POST", body: parsed.data },
      );
      setValues(empty);
      setEditing(null);
      setVersion((value) => value + 1);
      toast(`Equipment ${editing ? "updated" : "added"}.`);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields ?? {});
      } else setError("Catalog item could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Catalog) {
    if (busy) return;
    const verb = row.isActive ? "Archive" : "Reactivate";
    if (!await confirm({ title: `${verb} ${row.equipmentName}?`, description: row.isActive ? "It will no longer be available for new borrowing. Existing transaction history remains." : "It will be available in the equipment catalog again.", confirmLabel: `${verb} equipment`, tone: row.isActive ? "danger" : "primary" })) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/equipment/catalog/${row.id}/`, {
        method: "PATCH",
        body: { isActive: !row.isActive },
      });
      setVersion((value) => value + 1);
      toast(`Equipment ${row.isActive ? "archived" : "reactivated"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Catalog item could not be updated.",
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
          aria-label="Search catalog"
          className={`${inputClass} max-w-sm`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search equipment"
        />
        <button className="ui-button-secondary">
          Search
        </button>
      </form>
      <details ref={editor} className="ui-panel max-w-4xl"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-green-800">{editing ? "Edit equipment type" : "Add equipment type"}</summary><form
        onSubmit={save}
        className="border-t border-slate-200 p-4 sm:p-5"
      >
        <h2 className="mb-4 font-semibold">
          {editing ? "Edit catalog item" : "Add catalog item"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="categoryId"
            label="Category"
            error={fields.categoryId?.[0]}
          >
            <select
              id="categoryId"
              required
              className={inputClass}
              value={values.categoryId}
              onChange={(event) =>
                setValues({ ...values, categoryId: event.target.value })
              }
            >
              <option value="">Choose category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          {(
            [
              "equipmentName",
              "manufacturer",
              "model",
              "unitOfMeasure",
              "description",
            ] as const
          ).map((key) => {
            const labels = {
              equipmentName: "Equipment name",
              manufacturer: "Manufacturer",
              model: "Model",
              unitOfMeasure: "Unit of measure",
              description: "Description",
            };
            return (
              <FormField
                key={key}
                id={key}
                label={labels[key]}
                error={fields[key]?.[0]}
              >
                <input
                  id={key}
                  className={inputClass}
                  required={key === "equipmentName" || key === "unitOfMeasure"}
                  value={values[key]}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                />
              </FormField>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={busy} className={`${primaryClass} w-auto`}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add item"}
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
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Equipment</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Assets</th>
              <th scope="col" className="px-4 py-3">Available now</th>
              <th scope="col" className="px-4 py-3">Status</th>
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
                <td colSpan={6} className="p-8 text-center text-slate-500">{error ? "Records could not be loaded. Try again above." : "No catalog items found."}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.equipmentName}</td>
                  <td className="px-4 py-3">
                    {categories.find((item) => item.id === row.categoryId)
                      ?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.totalUnits}</td>
                  <td className="px-4 py-3">{row.availableUnits}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.isActive ? "active" : "archived"} /></td>
                  <td className="space-x-3 px-4 py-3">
                    <button disabled={busy}
                      className="font-medium text-green-800"
                      onClick={() => {
                        if (editor.current) { editor.current.open = true; editor.current.scrollIntoView({ block: "start" }); requestAnimationFrame(() => editor.current?.querySelector<HTMLInputElement>("input, select")?.focus()); } setEditing(row.id);
                        setValues({
                          categoryId: row.categoryId,
                          equipmentName: row.equipmentName,
                          description: row.description ?? "",
                          manufacturer: row.manufacturer ?? "",
                          model: row.model ?? "",
                          unitOfMeasure: row.unitOfMeasure,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button disabled={busy}
                      className="text-slate-600"
                      onClick={() => toggle(row)}
                    >
                      {row.isActive ? "Archive" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} label="items" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
    </div>
  );
}
