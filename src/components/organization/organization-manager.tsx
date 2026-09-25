"use client";
import { LoadingBars } from "@/components/ui/loading-skeleton";

import { Pagination } from "@/components/ui/pagination";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { courseInput, departmentInput, organizationInput } from "@lsms/shared";
import {
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomSelect } from "@/components/ui/custom-select";

type Resource = "colleges" | "courses" | "departments";
type Row = {
  id: string;
  code: string | null;
  name: string;
  collegeId?: string;
  isActive: boolean;
};
type Page = { data: Row[]; total: number; page: number; limit: number };
type College = { id: string; name: string };

export function OrganizationManager({ resource }: { resource: Resource }) {
  const { confirm, toast } = useFeedback();
  const editor = useRef<HTMLDetailsElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Page>(`/api/v1/${resource}/`, {
      query: {
        q: search,
        page,
        limit: 20,
        includeInactive: String(includeInactive),
      },
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
              : "Records could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [resource, search, page, includeInactive, version, retryVersion]);
  useEffect(() => {
    if (resource !== "courses") return;
    apiRequest<{ data: College[] }>("/api/v1/colleges/", {
      query: { limit: 100 },
    })
      .then((result) => setColleges(result.data))
      .catch(() => setColleges([]));
  }, [resource]);

  function reset() {
    setEditing(null);
    setCode("");
    setName("");
    setCollegeId("");
    setFields({});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setFields({});
    const value =
      resource === "courses" ? { code, name, collegeId } : { code, name };
    const schema =
      resource === "courses"
        ? courseInput
        : resource === "departments"
          ? departmentInput
          : organizationInput;
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/api/v1/${resource}/${editing ? `${editing}/` : ""}`, {
        method: editing ? "PATCH" : "POST",
        body: parsed.data,
      });
      reset();
      setVersion((value) => value + 1);
      toast(
        `${resource === "colleges" ? "College" : resource === "courses" ? "Course" : "Department"} ${editing ? "updated" : "created"}.`,
      );
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields ?? {});
      } else setError("The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Row) {
    if (busy) return;
    const verb = row.isActive ? "Deactivate" : "Reactivate";
    if (
      !(await confirm({
        title: `${verb} ${row.name}?`,
        description: row.isActive
          ? "It will no longer appear as an active option. Existing records will remain."
          : "It will become available for new records again.",
        confirmLabel: `${verb} ${resource.slice(0, -1)}`,
        tone: row.isActive ? "danger" : "primary",
      }))
    )
      return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/${resource}/${row.id}/`, {
        method: "PATCH",
        body: { isActive: !row.isActive },
      });
      setVersion((value) => value + 1);
      toast(`${row.name} ${row.isActive ? "deactivated" : "reactivated"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The status could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          aria-label={`Search ${resource}`}
          className={`${inputClass} max-w-sm`}
          placeholder="Search by name or code"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="ui-button-secondary">
          Search
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setPage(1);
              setIncludeInactive(event.target.checked);
            }}
          />
          Include inactive
        </label>
      </form>
      <details ref={editor} className="ui-panel">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-green-800">
          {editing ? "Edit record" : "Add record"}
        </summary>
        <form
          onSubmit={submit}
          className="border-t border-slate-200 p-4 sm:p-5"
        >
          <h2 className="mb-4 font-semibold">
            {editing ? "Edit" : "Add"} {resource.slice(0, -1)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="code"
              label={resource === "departments" ? "Code (optional)" : "Code"}
              error={fields.code?.[0]}
            >
              <input
                id="code"
                className={inputClass}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required={resource !== "departments"}
              />
            </FormField>
            <FormField id="name" label="Name" error={fields.name?.[0]}>
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </FormField>
            {resource === "courses" && (
              <FormField
                id="collegeId"
                label="College"
                error={fields.collegeId?.[0]}
              >
                <CustomSelect
                  id="collegeId"
                  label="College"
                  required
                  invalid={Boolean(fields.collegeId)}
                  value={collegeId}
                  placeholder="Choose college"
                  emptyMessage="No colleges yet. Add a college before creating a course."
                  options={colleges.map((college) => ({
                    value: college.id,
                    label: college.name,
                  }))}
                  onValueChange={setCollegeId}
                />
              </FormField>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className={`${primaryClass} w-auto`}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Add record"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="ui-button-secondary"
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
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Code
              </th>
              <th scope="col" className="px-4 py-3">
                Name
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <LoadingBars />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {error
                    ? "Records could not be loaded. Try again above."
                    : "No records yet. Open Add record above to create the first one."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.code ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={row.isActive ? "active" : "inactive"}
                    />
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    <button
                      disabled={busy}
                      type="button"
                      className="font-medium text-green-800 hover:underline"
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
                        setCode(row.code ?? "");
                        setName(row.name);
                        setCollegeId(row.collegeId ?? "");
                        setFields({});
                      }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      type="button"
                      className="font-medium text-slate-600 hover:underline"
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
        label="records"
        loading={loading}
        onPageChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />
    </div>
  );
}
