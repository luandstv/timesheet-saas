"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { WorkspaceService, requireMember } from "@/services/workspace.service";
import { AdjustmentService } from "@/services/adjustment.service";
import prisma from "@/lib/prisma";

const id = z.string().uuid();
const text = z
  .string()
  .trim()
  .min(10, "Explique o motivo com pelo menos 10 caracteres.")
  .max(2000);
const optionalId = z.preprocess(
  (v) => (v === "" || v === "none" ? undefined : v),
  id.optional(),
);
const role = z.enum(["MANAGER", "COLLABORATOR"]);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const schema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("switch"), workspaceId: id }),
  z.object({ operation: z.literal("create"), name: z.string().trim().min(2).max(80) }),
  z.object({
    operation: z.literal("policy"),
    workspaceId: id,
    allowProvisional: checkbox,
  }),
  z.object({
    operation: z.literal("invite"),
    workspaceId: id,
    email: z.string().trim().email().max(254),
    role,
    managerId: optionalId,
  }),
  z.object({
    operation: z.literal("accept"),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({ operation: z.literal("join"), joinCode: id }),
  z.object({
    operation: z.literal("joinDecision"),
    workspaceId: id,
    requestId: id,
    approve: checkbox,
    managerId: optionalId,
  }),
  z.object({
    operation: z.literal("member"),
    workspaceId: id,
    memberId: id,
    role,
    active: checkbox,
    managerId: optionalId,
  }),
  z.object({
    operation: z.literal("request"),
    workspaceId: id,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetEventId: optionalId,
    type: z.enum(["INSERTION", "MODIFICATION", "DELETION"]),
    entryType: z.enum(["CLOCK_IN", "CLOCK_OUT"]),
    timestamp: z.string().max(30).optional(),
    reason: text,
    forgotten: checkbox,
  }),
  z.object({
    operation: z.literal("decide"),
    workspaceId: id,
    userId: id,
    ids: z.array(id).min(1).max(100),
    decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
    reason: text,
  }),
  z.object({
    operation: z.literal("month"),
    workspaceId: id,
    userId: id,
    month: z.string().regex(/^\d{4}-\d{2}$/),
    reopen: checkbox,
    reason: z.string().trim().max(2000),
  }),
]);

export type ActionResult = { ok?: boolean; message?: string; invitation?: string };

export async function workspaceAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  const data = schema.safeParse({
    ...Object.fromEntries(form),
    ids: form.getAll("ids"),
  });
  if (!data.success)
    return {
      ok: false,
      message: data.error.issues[0]?.message ?? "Confira os campos do formulário.",
    };
  const input = data.data;
  try {
    let select: string | undefined;
    let invitation: string | undefined;
    switch (input.operation) {
      case "switch":
        await requireMember(prisma, input.workspaceId, user.id);
        select = input.workspaceId;
        break;
      case "create":
        select = (await WorkspaceService.createCompany(user.id, input.name)).id;
        break;
      case "policy":
        await WorkspaceService.configure(
          user.id,
          input.workspaceId,
          input.allowProvisional,
        );
        break;
      case "invite":
        invitation = await WorkspaceService.invite(
          user.id,
          input.workspaceId,
          input.email,
          input.role,
          input.managerId,
        );
        break;
      case "accept":
        select = await WorkspaceService.acceptInvite(user.id, user.email, input.token);
        break;
      case "join":
        await WorkspaceService.requestJoin(user.id, input.joinCode);
        break;
      case "joinDecision":
        await WorkspaceService.decideJoin(
          user.id,
          input.workspaceId,
          input.requestId,
          input.approve,
          input.managerId,
        );
        break;
      case "member":
        await WorkspaceService.updateMember(
          user.id,
          input.workspaceId,
          input.memberId,
          input.role,
          input.active,
          input.managerId,
        );
        break;
      case "request":
        await AdjustmentService.request(user.id, input.workspaceId, input);
        break;
      case "decide":
        await AdjustmentService.decide(
          user.id,
          input.workspaceId,
          input.userId,
          input.ids,
          input.decision,
          input.reason,
        );
        break;
      case "month":
        await AdjustmentService.closeMonth(
          user.id,
          input.workspaceId,
          input.userId,
          input.month,
          input.reopen,
          input.reason,
        );
        break;
    }
    if (select)
      (await cookies()).set("jornix-workspace", select, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 31536000,
      });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: invitation
        ? "Convite criado. Compartilhe o código com a pessoa convidada; ele expira em 7 dias."
        : "Alteração salva.",
      invitation,
    };
  } catch (error) {
    // Domain messages have no credentials. Infrastructure details stay on server.
    if (
      error instanceof Error &&
      !error.message.includes("prisma") &&
      !error.message.includes("\n") &&
      error.message.length < 220
    )
      return { ok: false, message: error.message };
    console.error("Workspace operation failed", error);
    return {
      ok: false,
      message: "Não foi possível concluir. Atualize a página e tente novamente.",
    };
  }
}
