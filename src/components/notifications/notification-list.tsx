"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Pagination } from "@/components/ui/pagination";
import { CardLoadingSkeleton } from "@/components/ui/loading-skeleton";

type Notification = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

export function NotificationList({
  role,
}: {
  role: "super_admin" | "admin" | "student_faculty";
}) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ data: Notification[]; total: number; unreadCount: number }>(
      "/api/v1/notifications/",
      { query: { page, limit: 20 }, signal: controller.signal },
    )
      .then((result) => {
        setRows(result.data);
        setTotal(result.total);
        setUnread(result.unreadCount);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Notifications could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, version, retryVersion]);
  async function mark(path: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest(path, { method: "POST" });
      setVersion((value) => value + 1);
      window.dispatchEvent(new Event("lsms:notifications-read"));
      toast("Notifications updated.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Notification could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="workspace-toolbar flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium text-[#263f2e]">Your updates</h2>
          <p className="text-sm text-[#526b59]" aria-live="polite">
            {unread
              ? `${unread} unread notification${unread === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            disabled={busy}
            onClick={() => mark("/api/v1/notifications/read-all/")}
            className="ui-button-secondary"
          >
            Mark all as read
          </button>
        )}
      </div>
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
        <CardLoadingSkeleton label="Loading notifications" />
      ) : rows.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-[#dce8dc] bg-white p-8 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-[#edf5ed] text-[#315b3d]">
            <Bell size={23} aria-hidden="true" />
          </span>
          <h2 className="font-[Georgia,serif] text-2xl text-[#213b2a]">
            No notifications yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#526b59]">
            Updates about your account and laboratory activity will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-xl border p-5 ${row.readAt ? "border-[#dce8dc] bg-white" : "border-[#adcdb4] bg-[#f0f8ef]"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-48 break-words">
                  <h2 className="font-medium">
                    {row.title}
                    {!row.readAt && (
                      <span className="ml-2 text-xs font-semibold text-green-800">
                        Unread
                      </span>
                    )}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {row.message}
                  </p>
                  <time
                    dateTime={row.createdAt}
                    className="mt-3 block text-xs text-[#425c49]"
                  >
                    {new Date(row.createdAt).toLocaleString()}
                  </time>
                  {row.relatedEntityType === "borrow_requests" &&
                    row.relatedEntityId &&
                    role !== "admin" && (
                      <Link
                        href={`/${role === "super_admin" ? "super-admin" : "portal"}/requests/${row.relatedEntityId}/`}
                        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-green-800 underline"
                      >
                        View request
                      </Link>
                    )}
                </div>
                {!row.readAt && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      mark(`/api/v1/notifications/${row.id}/read/`)
                    }
                    className="ui-button-secondary"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        total={total}
        label="notifications"
        loading={loading}
        onPageChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />
    </div>
  );
}
