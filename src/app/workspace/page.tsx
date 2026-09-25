import { redirect } from "next/navigation";
import { serverApi, type Profile } from "@/lib/api/server";

export default async function WorkspacePage() {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  redirect(
    profile.role === "super_admin"
      ? "/super-admin/"
      : profile.role === "admin"
        ? "/admin/"
        : "/portal/",
  );
}
