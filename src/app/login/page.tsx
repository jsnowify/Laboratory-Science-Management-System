"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame, FormField, inputClass, primaryClass } from "@/components/auth/auth-frame";
import { apiRequest } from "@/lib/api/client";
import { authClient } from "@/lib/auth-client";

type Profile = { role: "super_admin" | "admin" | "student_faculty"; accountStatus: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) { setError(result.error.message ?? "Sign in failed."); return; }
      const profile = await apiRequest<Profile>("/api/v1/me/");
      const destination = profile.accountStatus !== "active" ? "/pending/" : profile.role === "super_admin" ? "/super-admin/" : profile.role === "admin" ? "/admin/" : "/portal/";
      router.push(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally { setBusy(false); }
  }

  return <AuthFrame title="Sign in" subtitle="Use your institutional LSMS account.">
    <form onSubmit={submit} className="space-y-5">
      <FormField id="email" label="Email address"><input id="email" type="email" autoComplete="email" required className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>
      <FormField id="password" label="Password"><input id="password" type="password" autoComplete="current-password" required className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} /></FormField>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryClass} w-full`}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-600">New Student or Faculty member? <Link href="/register/" className="font-medium text-green-800 hover:underline">Register</Link></p>
  </AuthFrame>;
}
