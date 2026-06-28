"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { TimeEntryService } from "@/services/time-entry.service";

export async function clockIn() {
  const user = await getAuthenticatedUser();

  try {
    const result = await TimeEntryService.clockIn(user.id);
    revalidatePath("/time-entries");
    return { success: true, type: result.type };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar ponto",
    };
  }
}
