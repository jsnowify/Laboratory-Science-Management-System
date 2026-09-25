import { DashboardShell } from "@/components/layout/dashboard-shell";
import Link from "next/link";
import { Overview } from "@/components/dashboard/overview";
import { requirePageRole } from "@/lib/api/server";

export default async function SuperAdminPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="Operations overview">
      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        If this account was created with a temporary password,{" "}
        <Link href="/account/password/" className="font-semibold underline">
          change it now
        </Link>
        .
      </p>
      <Overview
        role="super_admin"
        links={[
          { label: "Review requests", href: "/super-admin/requests/" },
          { label: "Current custody", href: "/super-admin/custody/" },
          { label: "Overdue equipment", href: "/super-admin/overdue/" },
        ]}
      />
    </DashboardShell>
  );
}
