"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6">
      <AlertCircle className="text-red-700" size={32} aria-hidden="true" />
      <h1 className="text-2xl font-semibold">This page could not be loaded</h1>
      <p className="text-sm leading-6 text-slate-600">
        Check your connection and try again. If the problem continues, contact
        your laboratory administrator.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="ui-button-primary" onClick={retry}>
          Try again
        </button>
        <Link className="ui-button-secondary" href="/workspace/">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
