"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { TimeEntryService } from "@/services/time-entry.service";

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
