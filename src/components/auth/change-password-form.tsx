"use client";

import { useState, type FormEvent } from "react";
import { strongPassword } from "@lsms/shared";
import { authClient } from "@/lib/auth-client";
import { FormField, inputClass, primaryClass } from "./auth-frame";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    const checked = strongPassword.safeParse(newPassword);
    if (!checked.success) {
      setError(
        checked.error.issues[0]?.message ?? "Choose a stronger password.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a different password.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "Password could not be changed.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed. Other sessions were signed out.");
    } catch {
      setError("Password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm text-slate-600">
        Use at least 12 characters with uppercase, lowercase, a number, and a
        special character.
      </p>
      <FormField id="currentPassword" label="Current password">
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </FormField>
      <FormField id="newPassword" label="New password">
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password">
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-800">
          {success}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className={`${primaryClass} w-full`}
      >
        {busy ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
