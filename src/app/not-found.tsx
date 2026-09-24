import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6"><p className="text-sm font-semibold text-green-800">LSMS · Page not found</p><h1 className="text-2xl font-semibold">We could not find that page</h1><p className="text-sm leading-6 text-slate-600">The link may be incorrect or the record may no longer be available.</p><Link className="ui-button-primary self-start" href="/workspace/">Go to dashboard</Link></main>;
}
