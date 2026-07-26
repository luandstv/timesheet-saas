"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import type {
  WorkScheduleFormData,
  SalaryFormData,
} from "@/schemas/settings.schema";
import { use } from "react";

export async function updateWorkSchedule(data: WorkScheduleFormData) {
  const user = await getAuthenticatedUser();
  const prisma = (await import("@/lib/prisma")).default;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        workStartHour: data.workStartHour,
        workStartMinute: data.workStartMinute,
        workEndHour: data.workEndHour,
        workEndMinute: data.workEndMinute,
        dailyHours: data.dailyHours,
        weeklyHours: data.weeklyHours,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar",
    };
  }
}

export async function updateSalary(data: SalaryFormData) {
  const user = await getAuthenticatedUser();
  const prisma = (await import("@/lib/prisma")).default;

  try {
    //buscar config existente ou criar uma nova
    const existing = await prisma.userSalaryConfig.findFirst({
      where: { id: user.id },
      orderBy: { validFrom: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (existing) {
      await prisma.userSalaryConfig.update({
        where: { id: existing.id },
        data: {
          baseSalary: data.baseSalary,
          monthlyHours: data.monthlyHours,
          validFrom: today,
        },
      });
    } else {
      await prisma.userSalaryConfig.create({
        data: {
          userId: user.id,
          baseSalary: data.baseSalary,
          monthlyHours: data.monthlyHours,
          validFrom: today,
        },
      });
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar",
    };
  }
}
