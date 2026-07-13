import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Auth.js uses the Prisma adapter + database session strategy, which needs
// Node.js APIs — run middleware on the Node.js runtime instead of Edge.
export const runtime = "nodejs";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected = req.nextUrl.pathname.startsWith("/projects");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/projects/:path*"],
};
