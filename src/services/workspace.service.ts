import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { canReadMember, canReview } from "@/lib/workspace-policy";
import type { Prisma } from "../../generated/prisma/client";

export type Database = Prisma.TransactionClient;
export const publicMember = { id: true, name: true, email: true } as const;

export async function requireMember(
  db: Database,
  workspaceId: string,
  userId: string,
  write = false,
) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!member || member.workspace.archivedAt || (write && !member.active))
    throw new Error("Você não tem acesso ativo a este espaço.");
  return member;
}

export async function requireReview(
  db: Database,
  workspaceId: string,
  actorId: string,
  userId: string,
) {
  const [actor, subject] = await Promise.all([
    requireMember(db, workspaceId, actorId, true),
    requireMember(db, workspaceId, userId),
  ]);
  if (!canReview(actor, subject))
    throw new Error("Você não pode revisar os registros desta pessoa.");
  return { actor, subject };
}

export async function requireRead(
  db: Database,
  workspaceId: string,
  actorId: string,
  userId: string,
) {
  const [actor, subject] = await Promise.all([
    requireMember(db, workspaceId, actorId),
    requireMember(db, workspaceId, userId),
  ]);
  if (!canReadMember(actor, subject))
    throw new Error("Você não pode consultar os registros desta pessoa.");
  return { actor, subject };
}

export async function audit(
  db: Database,
  workspaceId: string,
  actorId: string,
  subjectId: string,
  action: string,
  details: Prisma.InputJsonValue,
) {
  return db.workspaceAudit.create({
    data: { workspaceId, actorId, subjectId, action, details },
  });
}

// Consistent lock order: workspace first, then person (global open punch).
export async function lockWorkspace(db: Database, workspaceId: string) {
  await db.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
}
export async function lockPerson(db: Database, userId: string) {
  await db.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
}

export async function createPersonalWorkspace(db: Database, userId: string) {
  return db.workspace.upsert({
    where: { personalUserId: userId },
    update: {},
    create: {
      id: userId,
      personalUserId: userId,
      name: "Meu espaço",
      kind: "PERSONAL",
      members: { create: { userId, role: "OWNER" } },
    },
  });
}

async function owner(db: Database, workspaceId: string, actorId: string) {
  const member = await requireMember(db, workspaceId, actorId, true);
  if (member.role !== "OWNER" || member.workspace.kind !== "COMPANY")
    throw new Error("Apenas o responsável da empresa pode fazer esta alteração.");
  return member;
}

async function checkManager(
  db: Database,
  workspaceId: string,
  managerId?: string | null,
) {
  if (!managerId) return null;
  const manager = await db.workspaceMember.findFirst({
    where: {
      id: managerId,
      workspaceId,
      active: true,
      role: { in: ["MANAGER", "OWNER"] },
    },
  });
  if (!manager) throw new Error("Escolha um gestor ativo desta empresa.");
  return manager.id;
}

