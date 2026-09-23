import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { authRouteRedirect } from "@/lib/auth-route-policy";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  console.log("Proxy:", pathname);

  if (
    pathname.startsWith("_next") ||
    pathname.startsWith("/well-know") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const destination = authRouteRedirect(pathname, Boolean(user));

  if (destination === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    const redirectResponse = NextResponse.redirect(url);

    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.delete(cookie.name);
      }
    });

    return redirectResponse;
  }

  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
