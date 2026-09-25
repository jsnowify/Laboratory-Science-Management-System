"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import { staffInput } from "@lsms/shared";
import { ApiError, apiRequest } from "@/lib/api/client";
import { FormField, inputClass, primaryClass } from "@/components/auth/auth-frame";
import { CustomSelect } from "@/components/ui/custom-select";

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

  return <form onSubmit={submit} className="w-full rounded-xl border border-[#dce8dc] bg-white p-5 shadow-sm sm:p-7">
    <div className="mb-6 border-b border-[#e5ede4] pb-5"><h2 className="font-[Georgia,serif] text-2xl text-[#213b2a]">Staff details</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[#526b59]">Create an active Admin to manage accounts and equipment. The initial password needs at least 12 characters, including uppercase and lowercase letters, a number, and a special character. Share it securely and ask the staff member to change it after sign in.</p></div>
    {lookupError && <ErrorNotice message={lookupError} onRetry={() => setRetry((value) => value + 1)} />}
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{(["institutionalId", "firstName", "middleName", "lastName", "email", "password"] as const).map((key) => {
      const labels = { institutionalId: "Institutional ID", firstName: "First name", middleName: "Middle name (optional)", lastName: "Last name", email: "Email", password: "Initial password" };
      return <FormField key={key} id={key} label={labels[key]} error={fields[key]?.[0]}><input id={key} className={inputClass} type={key === "email" ? "email" : key === "password" ? "password" : "text"} autoComplete={key === "password" ? "new-password" : key === "email" ? "email" : undefined} required={key !== "middleName"} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></FormField>;
    })}
      <div className="sm:col-span-2 xl:col-span-3"><FormField id="departmentId" label="Department (optional)" error={fields.departmentId?.[0]}><CustomSelect id="departmentId" label="Department (optional)" value={values.departmentId} placeholder="No department" emptyMessage="No departments have been added yet. You can create this Admin without assigning a department." options={[{ value: "", label: "No department" }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} onValueChange={(value) => setValues({ ...values, departmentId: value })} /></FormField><p className="mt-2 text-sm text-[#526b59]">You can leave this unassigned when no department is available.</p></div>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">Admin account created.</p>}
    <button type="submit" disabled={busy} className={`${primaryClass} mt-5 w-auto`}>{busy ? "Creating…" : "Create Admin"}</button>
  </form>;
}
