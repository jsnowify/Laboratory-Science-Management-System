import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export type RequestDetail = {
  id: string;
  requestNumber: string;
  institutionalId: string;
  firstName: string;
  lastName: string;
  purpose: string;
  requestedBorrowAt: string;
  requestedDueAt: string;
  status: string;
  reviewNotes: string | null;
  rejectionReason: string | null;
  items: {
    id: string;
    equipmentCatalogId: string;
    equipmentName: string;
    quantityRequested: number;
    quantityApproved: number | null;
  }[];
  allocations: {
    id: string;
    borrowRequestItemId: string;
    equipmentAssetId: string;
    assetCode: string;
    allocationStatus: string;
    releaseCondition: string | null;
    releasedAt: string | null;
  }[];
  history: { newStatus: string; changedAt: string; remarks: string | null }[];
};

export function RequestSummary({
  request,
  children,
}: {
  request: RequestDetail;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Request number
            </p>
            <h2 className="text-xl font-semibold">{request.requestNumber}</h2>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Borrower</dt>
            <dd>
              {request.firstName} {request.lastName} · {request.institutionalId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Purpose</dt>
            <dd>{request.purpose}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Borrow date</dt>
            <dd>{new Date(request.requestedBorrowAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Due date</dt>
            <dd>{new Date(request.requestedDueAt).toLocaleString()}</dd>
          </div>
        </dl>
        {request.rejectionReason && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Rejection reason: {request.rejectionReason}
          </p>
        )}
        {request.reviewNotes && (
          <p className="mt-3 text-sm text-slate-600">
            Review notes: {request.reviewNotes}
          </p>
        )}
      </div>
      <div
        className="ui-table-scroll"
        role="region"
        aria-label="Records table; scroll horizontally for more columns"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Equipment
              </th>
              <th scope="col" className="px-4 py-3">
                Requested
              </th>
              <th scope="col" className="px-4 py-3">
                Approved
              </th>
              <th scope="col" className="px-4 py-3">
                Allocated assets
              </th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{item.equipmentName}</td>
                <td className="px-4 py-3">{item.quantityRequested}</td>
                <td className="px-4 py-3">{item.quantityApproved ?? "—"}</td>
                <td className="px-4 py-3">
                  {request.allocations
                    .filter(
                      (allocation) =>
                        allocation.borrowRequestItemId === item.id,
                    )
                    .map((allocation) => allocation.assetCode)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Status history</h2>
        <ol className="mt-4 space-y-3 text-sm">
          {request.history.map((entry, index) => (
            <li
              key={`${entry.changedAt}-${index}`}
              className="flex justify-between gap-3 border-b border-slate-100 pb-3"
            >
              <StatusBadge status={entry.newStatus} />
              <time className="text-slate-500">
                {new Date(entry.changedAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
