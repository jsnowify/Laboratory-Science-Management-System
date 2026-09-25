import { Brand } from "@/components/ui/brand";

export function LoadingBars({ label = "Loading records" }: { label?: string }) {
  return <div role="status" aria-label={label} className="mx-auto grid w-full max-w-3xl gap-3 py-2 text-left"><span className="sr-only">{label}</span><span aria-hidden="true" className="skeleton-bar h-4 w-4/5 rounded-md" /><span aria-hidden="true" className="skeleton-bar h-4 w-2/3 rounded-md" /><span aria-hidden="true" className="skeleton-bar h-4 w-3/4 rounded-md" /></div>;
}

export function CardLoadingSkeleton({ label = "Loading content" }: { label?: string }) {
  return <div role="status" aria-label={label} className="rounded-[15px] border border-[#dce8dc] bg-white p-5 sm:p-7"><span className="sr-only">{label}</span><div aria-hidden="true" className="grid gap-4"><span className="skeleton-bar h-6 w-1/3 rounded-md" /><span className="skeleton-bar h-4 w-4/5 rounded-md" /><span className="skeleton-bar h-4 w-2/3 rounded-md" /><span className="skeleton-bar mt-3 h-20 w-full rounded-xl" /></div></div>;
}

export function PageLoadingSkeleton() {
  return <main className="min-h-dvh bg-[#faf9f2]" aria-busy="true" aria-label="Loading page"><div className="border-b border-[#dce8dc] bg-white px-5 py-4 sm:px-8"><Brand /></div><div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-12"><div role="status" className="sr-only">Loading your workspace</div><div aria-hidden="true" className="skeleton-bar h-44 rounded-[15px] border border-[#dce8dc] sm:h-52" /><div aria-hidden="true" className="grid gap-4 md:grid-cols-3"><div className="skeleton-bar h-32 rounded-[15px]" /><div className="skeleton-bar h-32 rounded-[15px]" /><div className="skeleton-bar h-32 rounded-[15px]" /></div><CardLoadingSkeleton /></div></main>;
}
