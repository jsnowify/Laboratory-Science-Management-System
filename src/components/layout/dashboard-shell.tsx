import type { ReactNode } from "react";
import type { Profile } from "@/lib/api/server";
import { NotificationIndicator } from "@/components/notifications/notification-indicator";
import { AppHeader, AppNavigation } from "./app-navigation";

export function DashboardShell({ profile, title, children }: { profile: Profile; title: string; children: ReactNode }) {
  return <div className="flex min-h-dvh min-w-0 bg-[var(--background)] text-[var(--foreground)]">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:p-4 focus:text-green-900">Skip to content</a>
    <AppNavigation role={profile.role} name={`${profile.firstName} ${profile.lastName}`} email={profile.email} />
    <div className="min-w-0 flex-1">
      <AppHeader role={profile.role} name={`${profile.firstName} ${profile.lastName}`} email={profile.email} title={title} tools={<NotificationIndicator />} />
      <main id="main-content" className="mx-auto w-full max-w-[1500px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">{title}</h1></div>
        {children}
      </main>
    </div>
  </div>;
}
