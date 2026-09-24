import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function ForbiddenPage() {
  return <AuthFrame title="Access is restricted" subtitle="Your account does not have access to this record or action."><p className="mb-5 text-sm leading-6 text-slate-600">Contact your laboratory administrator if you need access.</p><Link href="/workspace/" className="ui-button-primary">Go to your dashboard</Link></AuthFrame>;
}
