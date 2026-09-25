import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CreateAdminForm } from "@/components/users/create-admin-form";
import { requirePageRole } from "@/lib/api/server";

export default async function CreateAdminPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="Create Admin account">
      <CreateAdminForm />
    </DashboardShell>
  );
}
