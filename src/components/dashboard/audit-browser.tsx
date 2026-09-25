"use client";
import { LoadingBars } from "@/components/ui/loading-skeleton";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { auditActionLabel, auditDetails, auditRecordLabel, auditRoleLabel } from "@/lib/audit-presentation";
import { CustomSelect } from "@/components/ui/custom-select";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";

type Row = { id: string; action: string; entityType: string; targetLabel: string | null; metadata: unknown; createdAt: string; actorFirstName: string | null; actorLastName: string | null; actorRole: string | null };

export function AuditBrowser({ audience = "all" }: { audience?: "all" | "student_faculty" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Row[]; total: number }>("/api/v1/audit/", { query: { page, limit: 20, q: search, role: audience === "all" ? role : "student_faculty" }, signal: controller.signal })
      .then((result) => { setRows(result.data); setTotal(result.total); setError(""); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Audit records could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, search, role, retry, audience]);
  return <div className="space-y-5">
    <p className="max-w-4xl text-sm leading-6 text-[#526b59]">{audience === "all" ? "See who changed an account, equipment, borrowing request, or organization record and when it happened. This list includes actions by every role." : "See actions recorded by student and faculty accounts, including profile changes and borrowing requests. Admin and Super Admin activity is available only to Super Admins."}</p>
    <form className="workspace-toolbar" onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setLoading(true); setSearch(query); }}>
      <input className="ui-input min-w-[190px] flex-1 sm:max-w-sm" aria-label="Search audit activity" placeholder="Search a person's name" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button className="ui-button-secondary">Search</button>
      {audience === "all" && <CustomSelect id="audit-role" label="Actor role" className="w-full sm:ml-auto sm:max-w-48" value={role} placeholder="All roles" options={[{ value: "", label: "All roles" }, { value: "admin", label: "Admin" }, { value: "student_faculty", label: "Student / Faculty" }, { value: "super_admin", label: "Super Admin" }]} onValueChange={(value) => { setLoading(true); setPage(1); setRole(value); }} />}
    </form>
    {error && <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetry((value) => value + 1); }} />}
    <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Audit activity; scroll horizontally for more columns" aria-busy={loading}><table className="w-full min-w-[780px] text-left text-sm"><thead><tr><th scope="col" className="px-4 py-3">When</th><th scope="col" className="px-4 py-3">Who</th><th scope="col" className="px-4 py-3">What happened</th><th scope="col" className="px-4 py-3">Affected record</th><th scope="col" className="px-4 py-3">Additional details</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-8 text-center"><LoadingBars /></td></tr> : rows.length ? rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-4"><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time></td><td className="px-4 py-4"><strong className="block font-medium">{row.actorFirstName && row.actorLastName ? `${row.actorFirstName} ${row.actorLastName}` : "System"}</strong><span className="text-xs text-[#526b59]">{auditRoleLabel(row.actorRole)}</span></td><td className="px-4 py-4 font-medium">{auditActionLabel(row.action)}</td><td className="max-w-[260px] break-words px-4 py-4">{auditRecordLabel(row.entityType, row.targetLabel)}</td><td className="max-w-[290px] break-words px-4 py-4 text-[#526b59]">{auditDetails(row.metadata) || "—"}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-[#526b59]">{search || role ? "No activity matches these filters. Try a different search or role." : "No actions have been recorded yet. Account and equipment changes will appear here."}</td></tr>}</tbody></table></div>
    <Pagination page={page} total={total} label="actions" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
  </div>;
}
