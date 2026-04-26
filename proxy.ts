import { NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/types/user-role";

type SessionResponse = {
  user: {
    role?: string;
  };
} | null;

async function getSession(request: NextRequest): Promise<SessionResponse> {
  const sessionURL = new URL("/api/auth/get-session", request.nextUrl.origin);

  const response = await fetch(sessionURL, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);
  const isApiRoute = pathname.startsWith("/api/");
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isUserRoute =
    pathname.startsWith("/user") || pathname.startsWith("/api/user");

  if (!session?.user) {
    if (isApiRoute) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const loginURL = new URL("/auth/login", request.url);
    loginURL.searchParams.set("callbackURL", request.nextUrl.pathname);
    return NextResponse.redirect(loginURL);
  }

  const role = session.user.role;

  const fallbackByRole =
    role === UserRole.ADMIN ? "/admin" : role === UserRole.USER ? "/user" : "/";

  if (isAdminRoute && role !== UserRole.ADMIN) {
    if (isApiRoute) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL(fallbackByRole, request.url));
  }

  if (isUserRoute && role !== UserRole.USER && role !== UserRole.ADMIN) {
    if (isApiRoute) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL(fallbackByRole, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
    "/api/admin/:path*",
    "/api/user/:path*",
  ],
};
