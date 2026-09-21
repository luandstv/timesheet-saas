"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();

async function getOrigin() {
  const requestHeaders = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    requestHeaders.get("origin") ??
    "http://localhost:3000"
  );
}

export async function requestPasswordReset(email: string) {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, message: "Informe um e-mail válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/reset-password`,
  });

  if (error) console.error("Password reset request failed", error);
  return {
    ok: true,
    message:
      "Se este e-mail estiver cadastrado, você receberá as instruções para criar uma nova senha.",
  };
}
