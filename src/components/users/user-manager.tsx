"use client";

import { Pagination } from "@/components/ui/pagination";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";

type Status = "pending" | "active" | "suspended" | "archived";
type User = {
  id: string;
  institutionalId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  personType: string | null;
  accountStatus: Status;
};
type Page = { data: User[]; total: number };

export function UserManager() {
  const { confirm, toast } = useFeedback();
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("pending");
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Page>("/api/v1/users/", {
      query: { page, limit: 20, q: search, status },
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
  }, [page, search, status, version, retryVersion]);

  async function change(row: User, next: Exclude<Status, "pending">) {
    if (busy) return;
    const verb = next === "active" ? "Activate" : next === "suspended" ? "Suspend" : "Archive";
    if (!await confirm({ title: `${verb} ${row.firstName} ${row.lastName}?`, description: next === "active" ? "This account will be able to use LSMS according to its role." : next === "suspended" ? "This account will lose access until it is reactivated." : "This account will no longer be active. Its transaction history remains.", confirmLabel: `${verb} account`, tone: next === "active" ? "primary" : "danger" })) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/users/${row.id}/status/`, {
        method: "POST",
        body: { status: next },
      });
      setVersion((value) => value + 1);
      toast(`Account ${next === "active" ? "activated" : next === "suspended" ? "suspended" : "archived"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Account status could not be changed.",
      );
    }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          aria-label="Search users"
          className={`${inputClass} max-w-sm`}
          placeholder="Search name or institutional ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="ui-button-secondary"
          type="submit"
        >
          Search
        </button>
        <select
          aria-label="Account status"
          className={`${inputClass} max-w-44`}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as Status | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </form>
      {error && (
        <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />
      )}
      <div className="ui-table-scroll" role="region" aria-label="Records table; scroll horizontally for more columns" tabIndex={0} aria-busy={loading}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Institutional ID</th>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >{error ? "Records could not be loaded. Try again above." : "No accounts found."}</td>
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
                  <td className="px-4 py-3"><StatusBadge status={row.accountStatus} /></td>
                  <td className="space-x-3 px-4 py-3">
                    {(row.accountStatus === "pending" ||
                      row.accountStatus === "suspended") && (
                      <button disabled={busy}
                        className="font-medium text-green-800 hover:underline"
                        onClick={() => change(row, "active")}
                      >
                        Activate
                      </button>
                    )}
                    {row.accountStatus === "active" && (
                      <button disabled={busy}
                        className="font-medium text-amber-800 hover:underline"
                        onClick={() => change(row, "suspended")}
                      >
                        Suspend
                      </button>
                    )}
                    {row.accountStatus !== "archived" &&
                      row.accountStatus !== "pending" && (
                        <button disabled={busy}
                          className="font-medium text-slate-600 hover:underline"
                          onClick={() => change(row, "archived")}
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
      <Pagination page={page} total={total} label="accounts" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
    </div>
  );
}
