import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";
import prisma from "./prisma";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}
