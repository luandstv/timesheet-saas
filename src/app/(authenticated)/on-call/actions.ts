"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { OnCallService } from "@/services/on-call.service";

const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holidayMode: z.enum(["auto", "holiday", "workday"]),
});

export type OnCallActionResult = {
  ok: boolean;
  message: string;
};

export async function saveOnCallDay(input: unknown): Promise<OnCallActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira a data e o tipo do dia." };

  try {
    const { user, workspace } = await getWorkspaceContext();
    await OnCallService.saveDay(user.id, workspace.id, parsed.data);
    revalidatePath("/on-call");
    revalidatePath("/reports");
    return { ok: true, message: "Dia de sobreaviso marcado." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Não foi possível salvar o dia.",
    };
  }
}

export async function removeOnCallDay(date: string): Promise<OnCallActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: "Data inválida." };
  }

  try {
    const { user, workspace } = await getWorkspaceContext();
    await OnCallService.removeDay(user.id, workspace.id, date);
    revalidatePath("/on-call");
    revalidatePath("/reports");
    return { ok: true, message: "Dia removido da escala." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Não foi possível remover o dia.",
    };
  }
}
