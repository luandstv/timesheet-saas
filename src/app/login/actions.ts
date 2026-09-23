"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "E-mail ou senha inválidos." };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "Confirme seu e-mail antes de entrar." };
    }
    return { error: "Não foi possível entrar. Tente novamente em instantes." };
  }

  redirect("/dashboard");
}
