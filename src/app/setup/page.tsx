"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { setupInput } from "@lsms/shared";
import {
  AuthFrame,
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";
import { apiRequest, ApiError } from "@/lib/api/client";

type Values = {
  institutionalId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  setupToken: string;
};
const initial: Values = {
  institutionalId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  setupToken: "",
};

export default function SetupPage() {
  const [retryVersion, setRetryVersion] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [values, setValues] = useState(initial);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest<{ available: boolean }>("/api/v1/setup/status/")
      .then((result) => {
        setAvailable(result.available);
        setError("");
      })
      .catch(() => {
        setAvailable(false);
        setError(
          "We could not check setup availability. Try again or contact the person managing this installation.",
        );
      });
  }, [retryVersion]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setFields({});
    const parsed = setupInput.safeParse(values);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/v1/setup/", { method: "POST", body: parsed.data });
      setComplete(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields ?? {});
      } else setError("Setup could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="First Super Admin setup"
      subtitle="This one-time form is available only before an active Super Admin exists."
    >
      {available === null ? (
        <p className="text-sm text-slate-600">Checking setup status…</p>
      ) : complete ? (
        <p className="text-sm text-slate-700">
          Account created.{" "}
          <Link href="/login/" className="font-medium text-green-800 underline">
            Sign in
          </Link>
          , then change the temporary password immediately using the Change
          password link in the account menu.
        </p>
      ) : !available ? (
        <p className="text-sm text-slate-700">
          Setup is unavailable.{" "}
          <Link href="/login/" className="font-medium text-green-800 underline">
            Go to sign in
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {(
            [
              "institutionalId",
              "firstName",
              "middleName",
              "lastName",
              "email",
              "password",
              "setupToken",
            ] as const
          ).map((key) => {
            const labels = {
              institutionalId: "Institutional ID",
              firstName: "First name",
              middleName: "Middle name (optional)",
              lastName: "Last name",
              email: "Email address",
              password: "Password",
              setupToken: "Setup token",
            };
            return (
              <div
                key={key}
                className={
                  key === "email" || key === "setupToken" ? "sm:col-span-2" : ""
                }
              >
                <FormField
                  id={key}
                  label={labels[key]}
                  error={fields[key]?.[0]}
                >
                  <input
                    id={key}
                    className={inputClass}
                    type={
                      key === "email"
                        ? "email"
                        : key === "password" || key === "setupToken"
                          ? "password"
                          : "text"
                    }
                    required={key !== "middleName"}
                    autoComplete={
                      key === "password" ? "new-password" : undefined
                    }
                    value={values[key]}
                    onChange={(event) =>
                      setValues({ ...values, [key]: event.target.value })
                    }
                  />
                </FormField>
                {key === "setupToken" && (
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Enter the private setup token provided by the person who
                    installed LSMS. This is separate from your account password.
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-sm text-amber-800 sm:col-span-2">
            If you are using a temporary password, change it immediately after
            your first sign in.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`${primaryClass} sm:col-span-2`}
          >
            {busy ? "Creating account…" : "Create first Super Admin"}
          </button>
        </form>
      )}
      {error && !available && (
        <div role="alert" className="mt-4 space-y-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            className="ui-button-secondary"
            onClick={() => {
              setAvailable(null);
              setRetryVersion((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </AuthFrame>
  );
}
