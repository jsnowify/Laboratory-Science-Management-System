"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import { staffInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { FormField, inputClass, primaryClass } from "@/components/auth/auth-frame";

type Department = { id: string; name: string };
const initial = { institutionalId: "", firstName: "", middleName: "", lastName: "", email: "", password: "", departmentId: "" };

export function CreateAdminForm() {
  const [lookupError, setLookupError] = useState("");
  const [retry, setRetry] = useState(0);
  const [values, setValues] = useState(initial);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest<{ data: Department[] }>("/api/v1/departments/", { query: { limit: 100 } }).then((page) => { setDepartments(page.data); setLookupError(""); }).catch(() => setLookupError("Departments could not be loaded. Retry to select a department, or leave it unassigned.")); }, [retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setError(""); setFields({}); setSuccess(false);
    const parsed = staffInput.safeParse({ ...values, departmentId: values.departmentId || undefined });
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); return; }
    setBusy(true);
    try { await apiRequest("/api/v1/staff/", { method: "POST", body: parsed.data }); setSuccess(true); setValues(initial); }
    catch (cause) { if (cause instanceof ApiError) { setError(cause.message); setFields(cause.fields ?? (cause.code === "EMAIL_EXISTS" ? { email: [cause.message] } : cause.code === "INSTITUTIONAL_ID_EXISTS" ? { institutionalId: [cause.message] } : {})); } else setError("Admin account could not be created."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
    <p className="mb-5 text-sm text-slate-600">Create an active Admin to manage accounts and equipment. Use at least 12 characters with uppercase, lowercase, a number, and a special character. Share the initial password securely with the staff member and ask them to change it after sign in.</p>
    {lookupError && <ErrorNotice message={lookupError} onRetry={() => setRetry((value) => value + 1)} />}
    <div className="grid gap-4 sm:grid-cols-2">{(["institutionalId", "firstName", "middleName", "lastName", "email", "password"] as const).map((key) => {
      const labels = { institutionalId: "Institutional ID", firstName: "First name", middleName: "Middle name (optional)", lastName: "Last name", email: "Email", password: "Initial password" };
      return <FormField key={key} id={key} label={labels[key]} error={fields[key]?.[0]}><input id={key} className={inputClass} type={key === "email" ? "email" : key === "password" ? "password" : "text"} autoComplete={key === "password" ? "new-password" : key === "email" ? "email" : undefined} required={key !== "middleName"} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></FormField>;
    })}
      <div className="sm:col-span-2"><FormField id="departmentId" label="Department (optional)" error={fields.departmentId?.[0]}><select id="departmentId" className={inputClass} value={values.departmentId} onChange={(event) => setValues({ ...values, departmentId: event.target.value })}><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></FormField></div>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">Admin account created.</p>}
    <button type="submit" disabled={busy} className={`${primaryClass} mt-5 w-auto`}>{busy ? "Creating…" : "Create Admin"}</button>
  </form>;
}
