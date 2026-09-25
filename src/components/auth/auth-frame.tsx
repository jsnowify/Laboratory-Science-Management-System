import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Children, cloneElement, isValidElement, type ReactNode, type HTMLAttributes } from "react";
import { Brand } from "@/components/ui/brand";

export function AuthFrame({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="public-site relative flex min-h-dvh flex-col items-center bg-[#faf9ef] px-3 pb-28 pt-4 sm:px-6 sm:pt-10">
      <section className={`relative grid w-full overflow-hidden rounded-[15px] border border-[#e4e6d7] bg-white shadow-[0_20px_70px_rgba(46,64,39,.08)] lg:grid-cols-[.82fr_1.18fr] ${wide ? "max-w-[1220px]" : "max-w-[1100px]"}`}>
        <aside className="auth-landscape relative hidden min-h-[650px] flex-col overflow-hidden border-r border-[#e4e6d7] p-10 lg:flex xl:p-12">
          <Link href="/" className="inline-flex min-h-11 items-center self-start"><Brand /></Link>
        </aside>
        <div className={`min-w-0 p-6 sm:p-10 ${wide ? "xl:p-12" : "xl:p-14"}`}>
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#436950] hover:text-[#174d38]"><ArrowLeft size={17} aria-hidden="true" /> Back to home</Link>
            <span className="lg:hidden"><Brand /></span>
          </div>
          <div className="mt-8 max-w-[620px]"><h1 className="font-[Georgia,serif] text-[clamp(2.4rem,4vw,3.5rem)] leading-[1.05] tracking-[-.065em] text-[#193b2a]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#627367]">{subtitle}</p></div>
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <section aria-label="How LSMS access works" className={`mt-7 grid w-full gap-3 text-sm leading-6 text-[#526650] sm:grid-cols-3 ${wide ? "max-w-[1220px]" : "max-w-[1100px]"}`}>
        <p className="rounded-[15px] border border-[#e2e9d9] bg-white/70 p-4"><strong className="block text-[#293e2a]">1. Create an account</strong>Students and faculty use their institutional details.</p>
        <p className="rounded-[15px] border border-[#e2e9d9] bg-white/70 p-4"><strong className="block text-[#293e2a]">2. Wait for review</strong>A laboratory administrator activates access.</p>
        <p className="rounded-[15px] border border-[#e2e9d9] bg-white/70 p-4"><strong className="block text-[#293e2a]">3. Manage requests</strong>Browse equipment and follow borrowing activity.</p>
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
      {Children.map(children, (child) => isValidElement<HTMLAttributes<HTMLElement>>(child) && typeof child.type === "string" && ["input", "select", "textarea"].includes(child.type)
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
