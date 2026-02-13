import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith("/admin");
  const isHrPath = pathname.startsWith("/hr");

  const isAdmin = req.cookies.get("rrs_admin_session");
  const isHr = req.cookies.get("rrs_hr_session");

  // 🚫 HR trying to access admin
  if (isAdminPath && !isAdmin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🚫 Admin session accessing HR-only pages (optional)
  if (isHrPath && !isHr) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}