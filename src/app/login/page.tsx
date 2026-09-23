import { AuthPage } from "@/components/auth/auth-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const loginNotice =
    params?.reset === "success"
      ? "reset-success"
      : params?.error === "callback"
        ? "callback-error"
        : undefined;

  return <AuthPage initialMode="login" loginNotice={loginNotice} />;
}
