import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/" ||
    pathname.endsWith("/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    /\/[^/]+\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }
  const url = new URL(request.url);
  url.pathname = `${pathname}/`;
  return NextResponse.redirect(url, 308);
}
