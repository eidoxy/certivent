import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// UX redirects only -- not a security boundary. Pages and Route Handlers guard themselves.
export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const toLogin = () => {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  };
  if (pathname.startsWith("/admin")) {
    if (!user) return toLogin();
    if (user.role !== "ADMIN") return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (pathname.startsWith("/my-events") && !user) return toLogin();
  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/my-events", "/login", "/register"] };
