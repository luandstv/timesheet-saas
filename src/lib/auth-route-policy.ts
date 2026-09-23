const publicRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

const guestOnlyRoutes = new Set(["/login", "/register"]);

export function authRouteRedirect(pathname: string, authenticated: boolean) {
  if (!authenticated && !publicRoutes.has(pathname)) return "/login";
  if (authenticated && guestOnlyRoutes.has(pathname)) return "/dashboard";
  return null;
}

export function authCallbackDestination(next: string | null) {
  return next === "/reset-password" ? "/reset-password" : "/dashboard";
}

export function authCallbackErrorDestination(next: string | null) {
  return next === "/reset-password"
    ? "/reset-password?error=link"
    : "/login?error=callback";
}