export class WorkspaceService {
  static async leave(actorId: string, workspaceId: string) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        const member = await requireMember(tx, workspaceId, actorId, true);
        if (member.workspace.kind !== "COMPANY")
          throw new Error("O espaço pessoal não pode ser desvinculado.");
        if (member.role === "OWNER")
          throw new Error("O responsável deve arquivar a empresa em vez de sair.");
        const { TimeEntryService } = await import("./time-entry.service");
        const state = await TimeEntryService.getClockState(actorId, tx);
        if (
          state.lastEntry?.type === "CLOCK_IN" &&
          state.lastEntry.timesheet.workspaceId === workspaceId
        )
          throw new Error("Encerre ou ajuste o ponto aberto antes de sair da empresa.");
        await tx.workspaceMember.update({
          where: { id: member.id },
          data: { active: false, managerId: null },
        });
        await audit(tx, workspaceId, actorId, actorId, "MEMBERSHIP_LEFT", {});
        const personal = await createPersonalWorkspace(tx, actorId);
        return personal.id;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async archiveCompany(actorId: string, workspaceId: string) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        const member = await owner(tx, workspaceId, actorId);
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { archivedAt: new Date() },
        });
        await audit(tx, workspaceId, actorId, actorId, "COMPANY_ARCHIVED", {});
        const personal = await createPersonalWorkspace(tx, actorId);
        return { workspaceId: member.workspace.id, personalWorkspaceId: personal.id };
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async createCompany(
    actorId: string,
    name: string,
    contractedMinutes?: number,
  ) {
    const hasHoursBudget =
      Number.isInteger(contractedMinutes) && (contractedMinutes ?? 0) > 0;
    return prisma.$transaction(
      async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name,
            kind: "COMPANY",
            hoursControlEnabled: hasHoursBudget,
            members: { create: { userId: actorId, role: "OWNER" } },
          },
        });
        if (hasHoursBudget) {
          const now = new Date();
          const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          await tx.workspaceHoursBudget.create({
            data: {
              workspaceId: workspace.id,
              month,
              contractedMinutes: contractedMinutes!,
            },
          });
        }
        await audit(tx, workspace.id, actorId, actorId, "COMPANY_CREATED", { name });
        return workspace;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async configure(
    actorId: string,
    workspaceId: string,
    allowProvisional: boolean,
  ) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await owner(tx, workspaceId, actorId);
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { allowProvisional },
        });
        await audit(tx, workspaceId, actorId, actorId, "POLICY_CHANGED", {
          allowProvisional,
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async invite(
    actorId: string,
    workspaceId: string,
    email: string,
    role: "MANAGER" | "COLLABORATOR",
    managerId?: string,
  ) {
    const token = randomBytes(32).toString("hex");
    await prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      await owner(tx, workspaceId, actorId);
      const manager = await checkManager(tx, workspaceId, managerId);
      await tx.workspaceInvitation.create({
        data: {
          workspaceId,
          email: email.toLowerCase(),
          role,
          managerId: role === "MANAGER" ? null : manager,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      await audit(tx, workspaceId, actorId, actorId, "INVITATION_CREATED", {
        email,
        role,
        managerId: manager,
      });
    });
    return token;
  }

  static async acceptInvite(actorId: string, email: string, token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return prisma.$transaction(
      async (tx) => {
        const invite = await tx.workspaceInvitation.findUnique({
          where: { tokenHash },
        });
        if (!invite) throw new Error("Convite inválido.");
        await lockWorkspace(tx, invite.workspaceId);
        const current = await tx.workspaceInvitation.findUniqueOrThrow({
          where: { id: invite.id },
        });
        if (
          current.revokedAt ||
          current.acceptedAt ||
          current.expiresAt < new Date() ||
          current.email !== email.toLowerCase()
        )
          throw new Error("Convite expirado, utilizado ou destinado a outro email.");
        const managerId = await checkManager(tx, invite.workspaceId, invite.managerId);
        const existing = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId: invite.workspaceId, userId: actorId },
          },
        });
        if (existing?.active) throw new Error("Você já participa deste espaço.");
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: { workspaceId: invite.workspaceId, userId: actorId },
          },
          update: { active: true, role: invite.role, managerId },
          create: {
            workspaceId: invite.workspaceId,
            userId: actorId,
            role: invite.role,
            managerId,
          },
        });
        await tx.workspaceInvitation.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
        await audit(tx, invite.workspaceId, actorId, actorId, "INVITATION_ACCEPTED", {
          invitationId: invite.id,
        });
        return invite.workspaceId;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async requestJoin(actorId: string, joinCode: string) {
    return prisma.$transaction(
      async (tx) => {
        const workspace = await tx.workspace.findFirst({
          where: { joinCode, kind: "COMPANY" },
        });
        if (!workspace) throw new Error("Código de empresa inválido.");
        await lockWorkspace(tx, workspace.id);
        const member = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: workspace.id, userId: actorId } },
        });
        if (member?.active) throw new Error("Você já participa desta empresa.");
        await tx.workspaceJoinRequest.upsert({
          where: { workspaceId_userId: { workspaceId: workspace.id, userId: actorId } },
          create: { workspaceId: workspace.id, userId: actorId },
          update: { status: "PENDING" },
        });
        await audit(tx, workspace.id, actorId, actorId, "JOIN_REQUESTED", {});
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async decideJoin(
    actorId: string,
    workspaceId: string,
    requestId: string,
    approve: boolean,
    managerId?: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await owner(tx, workspaceId, actorId);
        const request = await tx.workspaceJoinRequest.findFirst({
          where: { id: requestId, workspaceId, status: "PENDING" },
        });
        if (!request) throw new Error("Solicitação não está pendente.");
        const manager = await checkManager(tx, workspaceId, managerId);
        if (approve) {
          const existing = await tx.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: request.userId } },
          });
          if (existing?.active) throw new Error("A pessoa já participa da empresa.");
          await tx.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId, userId: request.userId } },
            create: { workspaceId, userId: request.userId, managerId: manager },
            update: { active: true, role: "COLLABORATOR", managerId: manager },
          });
        }
        await tx.workspaceJoinRequest.update({
          where: { id: request.id },
          data: { status: approve ? "APPROVED" : "REJECTED" },
        });
        await audit(
          tx,
          workspaceId,
          actorId,
          request.userId,
          approve ? "JOIN_APPROVED" : "JOIN_REJECTED",
          { requestId, managerId: manager },
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }

  static async updateMember(
    actorId: string,
    workspaceId: string,
    memberId: string,
    role: "MANAGER" | "COLLABORATOR",
    active: boolean,
    managerId?: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await owner(tx, workspaceId, actorId);
        const member = await tx.workspaceMember.findFirst({
          where: { id: memberId, workspaceId },
        });
        if (!member || member.role === "OWNER")
          throw new Error("O responsável não pode ser alterado nesta tela.");
        await lockPerson(tx, member.userId);
        const manager =
          role === "MANAGER" ? null : await checkManager(tx, workspaceId, managerId);
        if (manager === member.id)
          throw new Error("Uma pessoa não pode ser seu próprio gestor.");
        if (!active) {
          const { TimeEntryService } = await import("./time-entry.service");
          const state = await TimeEntryService.getClockState(member.userId, tx);
          if (
            state.lastEntry?.type === "CLOCK_IN" &&
            state.lastEntry.timesheet.workspaceId === workspaceId
          )
            throw new Error(
              "Encerre ou ajuste o ponto aberto antes de desativar o vínculo.",
            );
        }
        await tx.workspaceMember.update({
          where: { id: member.id },
          data: { role, active, managerId: manager },
        });
        if (!active || role !== "MANAGER")
          await tx.workspaceMember.updateMany({
            where: { workspaceId, managerId: member.id },
            data: { managerId: null },
          });
        await audit(tx, workspaceId, actorId, member.userId, "MEMBERSHIP_CHANGED", {
          before: {
            role: member.role,
            active: member.active,
            managerId: member.managerId,
          },
          after: { role, active, managerId: manager },
        });
      },
      { maxWait: 10000, timeout: 30000 },
    );
  }
}
