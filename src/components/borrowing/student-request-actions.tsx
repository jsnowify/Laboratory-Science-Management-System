"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { useFeedback } from "@/components/ui/feedback-provider";

export function StudentRequestActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    if (
      !(await confirm({
        title: "Cancel this borrowing request?",
        description:
          "The request will stop progressing. You can still see it in your history.",
        confirmLabel: "Cancel request",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/borrow-requests/${id}/cancel/`, {
        method: "POST",
      });
      toast("Borrowing request cancelled.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Request could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (status !== "draft" && status !== "submitted") return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
      {status === "draft" && (
        <>
          <Link
            href={`/portal/requests/new/?edit=${id}`}
            className="ui-button-secondary"
          >
            Edit draft
          </Link>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await apiRequest(`/api/v1/borrow-requests/${id}/submit/`, {
                  method: "POST",
                });
                router.refresh();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Request could not be submitted.",
                );
              } finally {
                setBusy(false);
              }
            }}
            className="ui-button-primary"
          >
            Submit request
          </button>
        </>
      )}
      <button disabled={busy} onClick={cancel} className="ui-button-danger">
        Cancel request
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
