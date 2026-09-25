import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";
import { Brand } from "@/components/ui/brand";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-[#faf9f2]">
      <header className="border-b border-[#e1eae0] bg-white px-5 py-4 sm:px-8">
        <Link href="/" aria-label="LSMS home">
          <Brand />
        </Link>
      </header>
      <div className="mx-auto grid min-h-[calc(100dvh-77px)] max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_.8fr]">
        <section className="relative overflow-hidden rounded-[15px] border border-[#e1e6d6] bg-[#fffdf3] p-8 shadow-[0_18px_48px_rgba(28,55,32,.07)] sm:p-12">
          <span className="mb-8 inline-flex size-14 items-center justify-center rounded-xl bg-[#eaf3e8] text-[#315b3d]">
            <SearchX size={28} aria-hidden="true" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#47694b]">
            Page not found · 404
          </p>
          <h1 className="mt-4 max-w-lg font-[Georgia,serif] text-5xl leading-[1.05] tracking-[-.06em] text-[#213426] sm:text-6xl">
            That page isn’t here.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#526b59]">
            The address may have changed, the link may be incorrect, or the
            record may no longer be available.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/workspace/" className="ui-button-primary">
              Open your dashboard <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/" className="ui-button-secondary">
              <ArrowLeft size={17} aria-hidden="true" /> Back to home
            </Link>
          </div>
        </section>
        <aside className="rounded-[15px] border border-[#dce8dc] bg-white p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#50735a]">
            Find your way back
          </p>
          <h2 className="mt-3 font-[Georgia,serif] text-2xl text-[#213426]">
            Try one of these steps
          </h2>
          <ol className="mt-5 space-y-4 text-sm leading-6 text-[#526b59]">
            <li className="flex gap-3">
              <span className="font-semibold text-[#315b3d]">01</span>
              <span>Check the address for a typing mistake.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-[#315b3d]">02</span>
              <span>
                Open your dashboard and use the menu to find the page.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-[#315b3d]">03</span>
              <span>
                If the record is missing, ask your laboratory administrator for
                help.
              </span>
            </li>
          </ol>
        </aside>
      </div>
    </main>
  );
}
