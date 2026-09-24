"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";

type Item = {
  id: string;
  equipmentName: string;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
};

export function PortalCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Item[]; total: number }>("/api/v1/equipment/catalog/", {
      query: { q: search, page, limit: 20 },
      signal: controller.signal,
    })
      .then((result) => {
        setItems(result.data);
        setTotal(result.total);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Equipment could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, page, retryVersion]);
  return (
    <div className="space-y-5">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Search equipment"
          className={`${inputClass} max-w-sm`}
          placeholder="Search equipment"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="ui-button-secondary">
          Search
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Availability can change. Your equipment is reserved after an administrator approves and allocates your request.
      </p>
      {error && (
        <ErrorNotice message={error} onRetry={() => { setLoading(true); setRetryVersion((value) => value + 1); }} />
      )}
      {loading ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-600">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No equipment found.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 className="font-semibold">{item.equipmentName}</h2>
              {item.description && (
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Available now</dt>
                  <dd className="font-semibold text-green-800">
                    {item.availableUnits}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Physical assets</dt>
                  <dd>{item.totalUnits}</dd>
                </div>
              </dl>
              <Link
                href={`/portal/requests/new/?equipment=${item.id}`}
                className="mt-4 inline-block text-sm font-medium text-green-800 hover:underline"
              >
                Request this equipment
              </Link>
            </article>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} label="equipment types" loading={loading} onPageChange={(next) => { setLoading(true); setPage(next); }} />
    </div>
  );
}
