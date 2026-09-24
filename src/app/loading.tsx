export default function Loading() {
  return <main className="mx-auto w-full max-w-5xl space-y-6 p-6 sm:p-10" aria-busy="true" aria-label="Loading page"><p role="status" className="text-sm text-slate-600">Loading your workspace…</p><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" /></main>;
}
