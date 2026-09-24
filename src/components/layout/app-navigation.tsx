"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AlarmClock, BarChart3, BookOpen, Boxes, Building2, ClipboardList,
  FileCheck2, FlaskConical, History, House, Menu, PackageCheck, ScanLine,
  ShieldCheck, UserPlus, UserRound, Users, X, type LucideIcon,
} from "lucide-react";
import { SignOut } from "./sign-out";

type Role = "super_admin" | "admin" | "student_faculty";
type Item = { label: string; href: string; icon: LucideIcon };
type Group = { label: string; items: Item[] };

const navigation: Record<Role, Group[]> = {
  super_admin: [
    { label: "Workspace", items: [{ label: "Overview", href: "/super-admin/", icon: House }, { label: "Requests", href: "/super-admin/requests/", icon: ClipboardList }, { label: "Custody", href: "/super-admin/custody/", icon: PackageCheck }, { label: "Overdue", href: "/super-admin/overdue/", icon: AlarmClock }] },
    { label: "Records", items: [{ label: "Accountability", href: "/super-admin/accountability/", icon: ShieldCheck }, { label: "ISO requisitions", href: "/super-admin/iso/", icon: FileCheck2 }, { label: "Reports", href: "/super-admin/reports/", icon: BarChart3 }] },
    { label: "Organization", items: [{ label: "Colleges", href: "/super-admin/organization/colleges/", icon: Building2 }, { label: "Courses", href: "/super-admin/organization/courses/", icon: BookOpen }, { label: "Departments", href: "/super-admin/organization/departments/", icon: Boxes }, { label: "Create Admin", href: "/super-admin/staff/new/", icon: UserPlus }] },
  ],
  admin: [
    { label: "Workspace", items: [{ label: "Overview", href: "/admin/", icon: House }, { label: "User accounts", href: "/admin/users/", icon: Users }, { label: "Equipment", href: "/admin/equipment/", icon: Boxes }] },
    { label: "Insights", items: [{ label: "Analytics", href: "/admin/analytics/", icon: BarChart3 }, { label: "Reports", href: "/admin/reports/", icon: FileCheck2 }] },
  ],
  student_faculty: [
    { label: "Borrowing", items: [{ label: "Overview", href: "/portal/", icon: House }, { label: "Browse equipment", href: "/portal/equipment/", icon: ScanLine }, { label: "My requests", href: "/portal/requests/", icon: ClipboardList }, { label: "Current custody", href: "/portal/custody/", icon: PackageCheck }] },
    { label: "My records", items: [{ label: "History", href: "/portal/history/", icon: History }, { label: "Accountability", href: "/portal/accountability/", icon: ShieldCheck }, { label: "Profile", href: "/portal/profile/", icon: UserRound }] },
  ],
};
const roleLabels: Record<Role, string> = { super_admin: "Super Admin", admin: "Admin", student_faculty: "Student / Faculty" };

function NavigationContent({ role, name, email, close }: { role: Role; name: string; email: string; close?: () => void }) {
  const pathname = usePathname();
  return <>
    <Link href="/workspace/" onClick={close} className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-5 text-[var(--primary)]">
      <span className="grid size-9 place-items-center rounded-lg bg-green-800 text-white"><FlaskConical size={20} aria-hidden="true" /></span>
      <span><strong className="block text-base leading-5">LSMS</strong><small className="block text-xs font-medium text-slate-500">Laboratory operations</small></span>
    </Link>
    <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
      {navigation[role].map((group) => <div key={group.label} className="mb-5">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">{group.label}</p>
        <ul className="space-y-0.5">{group.items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/super-admin/" && href !== "/admin/" && href !== "/portal/" && pathname.startsWith(href));
          return <li key={href}><Link href={href} onClick={close} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-green-50 text-green-900 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-green-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}
          </Link></li>;
        })}</ul>
      </div>)}
    </nav>
    <div className="border-t border-slate-200 px-4 py-4">
      <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      <p className="truncate text-xs text-slate-500">{email}</p>
      <p className="mb-3 mt-1 text-xs text-slate-500">{roleLabels[role]}</p>
      <Link href="/account/password/" onClick={close} className="mb-1 flex min-h-11 items-center rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100">Change password</Link>
      <SignOut />
    </div>
  </>;
}

export function AppNavigation({ role, name, email }: { role: Role; name: string; email: string }) {
  return <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex" aria-label="Application navigation">
    <NavigationContent role={role} name={name} email={email} />
  </aside>;
}

function MobileNavigation({ role, name, email }: { role: Role; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button type="button" className="grid size-11 place-items-center rounded-lg border border-slate-200 text-slate-700 md:hidden" aria-label="Open navigation"><Menu size={21} /></button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl outline-none md:hidden" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">LSMS navigation</Dialog.Title>
          <Dialog.Close className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg text-slate-600" aria-label="Close navigation"><X size={20} /></Dialog.Close>
          <NavigationContent role={role} name={name} email={email} close={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}

export function AppHeader({ role, name, email, title, tools }: { role: Role; name: string; email: string; title: string; tools?: ReactNode }) {
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
    <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
      <MobileNavigation role={role} name={name} email={email} />
      <span className="hidden text-sm text-slate-500 sm:inline">{roleLabels[role]}</span>
      <span className="hidden text-slate-300 sm:inline">/</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 md:font-medium">{title}</span>
      {tools}
    </div>
  </header>;
}
