"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { createPersonalWorkspace } from "@/services/workspace.service";

export async function register(formData: {
  name: string;
  email: string;
  password: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: data.user!.id,
          email: formData.email,
          name: formData.name,
        },
      });
      await createPersonalWorkspace(tx, data.user!.id);
    });
  } catch (dbError) {
    console.error("erro ao criar usuário no banco", dbError);
    return { error: "Erro ao finalizar cadastro. Tente novamente" };
  }

  redirect("/dashboard");
}
