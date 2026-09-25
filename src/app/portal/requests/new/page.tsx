import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequestForm } from "@/components/borrowing/request-form";
import { requirePageRole, serverApi } from "@/lib/api/server";

type Draft = {
  id: string;
  purpose: string;
  requestedBorrowAt: string;
  requestedDueAt: string;
  status: string;
  items: { equipmentCatalogId: string; quantityRequested: number }[];
};

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ equipment?: string; edit?: string }>;
}) {
  const profile = await requirePageRole("student_faculty");
  const params = await searchParams;
  const draft =
    params.edit && /^[0-9a-f-]{36}$/i.test(params.edit)
      ? await serverApi<Draft>(`/api/v1/borrow-requests/${params.edit}/`)
      : undefined;
  return (
    <DashboardShell
      profile={profile}
      title={draft ? "Edit borrowing draft" : "New borrowing request"}
    >
      {draft && draft.status !== "draft" ? (
        <p className="rounded-xl bg-white p-6 text-sm text-slate-600">
          This request can no longer be edited.
        </p>
      ) : (
        <RequestForm selectedEquipment={params.equipment} draft={draft} />
      )}
    </DashboardShell>
  );
}
