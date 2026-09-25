import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { optionalProfile } from "@/lib/api/server";
import { LandingSignOut } from "@/components/layout/landing-sign-out";

const features = [
  {
    icon: ClipboardList,
    title: "Request equipment",
    description:
      "Browse available equipment and submit a borrowing request for laboratory work.",
  },
  {
    icon: PackageCheck,
    title: "Follow every handover",
    description:
      "See the status of requests, equipment in your custody, and return records.",
  },
  {
    icon: ShieldCheck,
    title: "Keep clear records",
    description:
      "Laboratory staff can review requests, manage inventory, and track accountability.",
  },
];

export default async function Home() {
  const profile = await optionalProfile();
  const signedIn = profile !== null;
  const workspace =
    profile?.accountStatus !== "active"
      ? "/pending/"
      : profile.role === "super_admin"
        ? "/super-admin/"
        : profile.role === "admin"
          ? "/admin/"
          : "/portal/";
  return (
    <main className="landing-page min-h-dvh text-[#263324]">
      <section className="landing-scene relative isolate flex min-h-dvh flex-col overflow-hidden px-5 text-center sm:px-8">
        <header className="relative z-20 mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 border-b border-[#425438]/15 bg-[#fcfaee]/20 px-1 backdrop-blur-[6px] sm:px-4 lg:px-8">
          <Link
            href="/"
            aria-label="LSMS home"
            className="inline-flex min-h-11 items-center"
          >
            <Brand />
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 sm:gap-7"
          >
            {signedIn ? (
              <>
                <span
                  className="hidden max-w-44 truncate text-sm font-medium text-[#2c382b] sm:inline"
                  title={`${profile.firstName} ${profile.lastName}`}
                >
                  {profile.firstName} {profile.lastName}
                </span>
                <LandingSignOut />
                <Link
                  href={workspace}
                  className="ui-button-primary shrink-0 whitespace-nowrap px-4 text-xs sm:px-5 sm:text-sm"
                >
                  {profile.accountStatus === "active"
                    ? "Open dashboard"
                    : "Account status"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login/"
                  className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-sm font-medium text-[#2c382b] hover:underline"
                >
                  Sign in
                </Link>
                <Link
                  href="/register/"
                  className="ui-button-primary shrink-0 whitespace-nowrap px-4 text-xs sm:px-5 sm:text-sm"
                >
                  <span className="sm:hidden">Register</span>
                  <span className="hidden sm:inline">Create account</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </>
            )}
          </nav>
        </header>
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center pb-40 pt-[clamp(4rem,10vh,8rem)] sm:pb-52">
          <h1 className="font-[Georgia,serif] text-[clamp(3.2rem,7vw,7rem)] font-normal leading-[1.02] tracking-[-.07em] text-[#20261c]">
            Manage your lab.
            <br />
            <em className="font-normal text-[#617e29]">Keep work moving.</em>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-[#4e5948] sm:text-lg">
            Equipment, borrowing requests, and returns in one place.
          </p>
          <a
            href="#dashboard-preview"
            className="ui-button-secondary mt-8 min-h-12 w-full px-7 sm:w-auto"
          >
            See the workspace <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section
        aria-labelledby="how-it-works"
        className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24"
      >
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#40591e]">
          One laboratory workspace
        </p>
        <h2
          id="how-it-works"
          className="mt-3 max-w-2xl font-[Georgia,serif] text-[clamp(2.2rem,4vw,3.8rem)] leading-tight tracking-[-.055em]"
        >
          From request to return, stay informed.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-[#e0e7d5] bg-white/80 p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#edf3e5] text-[#426c3c]">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#596755]">
                {description}
              </p>
            </article>
          ))}
        </div>
        <div id="dashboard-preview" className="mt-20 scroll-mt-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#40591e]">
            Workspace preview
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-[Georgia,serif] text-[clamp(2.2rem,4vw,3.8rem)] leading-tight tracking-[-.055em]">
                A clear view of your lab.
              </h2>
              <p className="mt-2 text-sm text-[#596755]">
                Illustrative preview. Your dashboard shows your own live records
                after sign-in.
              </p>
            </div>
          </div>
          <div className="mt-8 overflow-hidden rounded-[15px] border border-[#dce6d8] bg-[#f8faf5] shadow-[0_20px_60px_rgba(34,62,37,.09)]">
            <div className="flex items-center justify-between border-b border-[#e0e9dc] bg-white px-5 py-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#263d2c]">
                <Brand />{" "}
                <span className="ml-2 hidden border-l border-[#dce7d8] pl-4 font-medium sm:inline">
                  Your laboratory portal
                </span>
              </span>
              <span className="rounded-lg bg-[#e8f2e7] px-3 py-1 text-xs font-semibold text-[#2e603d]">
                Overview
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Draft requests", value: "02" },
                  { label: "Approved requests", value: "04" },
                  { label: "Assets in custody", value: "01" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[15px] border border-[#e0e9dc] bg-white p-5"
                  >
                    <span className="text-xs font-medium text-[#58705b]">
                      {item.label}
                    </span>
                    <strong className="mt-4 block font-[Georgia,serif] text-4xl font-normal text-[#23422e]">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="rounded-[15px] border border-[#e0e9dc] bg-white p-5">
                <h3 className="font-[Georgia,serif] text-xl text-[#23422e]">
                  Next steps
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-[#4e6653]">
                  <li className="rounded-lg bg-[#f3f8f1] px-3 py-2">
                    Browse available equipment
                  </li>
                  <li className="rounded-lg bg-[#f3f8f1] px-3 py-2">
                    Continue a draft request
                  </li>
                  <li className="rounded-lg bg-[#f3f8f1] px-3 py-2">
                    Check return dates
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 rounded-[15px] bg-[#eaf0dc] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="font-[Georgia,serif] text-2xl tracking-[-.04em]">
              {signedIn
                ? "Pick up where you left off."
                : "Ready to use the lab?"}
            </h3>
            <p className="mt-1 text-sm text-[#4e6147]">
              {signedIn
                ? "Your requests, equipment, and account details are ready in your workspace."
                : "Students and faculty can request an account. Access begins after administrator approval."}
            </p>
          </div>
          <Link
            href={signedIn ? workspace : "/register/"}
            className="ui-button-primary min-h-12 shrink-0 px-6"
          >
            {signedIn ? "Open your workspace" : "Create an account"}{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <footer className="border-t border-[#e3e8d9] px-5 py-7 text-center text-xs text-[#62705b]">
        LSMS · Laboratory equipment, borrowing, and accountability
      </footer>
    </main>
  );
}
