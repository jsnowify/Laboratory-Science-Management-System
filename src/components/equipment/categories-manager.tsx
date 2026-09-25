"use client";
import { LoadingBars } from "@/components/ui/loading-skeleton";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { categoryInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";

type Category = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export function CategoriesManager() {
  const { confirm, toast } = useFeedback();
  const editor = useRef<HTMLDetailsElement>(null);
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Category[]; total: number }>(
      "/api/v1/equipment/categories/",
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
              : "Categories could not be loaded.",
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
    const parsed = categoryInput.safeParse({ name, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        `/api/v1/equipment/categories/${editing ? `${editing}/` : ""}`,
        { method: editing ? "PATCH" : "POST", body: parsed.data },
      );
      setName("");
      setDescription("");
      setEditing(null);
      setVersion((value) => value + 1);
      toast(`Category ${editing ? "updated" : "created"}.`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Category could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Category) {
    if (busy) return;
    const verb = row.isActive ? "Deactivate" : "Reactivate";
    if (
      !(await confirm({
        title: `${verb} ${row.name}?`,
        description: row.isActive
          ? "This category will no longer be offered for new equipment. Existing records remain."
          : "This category will be available for equipment again.",
        confirmLabel: `${verb} category`,
        tone: row.isActive ? "danger" : "primary",
      }))
    )
      return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/equipment/categories/${row.id}/`, {
        method: "PATCH",
        body: { isActive: !row.isActive },
      });
      setVersion((value) => value + 1);
      toast(`Category ${row.isActive ? "deactivated" : "reactivated"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Category could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Search categories"
          className={`${inputClass} max-w-sm`}
          placeholder="Search categories"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="ui-button-secondary">Search</button>
      </form>
      <details ref={editor} className="ui-panel">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-green-800">
          {editing ? "Edit category" : "Add category"}
        </summary>
        <form onSubmit={save} className="border-t border-slate-200 p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">
            {editing ? "Edit category" : "Add category"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="category-name" label="Name">
              <input
                id="category-name"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </FormField>
            <FormField id="category-description" label="Description">
              <input
                id="category-description"
                className={inputClass}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={`${primaryClass} w-auto`} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add category"}
            </button>
            {editing && (
              <button
                type="button"
                className="ui-button-secondary"
                onClick={() => {
                  setEditing(null);
                  setName("");
                  setDescription("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </details>
      {error && (
        <ErrorNotice
          message={error}
          onRetry={() => {
            setLoading(true);
            setRetryVersion((value) => value + 1);
          }}
        />
      )}
      <div
        className="ui-table-scroll"
        role="region"
        aria-label="Records table; scroll horizontally for more columns"
        tabIndex={0}
        aria-busy={loading}
      >
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Name
              </th>
              <th scope="col" className="px-4 py-3">
                Description
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center">
                  <LoadingBars />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[#526b59]">
                  {error
                    ? "Categories could not be loaded. Try again above."
                    : search
                      ? "No categories match this search. Try another name."
                      : "No categories yet. Open Add category above to create the first one."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={row.isActive ? "active" : "inactive"}
                    />
                  </td>
                  <td className="space-x-3 px-4 py-3">
                    <button
                      disabled={busy}
                      className="font-medium text-green-800"
                      onClick={() => {
                        if (editor.current) {
                          editor.current.open = true;
                          editor.current.scrollIntoView({ block: "start" });
                          requestAnimationFrame(() =>
                            editor.current
                              ?.querySelector<HTMLInputElement>("input, select")
                              ?.focus(),
                          );
                        }
                        setEditing(row.id);
                        setName(row.name);
                        setDescription(row.description ?? "");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      className="text-slate-600"
                      onClick={() => toggle(row)}
                    >
                      {row.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        total={total}
        label="categories"
        loading={loading}
        onPageChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />
    </div>
  );
}
