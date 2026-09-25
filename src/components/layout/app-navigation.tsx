"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AlarmClock,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ClipboardList,
  ScrollText,
  FileCheck2,
  History,
  House,
  Menu,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { SignOut } from "./sign-out";

type Role = "super_admin" | "admin" | "student_faculty";
type Item = { label: string; href: string; icon: LucideIcon };
type Group = { label: string; items: Item[] };

const navigation: Record<Role, Group[]> = {
  super_admin: [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: "/super-admin/", icon: House },
        { label: "User accounts", href: "/super-admin/users/", icon: Users },
        {
          label: "Requests",
          href: "/super-admin/requests/",
          icon: ClipboardList,
        },
        { label: "Custody", href: "/super-admin/custody/", icon: PackageCheck },
        { label: "Overdue", href: "/super-admin/overdue/", icon: AlarmClock },
      ],
    },
    {
      label: "Records",
      items: [
        {
          label: "Accountability",
          href: "/super-admin/accountability/",
          icon: ShieldCheck,
        },
        {
          label: "ISO requisitions",
          href: "/super-admin/iso/",
          icon: FileCheck2,
        },
        {
          label: "Analytics",
          href: "/super-admin/analytics/",
          icon: BarChart3,
        },
        { label: "Reports", href: "/super-admin/reports/", icon: FileCheck2 },
        { label: "Audit log", href: "/super-admin/audit/", icon: ScrollText },
      ],
    },
    {
      label: "Organization",
      items: [
        {
          label: "Colleges",
          href: "/super-admin/organization/colleges/",
          icon: Building2,
        },
        {
          label: "Courses",
          href: "/super-admin/organization/courses/",
          icon: BookOpen,
        },
        {
          label: "Departments",
          href: "/super-admin/organization/departments/",
          icon: Boxes,
        },
        {
          label: "Create Admin",
          href: "/super-admin/staff/new/",
          icon: UserPlus,
        },
      ],
    },
  ],
  admin: [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: "/admin/", icon: House },
        { label: "User accounts", href: "/admin/users/", icon: Users },
        { label: "Equipment", href: "/admin/equipment/", icon: Boxes },
      ],
    },
    {
      label: "Insights",
      items: [
        { label: "Analytics", href: "/admin/analytics/", icon: BarChart3 },
        { label: "Reports", href: "/admin/reports/", icon: FileCheck2 },
        { label: "Student activity", href: "/admin/audit/", icon: ScrollText },
      ],
    },
  ],
  student_faculty: [
    {
      label: "Borrowing",
      items: [
        { label: "Overview", href: "/portal/", icon: House },
        {
          label: "Browse equipment",
          href: "/portal/equipment/",
          icon: ScanLine,
        },
        {
          label: "My requests",
          href: "/portal/requests/",
          icon: ClipboardList,
        },
        {
          label: "Current custody",
          href: "/portal/custody/",
          icon: PackageCheck,
        },
      ],
    },
    {
      label: "My records",
      items: [
        { label: "History", href: "/portal/history/", icon: History },
        {
          label: "Accountability",
          href: "/portal/accountability/",
          icon: ShieldCheck,
        },
        { label: "Profile", href: "/portal/profile/", icon: UserRound },
      ],
    },
  ],
};
const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  student_faculty: "Student / Faculty",
};

function NavigationContent({
  role,
  personType,
  name,
  email,
  close,
}: {
  role: Role;
  personType: "student" | "faculty" | null;
  name: string;
  email: string;
  close?: () => void;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = navRef.current;
    if (!element) return;
    const key = `lsms-navigation-scroll-${role}-${close ? "mobile" : "desktop"}`;
    const saved = window.sessionStorage.getItem(key);
    if (saved) element.scrollTop = Number(saved) || 0;
    const remember = () =>
      window.sessionStorage.setItem(key, String(element.scrollTop));
    element.addEventListener("scroll", remember, { passive: true });
    return () => {
      remember();
      element.removeEventListener("scroll", remember);
    };
  }, [role, close]);
  return (
    <>
      <Link
        href="/workspace/"
        onClick={close}
        className="flex min-h-[78px] items-center border-b border-[#e8eee8] px-5"
      >
        <Brand />
      </Link>
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-6"
      >
        {navigation[role].map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#526d5a]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/super-admin/" &&
                    href !== "/admin/" &&
                    href !== "/portal/" &&
                    pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[#e9f3e8] font-semibold text-[#245638]" : "text-[#607267] hover:bg-[#f3f7f2] hover:text-[#244734]"}`}
                    >
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[#e8eee8] px-4 py-4">
        <Link
          href={
            role === "student_faculty"
              ? "/portal/profile/"
              : "/account/profile/"
          }
          onClick={close}
          className="block rounded-xl bg-[#f3f7f2] p-3 hover:bg-[#e9f3e8]"
        >
          <p className="truncate text-sm font-semibold text-[#244431]">
            {name}
          </p>
          <p className="truncate text-xs text-[#4b6554]">{email}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#4d6955]">
            {role === "student_faculty"
              ? (personType ?? "Student / faculty")
              : roleLabels[role]}
          </p>
        </Link>
        <Link
          href="/account/password/"
          onClick={close}
          className="mb-1 mt-2 flex min-h-11 items-center rounded-lg px-2 text-sm text-[#607267] hover:bg-[#f3f7f2]"
        >
          Change password
        </Link>
        <SignOut />
      </div>
    </>
  );
}

export function AppNavigation({
  role,
  personType,
  name,
  email,
}: {
  role: Role;
  personType: "student" | "faculty" | null;
  name: string;
  email: string;
}) {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[#e7eee7] bg-white md:flex"
      aria-label="Application navigation"
    >
      <NavigationContent
        role={role}
        personType={personType}
        name={name}
        email={email}
      />
    </aside>
  );
}

function MobileNavigation({
  role,
  personType,
  name,
  email,
}: {
  role: Role;
  personType: "student" | "faculty" | null;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl border border-[#dce9dc] text-[#315943] md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl outline-none md:hidden"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">LSMS navigation</Dialog.Title>
            <Dialog.Close
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg text-slate-600"
              aria-label="Close navigation"
            >
              <X size={20} />
            </Dialog.Close>
            <NavigationContent
              role={role}
              personType={personType}
              name={name}
              email={email}
              close={() => setOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function AppHeader({
  role,
  personType,
  name,
  email,
  title,
  tools,
}: {
  role: Role;
  personType: "student" | "faculty" | null;
  name: string;
  email: string;
  title: string;
  tools?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e4ece4] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNavigation
          role={role}
          personType={personType}
          name={name}
          email={email}
        />
        <span className="hidden text-xs font-semibold uppercase tracking-[.12em] text-[#4e6b58] sm:inline">
          {role === "student_faculty"
            ? (personType ?? "Student / faculty")
            : roleLabels[role]}
        </span>
        <span className="hidden text-[#cbd9ce] sm:inline">/</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#244632]">
          {title}
        </span>
        {tools}
      </div>
    </header>
  );
}
