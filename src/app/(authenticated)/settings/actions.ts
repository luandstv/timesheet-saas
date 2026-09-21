"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { dateOnlyStart } from "@/lib/date-only";
import { TIMEZONE } from "@/lib/constants";
import { DateTime } from "luxon";
import {
  profileSchema,
  salarySchema,
  workScheduleSchema,
  type ProfileFormData,
  type WorkScheduleFormData,
  type SalaryFormData,
} from "@/schemas/settings.schema";

export async function updateProfile(data: ProfileFormData) {
  const user = await getAuthenticatedUser();
  const prisma = (await import("@/lib/prisma")).default;
  const parsed = profileSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Confira os dados informados" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone?.trim() || null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/on-call");
    revalidatePath("/reports");
    revalidatePath("/adjustments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar",
    };
  }
}

export async function updateWorkSchedule(data: WorkScheduleFormData) {
  const user = await getAuthenticatedUser();
  const prisma = (await import("@/lib/prisma")).default;
  const parsed = workScheduleSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Confira os dados da jornada informados" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        workStartHour: parsed.data.workStartHour,
        workStartMinute: parsed.data.workStartMinute,
        workEndHour: parsed.data.workEndHour,
        workEndMinute: parsed.data.workEndMinute,
        dailyHours: parsed.data.dailyHours,
        weeklyHours: parsed.data.weeklyHours,
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
  const parsed = salarySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Confira os dados salariais informados" };
  }

  try {
    // Preserve the salary history. Re-saving on the same effective date updates
    // today's draft; a later change creates a new effective record.
    const existing = await prisma.userSalaryConfig.findFirst({
      where: {
        userId: user.id,
        validFrom: { equals: dateOnlyStart(DateTime.now().setZone(TIMEZONE)) },
      },
      orderBy: { validFrom: "desc" },
    });

    const today = dateOnlyStart(DateTime.now().setZone(TIMEZONE));

    if (existing) {
      await prisma.userSalaryConfig.update({
        where: { id: existing.id },
        data: {
          baseSalary: parsed.data.baseSalary,
          monthlyHours: parsed.data.monthlyHours,
          validFrom: today,
        },
      });
    } else {
      await prisma.userSalaryConfig.create({
        data: {
          userId: user.id,
          baseSalary: parsed.data.baseSalary,
          monthlyHours: parsed.data.monthlyHours,
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
