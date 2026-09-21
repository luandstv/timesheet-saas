"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { TimeEntryService } from "@/services/time-entry.service";
import { ActivityService } from "@/services/activity.service";

const activitySchema = z.object({
  description: z.string().trim().min(3).max(500),
  incidentCode: z.string().trim().max(80).optional().or(z.literal("")),
  activityDate: z.string().min(1),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
});

const requestIdSchema = z.string().uuid();

export async function clockIn(requestId: string, workspaceId: string) {
  const user = await getAuthenticatedUser();

  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success || !requestIdSchema.safeParse(workspaceId).success) {
    return { success: false, error: "Solicitação de ponto inválida" };
  }

  try {
    const result = await TimeEntryService.clockIn(
      user.id,
      parsedRequestId.data,
      workspaceId,
    );
    revalidatePath("/time-entries");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, type: result.type };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar ponto",
    };
  }
}

export type ActivityActionResult = {
  success: boolean;
  error?: string;
};

export async function createActivity(input: unknown): Promise<ActivityActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Confira a descrição, a data e os horários da atividade.",
    };
  }

  try {
    const user = await getAuthenticatedUser();
    const { getWorkspaceContext } = await import("@/lib/workspace-context");
    const { workspace } = await getWorkspaceContext();
    await ActivityService.create(user.id, workspace.id, parsed.data);
    revalidatePath("/time-entries");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível salvar a atividade.",
    };
  }
}

export async function removeActivity(
  activityId: string,
): Promise<ActivityActionResult> {
  if (!z.string().uuid().safeParse(activityId).success) {
    return { success: false, error: "Atividade inválida." };
  }

  try {
    const user = await getAuthenticatedUser();
    const { getWorkspaceContext } = await import("@/lib/workspace-context");
    const { workspace } = await getWorkspaceContext();
    await ActivityService.remove(user.id, workspace.id, activityId);
    revalidatePath("/time-entries");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível remover a atividade.",
    };
  }
}
