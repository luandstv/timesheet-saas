import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  authCallbackDestination,
  authCallbackErrorDestination,
} from "@/lib/auth-route-policy";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = authCallbackDestination(requestedNext);
  if (!code)
    return NextResponse.redirect(
      new URL(authCallbackErrorDestination(requestedNext), request.url),
    );

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback failed", error);
    return NextResponse.redirect(
      new URL(authCallbackErrorDestination(requestedNext), request.url),
    );
  }
  return NextResponse.redirect(new URL(next, request.url));
}
