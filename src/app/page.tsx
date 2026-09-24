import Link from "next/link";
import { ArrowRight, FlaskConical, ShieldCheck, Boxes, ClipboardList } from "lucide-react";

const areas = [
  { icon: Boxes, title: "Equipment inventory", text: "Catalog equipment and track each physical asset by code and QR identification." },
  { icon: ClipboardList, title: "Borrowing and custody", text: "Request equipment, review approvals, record release, and process individual returns." },
  { icon: ShieldCheck, title: "Institutional accountability", text: "Keep borrowing history, condition records, notifications, and audit events in one place." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="rounded-xl bg-teal-900 p-2 text-white"><FlaskConical size={22} /></span><span>LSMS</span></Link>
          <Link href="/login" className="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Sign in</Link>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-teal-800">Research and Laboratory Services Center</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Laboratory Science Management System</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">A shared workspace for laboratory equipment, borrowing, custody, and accountability.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-teal-900 px-5 py-3 font-medium text-white hover:bg-teal-800">Open LSMS <ArrowRight size={18} /></Link>
          <Link href="/register" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium hover:bg-slate-100">Register an account</Link>
        </div>
      </section>
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 md:grid-cols-3">
          {areas.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-slate-200 p-6"><Icon className="mb-5 text-teal-800" size={26} /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
