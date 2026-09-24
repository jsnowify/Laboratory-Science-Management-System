"use client";

export function Pagination({ page, total, label = "records", loading, onPageChange }: { page: number; total: number; label?: string; loading?: boolean; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return <nav aria-label={`${label} pages`} className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 print:hidden">
    <span aria-live="polite">{total.toLocaleString()} {label}</span>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="ui-button-secondary" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span className="px-1">{page} / {pages}</span>
      <button type="button" className="ui-button-secondary" disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  </nav>;
}
