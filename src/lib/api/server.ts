import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { apiPath } from "./client";

export type Profile = {
  id: string;
  institutionalId: string;
  role: "super_admin" | "admin" | "student_faculty";
  personType: "student" | "faculty" | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  accountStatus: "pending" | "active" | "suspended" | "archived";
};

export async function serverApi<T>(path: string): Promise<T> {
  const origin = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const incoming = await headers();
  const response = await fetch(`${origin}${apiPath(path)}`, {
    headers: { cookie: incoming.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login/");
  if (response.status === 403) redirect("/forbidden/");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`LSMS API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function requirePageRole(role: Profile["role"]) {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  if (profile.role !== role) redirect(profile.role === "super_admin" ? "/super-admin/" : profile.role === "admin" ? "/admin/" : "/portal/");
  return profile;
}
