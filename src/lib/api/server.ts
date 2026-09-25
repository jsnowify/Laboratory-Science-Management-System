import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { apiPath } from "./client";
import { z } from "zod";

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

export const profileSchema: z.ZodType<Profile> = z.object({
  id: z.uuid(),
  institutionalId: z.string(),
  role: z.enum(["super_admin", "admin", "student_faculty"]),
  personType: z.enum(["student", "faculty"]).nullable(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  email: z.email(),
  accountStatus: z.enum(["pending", "active", "suspended", "archived"]),
});

export async function optionalProfile(): Promise<Profile | null> {
  const incoming = await headers();
  const cookie = incoming.get("cookie");
  if (!cookie) return null;
  const origin = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
  try {
    const response = await fetch(`${origin}/api/v1/me/`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return null;
    return profileSchema.parse(await response.json());
  } catch {
    return null;
  }
}

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
