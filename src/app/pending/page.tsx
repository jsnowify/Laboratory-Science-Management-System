import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOut } from "@/components/layout/sign-out";
import { serverApi, type Profile } from "@/lib/api/server";

export default async function PendingPage() {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus === "active") redirect("/workspace/");
  const pending = profile.accountStatus === "pending";
  return (
    <AuthFrame
      title={
        pending ? "Account awaiting activation" : "Account access is paused"
      }
      subtitle={
        pending
          ? "An administrator must activate your account before you can use the equipment portal."
          : "Your account is currently unavailable. Contact your laboratory administrator for help."
      }
    >
      <p className="mb-5 text-sm text-slate-600">
        Signed in as {profile.email}.
      </p>
      <Link href="/workspace/" className="ui-button-secondary mb-3 w-full">
        Check account status
      </Link>
      <SignOut />
    </AuthFrame>
  );
}
