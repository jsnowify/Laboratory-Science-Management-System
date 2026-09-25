"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { CardLoadingSkeleton } from "@/components/ui/loading-skeleton";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { inputClass } from "@/components/auth/auth-frame";
import { ArrowUpRight, Boxes, Search } from "lucide-react";

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
        className="workspace-toolbar"
      >
        <div className="relative min-w-[190px] flex-1 sm:max-w-md">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#52725b]"
            aria-hidden="true"
          />
          <input
            aria-label="Search equipment"
            className={`${inputClass} pl-10`}
            placeholder="Search equipment"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="ui-button-secondary">Search</button>
      </form>
      <p className="text-sm text-[#526b59]">
        Availability can change. Your equipment is reserved after an
        administrator approves and allocates your request.
      </p>
      {error && (
        <ErrorNotice
          message={error}
          onRetry={() => {
            setLoading(true);
            setRetryVersion((value) => value + 1);
          }}
        />
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CardLoadingSkeleton label="Loading equipment" />
          <CardLoadingSkeleton label="Loading equipment" />
          <CardLoadingSkeleton label="Loading equipment" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {search
            ? "No equipment matches your search. Try a different keyword."
            : "No equipment is available to browse yet. Check back after the laboratory adds equipment."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="workspace-card flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e9f3e9] text-[#366e4a]">
                  <Boxes size={23} aria-hidden="true" />
                </span>
                <span className="rounded-full border border-[#d8e8d8] bg-[#f3f8f2] px-3 py-1 text-xs font-semibold text-[#2b6743]">
                  {item.availableUnits} available
                </span>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-[#213f2e]">
                {item.equipmentName}
              </h2>
              {item.description && (
                <p className="mt-2 text-sm leading-6 text-[#566d5c]">
                  {item.description}
                </p>
              )}
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#f6f9f5] p-4 text-sm">
                <div>
                  <dt className="text-xs text-[#526b59]">Available now</dt>
                  <dd className="mt-1 text-lg font-semibold text-[#245a3b]">
                    {item.availableUnits}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#526b59]">Physical assets</dt>
                  <dd className="mt-1 text-lg font-semibold text-[#284534]">
                    {item.totalUnits}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/portal/requests/new/?equipment=${item.id}`}
                className="mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-[#e8eee7] pt-4 text-sm font-semibold text-[#245a3b] hover:text-[#143d29]"
              >
                Request this equipment{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        total={total}
        label="equipment types"
        loading={loading}
        onPageChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />
    </div>
  );
}
