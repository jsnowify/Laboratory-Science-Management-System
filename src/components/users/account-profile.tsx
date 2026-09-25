"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { profileUpdateInput } from "@lsms/shared";
import { BadgeCheck, IdCard, LockKeyhole, Mail, UserRound } from "lucide-react";
import type { Profile } from "@/lib/api/server";
import { ApiError, apiRequest } from "@/lib/api/client";
import { FormField, inputClass } from "@/components/auth/auth-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFeedback } from "@/components/ui/feedback-provider";

export function AccountProfile({ initial }: { initial: Profile }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ firstName: initial.firstName, middleName: initial.middleName ?? "", lastName: initial.lastName, email: initial.email });
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const name = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const parsed = profileUpdateInput.safeParse(values);
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); return; }
    setBusy(true); setError(""); setFields({});
    try {
      const updated = await apiRequest<Pick<Profile, "firstName" | "middleName" | "lastName" | "email">>("/api/v1/me/", { method: "PATCH", body: parsed.data });
      setProfile((current) => ({ ...current, ...updated }));
      setEditing(false);
      router.refresh();
      toast("Profile updated.");
    } catch (cause) {
      if (cause instanceof ApiError) { setError(cause.message); setFields(cause.fields ?? {}); }
      else setError("Profile could not be updated.");
    } finally { setBusy(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.7fr)]">
    <section aria-labelledby="profile-details" className="ui-panel min-w-0 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7eee6] pb-6"><div><span className="flex size-12 items-center justify-center rounded-xl bg-[#edf4e9] text-[#2d6240]"><UserRound size={24} aria-hidden="true" /></span><h2 id="profile-details" className="mt-4 text-2xl text-[#1c3929]">Account details</h2><p className="mt-1 text-sm text-[#5d715f]">Your registered laboratory identity.</p></div><StatusBadge status={profile.accountStatus} /></div>
      <dl className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
        <div><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-[#526b59]"><UserRound size={16} aria-hidden="true" /> Full name</dt><dd className="mt-2 break-words text-base font-semibold text-[#223e2c]">{name}</dd></div>
        <div><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-[#526b59]"><IdCard size={16} aria-hidden="true" /> Institutional ID</dt><dd className="mt-2 break-words text-base font-semibold text-[#223e2c]">{profile.institutionalId}</dd></div>
        <div><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-[#526b59]"><Mail size={16} aria-hidden="true" /> Email</dt><dd className="mt-2 break-all text-base font-semibold text-[#223e2c]">{profile.email}</dd></div>
        <div><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-[#526b59]"><BadgeCheck size={16} aria-hidden="true" /> {profile.role === "student_faculty" ? "Affiliation" : "Role"}</dt><dd className="mt-2 text-base font-semibold text-[#223e2c]">{profile.role === "student_faculty" ? profile.personType === "student" ? "Student" : "Faculty" : profile.role === "super_admin" ? "Super Admin" : "Admin"}</dd></div>
      </dl>
      <p className="mt-6 text-sm text-[#526b59]">Your role, student or faculty affiliation, and institutional ID are fixed. You can update your name and email.</p>
      {!editing ? <button type="button" className="ui-button-secondary mt-5" onClick={() => setEditing(true)}>Edit name and email</button> : <form onSubmit={save} className="mt-6 border-t border-[#e7eee6] pt-6">
        <h3 className="mb-4 text-lg font-semibold">Edit your details</h3>
        <div className="grid gap-4 sm:grid-cols-2">{(["firstName", "middleName", "lastName", "email"] as const).map((key) => <FormField key={key} id={`profile-${key}`} label={{ firstName: "First name", middleName: "Middle name (optional)", lastName: "Last name", email: "Email" }[key]} error={fields[key]?.[0]}><input id={`profile-${key}`} className={inputClass} type={key === "email" ? "email" : "text"} autoComplete={key === "email" ? "email" : undefined} required={key !== "middleName"} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></FormField>)}</div>
        {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2"><button className="ui-button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button><button type="button" className="ui-button-secondary" onClick={() => { setEditing(false); setError(""); setFields({}); setValues({ firstName: profile.firstName, middleName: profile.middleName ?? "", lastName: profile.lastName, email: profile.email }); }}>Cancel</button></div>
      </form>}
    </section>
    <section aria-labelledby="account-security" className="ui-panel h-fit p-6 sm:p-8"><span className="flex size-12 items-center justify-center rounded-xl bg-[#edf4e9] text-[#2d6240]"><LockKeyhole size={23} aria-hidden="true" /></span><h2 id="account-security" className="mt-4 text-2xl text-[#1c3929]">Account security</h2><p className="mt-2 text-sm leading-6 text-[#526b59]">Update your password if your sign-in details have changed or may be known to someone else.</p><Link href="/account/password/" className="ui-button-secondary mt-6 w-full">Change password</Link></section>
  </div>;
}
