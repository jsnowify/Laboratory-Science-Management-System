"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { registrationInput } from "@lsms/shared";
import { AuthFrame, FormField, inputClass, primaryClass } from "@/components/auth/auth-frame";
import { ApiError, apiRequest } from "@/lib/api/client";

type Option = { id: string; name: string; code: string };
type Page = { data: Option[] };
type Values = { institutionalId: string; firstName: string; middleName: string; lastName: string; email: string; password: string; personType: "student" | "faculty"; collegeId: string; courseId: string };
const initial: Values = { institutionalId: "", firstName: "", middleName: "", lastName: "", email: "", password: "", personType: "student", collegeId: "", courseId: "" };

export default function RegisterPage() {
  const [values, setValues] = useState(initial);
  const [colleges, setColleges] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    apiRequest<Page>("/api/v1/colleges/", { query: { limit: 100 } }).then((page) => setColleges(page.data))
      .catch(() => setError("Colleges could not be loaded. Try again or contact your laboratory administrator."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!values.collegeId) return;
    apiRequest<Page>("/api/v1/courses/", { query: { collegeId: values.collegeId, limit: 100 } })
      .then((page) => setCourses(page.data)).catch(() => setCourses([]));
  }, [values.collegeId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setFields({}); setError("");
    const parsed = registrationInput.safeParse({ ...values, courseId: values.courseId || undefined });
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); return; }
    setBusy(true);
    try { await apiRequest("/api/v1/registration/", { method: "POST", body: parsed.data }); setComplete(true); }
    catch (cause) { if (cause instanceof ApiError) { setError(cause.message); setFields(cause.fields ?? (cause.code === "EMAIL_EXISTS" ? { email: [cause.message] } : cause.code === "INSTITUTIONAL_ID_EXISTS" ? { institutionalId: [cause.message] } : {})); } else setError("Registration could not be completed."); }
    finally { setBusy(false); }
  }

  return <AuthFrame title="Register" subtitle="Student and Faculty accounts require administrator activation before access.">
    {complete ? <p className="text-sm text-slate-700">Your account has been submitted for activation. <Link href="/login/" className="font-medium text-green-800 underline">Sign in</Link> to check its status.</p> :
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {(["institutionalId", "firstName", "middleName", "lastName", "email", "password"] as const).map((key) => {
          const labels = { institutionalId: "Institutional ID", firstName: "First name", middleName: "Middle name (optional)", lastName: "Last name", email: "Email address", password: "Password" };
          return <div key={key} className={key === "email" ? "sm:col-span-2" : ""}>
            <FormField id={key} label={labels[key]} error={fields[key]?.[0]}><input id={key} className={inputClass} type={key === "email" ? "email" : key === "password" ? "password" : "text"} required={key !== "middleName"} autoComplete={key === "password" ? "new-password" : undefined} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></FormField>
          </div>;
        })}
        <FormField id="personType" label="I am a" error={fields.personType?.[0]}><select id="personType" className={inputClass} value={values.personType} onChange={(event) => setValues({ ...values, personType: event.target.value as Values["personType"] })}><option value="student">Student</option><option value="faculty">Faculty</option></select></FormField>
        <FormField id="collegeId" label="College" error={fields.collegeId?.[0]}><select id="collegeId" className={inputClass} value={values.collegeId} disabled={loading} onChange={(event) => { setCourses([]); setValues({ ...values, collegeId: event.target.value, courseId: "" }); }}><option value="">Choose a college</option>{colleges.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        {values.personType === "student" && <div className="sm:col-span-2"><FormField id="courseId" label="Course" error={fields.courseId?.[0]}><select id="courseId" className={inputClass} value={values.courseId} onChange={(event) => setValues({ ...values, courseId: event.target.value })}><option value="">Choose a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField></div>}
        {!loading && colleges.length === 0 && <p className="text-sm text-amber-800 sm:col-span-2">No active colleges are available yet. Ask the Super Admin to create one before registering.</p>}
        <p className="text-sm text-slate-600 sm:col-span-2">Password: at least 12 characters with uppercase, lowercase, a number, and a special character.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
        <button type="submit" disabled={busy || loading || colleges.length === 0} className={`${primaryClass} sm:col-span-2`}>{busy ? "Submitting…" : "Submit registration"}</button>
      </form>}
    <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link href="/login/" className="font-medium text-green-800 hover:underline">Sign in</Link></p>
  </AuthFrame>;
}
