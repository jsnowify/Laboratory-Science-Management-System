import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Children, cloneElement, isValidElement, type ReactNode, type HTMLAttributes } from "react";

export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-11 items-center gap-3 font-semibold text-[var(--primary)]"
        >
          <span className="rounded-lg bg-[var(--primary)] p-2 text-white">
            <FlaskConical size={20} />
          </span>
          LSMS
        </Link>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
      >
        {label}
      </label>
      {Children.map(children, (child) => isValidElement<HTMLAttributes<HTMLElement>>(child) && typeof child.type === "string"
        ? cloneElement(child, { "aria-invalid": error ? true : undefined, "aria-describedby": [child.props["aria-describedby"], error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined })
        : child)}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = "ui-input";
export const primaryClass = "ui-button-primary";
