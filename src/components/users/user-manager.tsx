"use client";
import { LoadingBars } from "@/components/ui/loading-skeleton";

import { Pagination } from "@/components/ui/pagination";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { Search } from "lucide-react";
import { profileUpdateInput } from "@lsms/shared";
import { ApiError } from "@/lib/api/client";
import { FormField } from "@/components/auth/auth-frame";

type Status = "pending" | "active" | "suspended" | "archived";
type User = {
  id: string;
  institutionalId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  role: string;
  personType: string | null;
  accountStatus: Status;
};
type Page = { data: User[]; total: number };

export function UserManager({
  scope = "admin",
  currentUserId,
}: {
  scope?: "admin" | "super_admin";
  currentUserId?: string;
}) {
  const { confirm, toast } = useFeedback();
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">(
    scope === "admin" ? "pending" : "",
  );
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editValues, setEditValues] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
  });
  const [editFields, setEditFields] = useState<Record<string, string[]>>({});
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Page>("/api/v1/users/", {
      query: {
        page,
        limit: 20,
        q: search,
        status,
        role: scope === "super_admin" ? roleFilter : undefined,
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
              : "Users could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, search, status, roleFilter, scope, version, retryVersion]);

  async function change(row: User, nextStatus: Status = "active") {
    if (busy) return;
    if (
      !(await confirm({
        title: `${nextStatus === "active" ? "Activate" : nextStatus === "suspended" ? "Suspend" : "Archive"} ${row.firstName} ${row.lastName}?`,
        description:
          nextStatus === "active"
            ? "This account will be able to use LSMS."
            : "This account will lose access to LSMS. The action will be recorded in the audit log.",
        confirmLabel: `${nextStatus === "active" ? "Activate" : nextStatus === "suspended" ? "Suspend" : "Archive"} account`,
        tone: nextStatus === "active" ? undefined : "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/users/${row.id}/status/`, {
        method: "POST",
        body: { status: nextStatus },
      });
      setVersion((value) => value + 1);
      toast(
        `Account ${nextStatus === "active" ? "activated" : nextStatus === "suspended" ? "suspended" : "archived"}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Account status could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: User) {
    setEditing(row);
    setEditFields({});
    setError("");
    setEditValues({
      firstName: row.firstName,
      middleName: row.middleName ?? "",
      lastName: row.lastName,
      email: row.email,
    });
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const parsed = profileUpdateInput.safeParse(editValues);
    if (!parsed.success) {
      setEditFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    setError("");
    setEditFields({});
    try {
      await apiRequest(`/api/v1/users/${editing.id}/`, {
        method: "PATCH",
        body: parsed.data,
      });
      setEditing(null);
      setVersion((value) => value + 1);
      toast("Account details updated.");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setEditFields(cause.fields ?? {});
      } else setError("Account details could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="workspace-toolbar"
      >
        <div className="relative min-w-[190px] flex-1 sm:max-w-sm">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#52725b]"
            aria-hidden="true"
          />
          <input
            aria-label="Search users"
            className={`${inputClass} pl-10`}
            placeholder="Search name, email, or institutional ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="ui-button-secondary" type="submit">
          Search
        </button>
        <CustomSelect
          id="account-status"
          label="Account status"
          className="w-full sm:ml-auto sm:max-w-44"
          value={status}
          placeholder="All statuses"
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "archived", label: "Archived" },
          ]}
          onValueChange={(value) => {
            setPage(1);
            setStatus(value as Status | "");
          }}
        />
        {scope === "super_admin" && (
          <CustomSelect
            id="account-role"
            label="Account role"
            className="w-full sm:max-w-44"
            value={roleFilter}
            placeholder="All roles"
            options={[
              { value: "", label: "All roles" },
              { value: "super_admin", label: "Super Admin" },
              { value: "admin", label: "Admin" },
              { value: "student_faculty", label: "Student / faculty" },
            ]}
            onValueChange={(value) => {
              setPage(1);
              setRoleFilter(value);
            }}
          />
        )}
      </form>
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Institutional ID
              </th>
              <th scope="col" className="px-4 py-3">
                Name
              </th>
              <th scope="col" className="px-4 py-3">
                Email
              </th>
              <th scope="col" className="px-4 py-3">
                Type
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
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <LoadingBars />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {error
                    ? "Accounts could not be loaded. Try again above."
                    : search || status || roleFilter
                      ? "No accounts match these filters. Try another search or status."
                      : "No accounts have been created yet."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.institutionalId}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 capitalize">
                    {row.personType ?? row.role.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.accountStatus} />
                  </td>
                  <td className="space-x-3 px-4 py-3">
                    {row.accountStatus === "pending" && (
                      <button
                        disabled={busy}
                        className="font-medium text-green-800 hover:underline"
                        onClick={() => change(row, "active")}
                      >
                        Activate
                      </button>
                    )}
                    {scope === "super_admin" &&
                      row.accountStatus === "pending" && (
                        <button
                          type="button"
                          disabled={busy}
                          className="font-medium text-red-800 hover:underline"
                          onClick={() => change(row, "archived")}
                        >
                          Archive
                        </button>
                      )}
                    {scope === "super_admin" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          className="font-medium text-green-800 hover:underline"
                          onClick={() => startEdit(row)}
                        >
                          Edit details
                        </button>
                        {row.id !== currentUserId &&
                          row.accountStatus === "active" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                className="font-medium text-amber-800 hover:underline"
                                onClick={() => change(row, "suspended")}
                              >
                                Suspend
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                className="font-medium text-red-800 hover:underline"
                                onClick={() => change(row, "archived")}
                              >
                                Archive
                              </button>
                            </>
                          )}
                        {row.accountStatus === "suspended" && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              className="font-medium text-green-800 hover:underline"
                              onClick={() => change(row, "active")}
                            >
                              Reactivate
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="font-medium text-red-800 hover:underline"
                              onClick={() => change(row, "archived")}
                            >
                              Archive
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {scope === "admin" && row.accountStatus !== "pending" && (
                      <span className="text-xs text-slate-500">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {scope === "super_admin" && editing && (
        <form
          onSubmit={saveDetails}
          className="ui-panel p-5"
          aria-label={`Edit ${editing.firstName} ${editing.lastName}`}
        >
          <h2 className="mb-2 text-lg font-semibold">Edit account details</h2>
          <p className="mb-5 text-sm text-[#526b59]">
            Role, student or faculty affiliation, and institutional ID remain
            fixed.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["firstName", "middleName", "lastName", "email"] as const).map(
              (key) => (
                <FormField
                  key={key}
                  id={`user-${key}`}
                  label={
                    {
                      firstName: "First name",
                      middleName: "Middle name (optional)",
                      lastName: "Last name",
                      email: "Email",
                    }[key]
                  }
                  error={editFields[key]?.[0]}
                >
                  <input
                    id={`user-${key}`}
                    className={inputClass}
                    type={key === "email" ? "email" : "text"}
                    required={key !== "middleName"}
                    value={editValues[key]}
                    onChange={(event) =>
                      setEditValues({
                        ...editValues,
                        [key]: event.target.value,
                      })
                    }
                  />
                </FormField>
              ),
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button className="ui-button-primary" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </button>
            <button
              type="button"
              className="ui-button-secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <Pagination
        page={page}
        total={total}
        label="accounts"
        loading={loading}
        onPageChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />
    </div>
  );
}
