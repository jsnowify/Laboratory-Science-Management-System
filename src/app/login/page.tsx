"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AuthFrame, FormField, inputClass, primaryClass } from "@/components/auth/auth-frame";
import { apiRequest } from "@/lib/api/client";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";

type Profile = { role: "super_admin" | "admin" | "student_faculty"; accountStatus: string };
const loginInput = z.object({ email: z.string().trim().pipe(z.email().max(255)), password: z.string().min(1).max(128) });
const loginProfile = z.object({ role: z.enum(["super_admin", "admin", "student_faculty"]), accountStatus: z.enum(["pending", "active", "suspended", "archived"]) });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const credentials = loginInput.safeParse({ email, password });
    if (!credentials.success) { setError("Enter a valid email address and password."); return; }
    setBusy(true); setError("");
    try {
      const result = await authClient.signIn.email(credentials.data);
      if (result.error) { setError("Sign in failed. Check your email and password, then try again."); return; }
      const profile = loginProfile.parse(await apiRequest<Profile>("/api/v1/me/"));
      const destination = profile.accountStatus !== "active" ? "/pending/" : profile.role === "super_admin" ? "/super-admin/" : profile.role === "admin" ? "/admin/" : "/portal/";
      router.push(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "ApiError" ? cause.message : "Sign in could not be completed. Try again.");
    } finally { setBusy(false); }
  }

  return <AuthFrame title="Sign in" subtitle="Use your LSMS account.">
    <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
      <FormField id="email" label="Institutional email"><input id="email" type="email" autoComplete="email" inputMode="email" placeholder="name@institution.edu" required className={`${inputClass} auth-input`} value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>
      <FormField id="password" label="Password"><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required className={`${inputClass} auth-input pr-12`} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-[#627367] hover:text-[#174d38]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div></FormField>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryClass} auth-submit w-full`}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={18} aria-hidden="true" /></>}</button>
    </form>
    <div className="mt-8 border-t border-[#e5ece3] pt-6"><p className="text-center text-sm text-[#647367]">New student or faculty member? <Link href="/register/" className="font-semibold text-[#17633e] underline decoration-transparent underline-offset-4 hover:decoration-current">Create an account</Link></p><p className="mt-5 flex items-start gap-2 rounded-xl bg-[#f2f6f0] p-3 text-xs leading-5 text-[#415c48]"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-[#38734b]" aria-hidden="true" /> Your account must be activated by a laboratory administrator before you can access the workspace.</p></div>
  </AuthFrame>;
}
