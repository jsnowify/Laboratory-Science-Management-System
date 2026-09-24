import Link from "next/link";
import { FlaskConical } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="mb-6 inline-flex rounded-xl bg-green-900 p-3 text-white">
          <FlaskConical aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-green-800">
          Research and Laboratory Services Center
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          LSMS
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Laboratory Science Management System
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            href="/login/"
            className="rounded-lg bg-green-900 px-4 py-3 text-center font-medium text-white hover:bg-green-800"
          >
            Sign in
          </Link>
          <Link
            href="/register/"
            className="rounded-lg border border-slate-300 px-4 py-3 text-center font-medium text-slate-900 hover:bg-slate-50"
          >
            Register a Student or Faculty account
          </Link>
        </div>
      </section>
    </main>
  );
}
