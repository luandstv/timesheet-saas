"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { HoursBudgetService } from "@/services/hours-budget.service";

const id = z.string().uuid();
const month = z.string().regex(/^\d{4}-\d{2}$/);
const minutes = z
  .number()
  .int()
  .min(0)
  .max(31 * 24 * 60 * 100);

export type HoursActionResult = { ok: boolean; message?: string };

async function context() {
  const user = await getAuthenticatedUser();
  const { workspace } = await getWorkspaceContext();
  return { user, workspace };
}

function refreshHours() {
  revalidatePath("/team-hours");
  revalidatePath("/dashboard");
  revalidatePath("/time-entries");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function saveHoursBudget(input: unknown): Promise<HoursActionResult> {
  const parsed = z
    .object({ workspaceId: id, month, contractedMinutes: minutes })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Informe uma competência e um valor válido." };
  try {
    const { user, workspace } = await context();
    if (workspace.id !== parsed.data.workspaceId) throw new Error("Espaço inválido.");
    await HoursBudgetService.configureBudget(
      user.id,
      workspace.id,
      parsed.data.month,
      parsed.data.contractedMinutes,
    );
    refreshHours();
    return { ok: true, message: "Horas contratadas atualizadas." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Não foi possível salvar as horas.",
    };
  }
}

export async function saveHoursAllocations(input: unknown): Promise<HoursActionResult> {
  const parsed = z
    .object({
      workspaceId: id,
      month,
      allocations: z
        .array(z.object({ memberId: id, allocatedMinutes: minutes }))
        .min(1),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira as cotas informadas." };
  try {
    const { user, workspace } = await context();
    if (workspace.id !== parsed.data.workspaceId) throw new Error("Espaço inválido.");
    await HoursBudgetService.updateAllocations(
      user.id,
      workspace.id,
      parsed.data.month,
      parsed.data.allocations,
    );
    refreshHours();
    return { ok: true, message: "Distribuição atualizada e registrada." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível distribuir as horas.",
    };
  }
}

export async function saveHoursRule(input: unknown): Promise<HoursActionResult> {
  const parsed = z
    .object({
      workspaceId: id,
      month,
      memberId: id,
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weekdays: z.array(z.number().int().min(1).max(7)).min(1),
      dailyMinutes: minutes.refine((value) => value > 0),
      shiftLabel: z.string().trim().min(1).max(40),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Confira o período, turno e quantidade diária." };
  try {
    const { user, workspace } = await context();
    if (workspace.id !== parsed.data.workspaceId) throw new Error("Espaço inválido.");
    await HoursBudgetService.createRule(user.id, workspace.id, parsed.data);
    refreshHours();
    return { ok: true, message: "Regra aplicada e colaborador notificado." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Não foi possível aplicar a regra.",
    };
  }
}

export async function saveHoursFeatures(input: unknown): Promise<HoursActionResult> {
  const parsed = z
    .object({
      workspaceId: id,
      hoursControlEnabled: z.boolean(),
      adjustmentsRequireApproval: z.boolean(),
      hoursNotificationsEnabled: z.boolean(),
      hoursAlertsEnabled: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Configuração de recursos inválida." };
  try {
    const { user, workspace } = await context();
    if (workspace.id !== parsed.data.workspaceId) throw new Error("Espaço inválido.");
    await HoursBudgetService.configureFeatures(user.id, workspace.id, {
      hoursControlEnabled: parsed.data.hoursControlEnabled,
      adjustmentsRequireApproval: parsed.data.adjustmentsRequireApproval,
      hoursNotificationsEnabled: parsed.data.hoursNotificationsEnabled,
      hoursAlertsEnabled: parsed.data.hoursAlertsEnabled,
    });
    refreshHours();
    return { ok: true, message: "Recursos atualizados imediatamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os recursos.",
    };
  }
}

export async function changeHoursBudgetStatus(
  input: unknown,
): Promise<HoursActionResult> {
  const parsed = z
    .object({
      workspaceId: id,
      month,
      status: z.enum(["OPEN", "CLOSED"]),
      reason: z.string().trim().max(2000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Informe uma situação válida." };
  try {
    const { user, workspace } = await context();
    if (workspace.id !== parsed.data.workspaceId) throw new Error("Espaço inválido.");
    await HoursBudgetService.setBudgetStatus(
      user.id,
      workspace.id,
      parsed.data.month,
      parsed.data.status,
      parsed.data.reason,
    );
    refreshHours();
    return {
      ok: true,
      message:
        parsed.data.status === "CLOSED"
          ? "Competência fechada."
          : "Competência reaberta.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a competência.",
    };
  }
}
