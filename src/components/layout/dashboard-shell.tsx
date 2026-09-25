import type { ReactNode } from "react";
import type { Profile } from "@/lib/api/server";
import { NotificationIndicator } from "@/components/notifications/notification-indicator";
import { AppHeader, AppNavigation } from "./app-navigation";

export function DashboardShell({ profile, title, children }: { profile: Profile; title: string; children: ReactNode }) {
  return <div className="dashboard-app flex min-h-dvh min-w-0 bg-[#f8f8f2] text-[var(--foreground)]">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:p-4 focus:text-green-900">Skip to content</a>
    <AppNavigation role={profile.role} personType={profile.personType} name={`${profile.firstName} ${profile.lastName}`} email={profile.email} />
    <div className="min-w-0 flex-1">
      <AppHeader role={profile.role} personType={profile.personType} name={`${profile.firstName} ${profile.lastName}`} email={profile.email} title={title} tools={<NotificationIndicator />} />
      <main id="main-content" className="mx-auto w-full max-w-[1500px] min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="dashboard-banner mb-7 flex min-h-[138px] items-center overflow-hidden rounded-[15px] border border-[#e7e7d8] px-6 py-8 sm:px-9"><h1 className="font-[Georgia,serif] text-[clamp(2.1rem,3.4vw,3.6rem)] font-normal leading-[1.05] tracking-[-.065em] text-[#243323]">{title}</h1></div>
        {children}
      </main>
    </div>
  </div>;
}
