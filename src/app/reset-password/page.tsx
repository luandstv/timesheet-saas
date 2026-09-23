import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const invalidLink = (await searchParams)?.error === "link";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || invalidLink) {
    return (
      <AuthShell tabs={null}>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em]">
          Link inválido ou expirado
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Solicite um novo link para criar sua senha.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Solicitar novo link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell tabs={null}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
