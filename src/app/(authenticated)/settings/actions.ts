"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { dateOnlyStart } from "@/lib/date-only";
import { TIMEZONE } from "@/lib/constants";
import { DateTime } from "luxon";
import type {
  WorkScheduleFormData,
  SalaryFormData,
} from "@/schemas/settings.schema";

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
      where: { userId: user.id },
      orderBy: { validFrom: "desc" },
    });

    const today = dateOnlyStart(DateTime.now().setZone(TIMEZONE));

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
