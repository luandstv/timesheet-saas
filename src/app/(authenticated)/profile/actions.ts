"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isOwnAvatarPath(value: string, userId: string) {
  return value === `${userId}/avatar`;
}

export async function updateProfileAvatar(avatarPath: string | null) {
  const user = await getAuthenticatedUser();

  if (avatarPath !== null && !isOwnAvatarPath(avatarPath, user.id)) {
    return { success: false, error: "A foto de perfil não é válida." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarPath },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/on-call");
  revalidatePath("/reports");
  revalidatePath("/adjustments");
  revalidatePath("/settings");

  return { success: true };
}
