import { DateTime } from "luxon";

import { TIMEZONE } from "@/lib/constants";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import prisma from "@/lib/prisma";
import type { Prisma } from "../../generated/prisma/client";

import {
  audit,
  lockWorkspace,
  requireMember,
  type Database,
} from "./workspace.service";

type EligibleRole = "MANAGER" | "COLLABORATOR";
const ELIGIBLE_ROLES: EligibleRole[] = ["MANAGER", "COLLABORATOR"];

type EligibleMember = Prisma.WorkspaceMemberGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

export type HoursMonth = `${number}-${number}`;

export type HoursFeatureSettings = {
  hoursControlEnabled: boolean;
  adjustmentsRequireApproval: boolean;
  hoursNotificationsEnabled: boolean;
  hoursAlertsEnabled: boolean;
};

export type HoursMemberSummary = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: "MANAGER" | "COLLABORATOR";
  allocatedMinutes: number;
  workedMinutes: number;
  remainingMinutes: number;
  overageMinutes: number;
  percentUsed: number;
  projectedMinutes: number;
};

export type HoursBudgetOverview = {
  id: string;
  month: string;
  status: "OPEN" | "CLOSED";
  contractedMinutes: number;
  allocatedMinutes: number;
  unallocatedMinutes: number;
  consumedMinutes: number;
  availableMinutes: number;
  overageMinutes: number;
  percentUsed: number;
  members: HoursMemberSummary[];
  rules: Array<{
    id: string;
    memberId: string;
    memberName: string;
    startDate: string;
    endDate: string;
    weekdays: number[];
    dailyMinutes: number;
    shiftLabel: string;
    active: boolean;
  }>;
  features: HoursFeatureSettings;
};

export type HoursMemberDetail = {
  overview: HoursBudgetOverview;
  member: HoursMemberSummary;
  days: Array<{ date: string; workedMinutes: number }>;
};

function monthValue(value: string | Date) {
  if (value instanceof Date) return formatDateOnly(value).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error("Competência inválida.");
  const parsed = DateTime.fromFormat(`${value}-01`, "yyyy-MM-dd", {
    zone: TIMEZONE,
  });
  if (!parsed.isValid || parsed.toFormat("yyyy-MM") !== value)
    throw new Error("Competência inválida.");
  return value as HoursMonth;
}

function monthDate(value: string | Date) {
  const month = monthValue(value);
  return dateOnlyStart(`${month}-01`);
}

function monthEnd(value: string | Date) {
  return DateTime.fromJSDate(monthDate(value), { zone: "UTC" })
    .plus({ months: 1 })
    .toJSDate();
}

function daysInRule(startDate: Date, endDate: Date, weekdays: number[], month: string) {
  const monthStart = DateTime.fromJSDate(monthDate(month), { zone: "UTC" });
  const monthEndDate = monthStart.plus({ months: 1 }).minus({ days: 1 });
  let cursor = DateTime.fromJSDate(startDate, { zone: "UTC" });
  const start = cursor < monthStart ? monthStart : cursor;
  const rawEnd = DateTime.fromJSDate(endDate, { zone: "UTC" });
  const end = rawEnd > monthEndDate ? monthEndDate : rawEnd;
  const allowed = new Set(weekdays);
  let count = 0;
  cursor = start.startOf("day");
  while (cursor <= end.startOf("day")) {
    if (allowed.has(cursor.weekday)) count++;
    cursor = cursor.plus({ days: 1 });
  }
  return count;
}

function eligibleMemberWhere(workspaceId: string) {
  return {
    workspaceId,
    active: true,
    role: { in: ELIGIBLE_ROLES },
  };
}

async function getEligibleMembers(
  db: Database | typeof prisma,
  workspaceId: string,
): Promise<EligibleMember[]> {
  return db.workspaceMember.findMany({
    where: eligibleMemberWhere(workspaceId),
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

function splitMinutes(total: number, count: number) {
  if (count === 0) return [];
  const base = Math.floor(total / count);
  const remainder = Math.max(total, 0) % count;
  return Array.from(
    { length: count },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const remainder = Math.abs(minutes) % 60;
  return `${hours}h${remainder ? ` ${remainder}min` : ""}`;
}

async function ensureAllocations(
  db: Database,
  budgetId: string,
  workspaceId: string,
  initialMinutes?: number,
) {
  const members = await getEligibleMembers(db, workspaceId);
  const existing = await db.workspaceHoursAllocation.findMany({
    where: { budgetId },
    select: { memberId: true, allocatedMinutes: true, isManual: true },
  });
  const existingIds = new Set(existing.map((item) => item.memberId));
  const missing = members.filter((member) => !existingIds.has(member.id));
  const canRebalanceDefaults = existing.every((item) => !item.isManual);
  if (initialMinutes !== undefined && canRebalanceDefaults) {
    const values = splitMinutes(initialMinutes, members.length);
    for (const [index, member] of members.entries()) {
      await db.workspaceHoursAllocation.upsert({
        where: { budgetId_memberId: { budgetId, memberId: member.id } },
        create: {
          budgetId,
          memberId: member.id,
          allocatedMinutes: values[index] ?? 0,
        },
        update: { allocatedMinutes: values[index] ?? 0, isManual: false },
      });
    }
    return members;
  }

  if (missing.length === 0) return members;

  await db.workspaceHoursAllocation.createMany({
    data: missing.map((member) => ({
      budgetId,
      memberId: member.id,
      allocatedMinutes: 0,
    })),
  });
  return members;
}

async function getOrCreateBudget(db: Database, workspaceId: string, month: string) {
  const existing = await db.workspaceHoursBudget.findUnique({
    where: { workspaceId_month: { workspaceId, month: monthDate(month) } },
  });
  if (existing) {
    await ensureAllocations(db, existing.id, workspaceId, existing.contractedMinutes);
    return existing;
  }

  const previous = await db.workspaceHoursBudget.findFirst({
    where: { workspaceId, month: { lt: monthDate(month) } },
    orderBy: { month: "desc" },
  });
  const budget = await db.workspaceHoursBudget.create({
    data: {
      workspaceId,
      month: monthDate(month),
      contractedMinutes: previous?.contractedMinutes ?? 0,
    },
  });
  await ensureAllocations(db, budget.id, workspaceId, budget.contractedMinutes);
  return budget;
}

async function requireHoursMember(
  db: Database,
  workspaceId: string,
  actorId: string,
  memberId: string,
) {
  const actor = await requireMember(db, workspaceId, actorId, true);
  const target = await db.workspaceMember.findFirst({
    where: {
      id: memberId,
      workspaceId,
      active: true,
      role: { in: [...ELIGIBLE_ROLES] },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!target) throw new Error("Colaborador não encontrado neste espaço.");
  if (
    actor.role !== "OWNER" &&
    actor.id !== target.id &&
    !(actor.role === "MANAGER" && target.managerId === actor.id)
  ) {
    throw new Error("Você não pode alterar a distribuição desta pessoa.");
  }
  return { actor, target };
}

function serializeRule(
  rule: {
    id: string;
    memberId: string;
    startDate: Date;
    endDate: Date;
    weekdays: number[];
    dailyMinutes: number;
    shiftLabel: string;
    active: boolean;
    member: { user: { name: string } };
    projectedMinutes?: number;
  },
  month: string,
) {
  return {
    id: rule.id,
    memberId: rule.memberId,
    memberName: rule.member.user.name,
    startDate: formatDateOnly(rule.startDate),
    endDate: formatDateOnly(rule.endDate),
    weekdays: rule.weekdays,
    dailyMinutes: rule.dailyMinutes,
    shiftLabel: rule.shiftLabel,
    active: rule.active,
    projectedMinutes:
      daysInRule(rule.startDate, rule.endDate, rule.weekdays, month) *
      rule.dailyMinutes,
  };
}

export class HoursBudgetService {
  static async getFeatures(workspaceId: string): Promise<HoursFeatureSettings> {
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: {
        hoursControlEnabled: true,
        adjustmentsRequireApproval: true,
        hoursNotificationsEnabled: true,
        hoursAlertsEnabled: true,
      },
    });
    return workspace;
  }

  static async getOverview(
    actorId: string,
    workspaceId: string,
    requestedMonth?: string,
  ): Promise<HoursBudgetOverview | null> {
    const member = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
      include: { workspace: true },
    });
    if (member.workspace.kind !== "COMPANY" || !member.workspace.hoursControlEnabled)
      return null;
    const month = monthValue(
      requestedMonth ?? DateTime.now().setZone(TIMEZONE).toFormat("yyyy-MM"),
    );
    const budget = await prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      await requireMember(tx, workspaceId, actorId);
      return getOrCreateBudget(tx, workspaceId, month);
    });
    const members = await getEligibleMembers(prisma, workspaceId);
    const [allocations, timesheets, rules] = await Promise.all([
      prisma.workspaceHoursAllocation.findMany({
        where: { budgetId: budget.id },
        select: { memberId: true, allocatedMinutes: true },
      }),
      prisma.timesheet.findMany({
        where: {
          workspaceId,
          userId: { in: members.map((item) => item.userId) },
          date: { gte: monthDate(month), lt: monthEnd(month) },
          totalWorkedMinutes: { gt: 0 },
        },
        select: { userId: true, date: true, totalWorkedMinutes: true },
      }),
      prisma.workspaceAllocationRule.findMany({
        where: { budgetId: budget.id },
        include: { member: { include: { user: { select: { name: true } } } } },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      }),
    ]);
    const allocationByMember = new Map(
      allocations.map((item) => [item.memberId, item.allocatedMinutes]),
    );
    const workedByUser = new Map<string, number>();
    for (const sheet of timesheets)
      workedByUser.set(
        sheet.userId,
        (workedByUser.get(sheet.userId) ?? 0) + sheet.totalWorkedMinutes,
      );
    const projectedByMember = new Map<string, number>();
    for (const rule of rules) {
      if (!rule.active) continue;
      projectedByMember.set(
        rule.memberId,
        (projectedByMember.get(rule.memberId) ?? 0) +
          daysInRule(rule.startDate, rule.endDate, rule.weekdays, month) *
            rule.dailyMinutes,
      );
    }
    const memberSummaries = members.map((item) => {
      const allocatedMinutes = allocationByMember.get(item.id) ?? 0;
      const workedMinutes = workedByUser.get(item.userId) ?? 0;
      const overageMinutes = Math.max(0, workedMinutes - allocatedMinutes);
      return {
        memberId: item.id,
        userId: item.userId,
        name: item.user.name,
        email: item.user.email,
        role: item.role as "MANAGER" | "COLLABORATOR",
        allocatedMinutes,
        workedMinutes,
        remainingMinutes: allocatedMinutes - workedMinutes,
        overageMinutes,
        percentUsed:
          allocatedMinutes > 0
            ? Math.round((workedMinutes / allocatedMinutes) * 100)
            : workedMinutes > 0
              ? 100
              : 0,
        projectedMinutes: projectedByMember.get(item.id) ?? 0,
      } satisfies HoursMemberSummary;
    });
    const allocatedMinutes = memberSummaries.reduce(
      (sum, item) => sum + item.allocatedMinutes,
      0,
    );
    const consumedMinutes = memberSummaries.reduce(
      (sum, item) => sum + item.workedMinutes,
      0,
    );
    const overageMinutes = Math.max(0, consumedMinutes - budget.contractedMinutes);
    return {
      id: budget.id,
      month,
      status: budget.status,
      contractedMinutes: budget.contractedMinutes,
      allocatedMinutes,
      unallocatedMinutes: budget.contractedMinutes - allocatedMinutes,
      consumedMinutes,
      availableMinutes: budget.contractedMinutes - consumedMinutes,
      overageMinutes,
      percentUsed:
        budget.contractedMinutes > 0
          ? Math.round((consumedMinutes / budget.contractedMinutes) * 100)
          : consumedMinutes > 0
            ? 100
            : 0,
      members: memberSummaries,
      rules: rules.map((rule) => serializeRule(rule, month)),
      features: {
        hoursControlEnabled: member.workspace.hoursControlEnabled,
        adjustmentsRequireApproval: member.workspace.adjustmentsRequireApproval,
        hoursNotificationsEnabled: member.workspace.hoursNotificationsEnabled,
        hoursAlertsEnabled: member.workspace.hoursAlertsEnabled,
      },
    };
  }

  static async getMemberDetail(
    actorId: string,
    workspaceId: string,
    memberId: string,
    requestedMonth?: string,
  ): Promise<HoursMemberDetail | null> {
    const overview = await this.getOverview(actorId, workspaceId, requestedMonth);
    if (!overview) return null;
    const member = overview.members.find((item) => item.memberId === memberId);
    if (!member) return null;
    const sheets = await prisma.timesheet.findMany({
      where: {
        workspaceId,
        userId: member.userId,
        date: { gte: monthDate(overview.month), lt: monthEnd(overview.month) },
        totalWorkedMinutes: { gt: 0 },
      },
      select: { date: true, totalWorkedMinutes: true },
      orderBy: { date: "asc" },
    });
    return {
      overview,
      member,
      days: sheets.map((sheet) => ({
        date: formatDateOnly(sheet.date),
        workedMinutes: sheet.totalWorkedMinutes,
      })),
    };
  }

  static async refreshAlerts(
    db: Database,
    workspaceId: string,
    userId: string,
    date: Date,
  ) {
    if (!db.workspace || !db.workspaceHoursBudget || !db.userNotification) return;
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { kind: true, hoursControlEnabled: true, hoursAlertsEnabled: true },
    });
    if (
      !workspace ||
      workspace.kind !== "COMPANY" ||
      !workspace.hoursControlEnabled ||
      !workspace.hoursAlertsEnabled
    )
      return;
    const month = formatDateOnly(date).slice(0, 7);
    const budget = await db.workspaceHoursBudget.findUnique({
      where: { workspaceId_month: { workspaceId, month: monthDate(month) } },
      select: { id: true, contractedMinutes: true },
    });
    if (!budget) return;
    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, userId: true, managerId: true, role: true },
    });
    if (!member || !ELIGIBLE_ROLES.includes(member.role as EligibleRole)) return;
    const [allocation, sheets, recipients, teamSheets] = await Promise.all([
      db.workspaceHoursAllocation.findUnique({
        where: { budgetId_memberId: { budgetId: budget.id, memberId: member.id } },
        select: { allocatedMinutes: true },
      }),
      db.timesheet.findMany({
        where: {
          workspaceId,
          userId,
          date: { gte: monthDate(month), lt: monthEnd(month) },
          totalWorkedMinutes: { gt: 0 },
        },
        select: { totalWorkedMinutes: true },
      }),
      db.workspaceMember.findMany({
        where: { workspaceId, active: true, role: "OWNER" },
        select: { userId: true },
      }),
      db.timesheet.findMany({
        where: {
          workspaceId,
          date: { gte: monthDate(month), lt: monthEnd(month) },
          totalWorkedMinutes: { gt: 0 },
        },
        select: { totalWorkedMinutes: true },
      }),
    ]);
    const worked = sheets.reduce((sum, sheet) => sum + sheet.totalWorkedMinutes, 0);
    const allocated = allocation?.allocatedMinutes ?? 0;
    const threshold =
      allocated > 0
        ? worked >= allocated * 0.8
          ? worked > allocated
            ? "OVER"
            : worked >= allocated
              ? "100"
              : "80"
          : null
        : worked > 0
          ? "OVER"
          : null;
    const manager = member.managerId
      ? await db.workspaceMember.findUnique({
          where: { id: member.managerId },
          select: { userId: true },
        })
      : null;
    const recipientIds = new Set(recipients.map((item) => item.userId));
    if (manager) recipientIds.add(manager.userId);
    if (threshold) {
      const type = `HOURS_ALERT_${threshold}`;
      const message = `${month}:${userId}`;
      for (const recipientId of recipientIds) {
        const exists = await db.userNotification.findFirst({
          where: {
            userId: recipientId,
            workspaceId,
            type,
            message: { contains: message },
          },
          select: { id: true },
        });
        if (!exists) {
          await db.userNotification.create({
            data: {
              userId: recipientId,
              workspaceId,
              type,
              title:
                threshold === "OVER"
                  ? "Excedente de horas"
                  : `Consumo em ${threshold}%`,
              message: `${message} · ${formatDateOnly(date)} · ${formatMinutes(worked)} consumidas de ${formatMinutes(allocated)} alocadas para o colaborador.`,
              href: `/team-hours/${member.id}?month=${month}`,
            },
          });
        }
      }
    }
    const teamWorked = teamSheets.reduce(
      (sum, sheet) => sum + sheet.totalWorkedMinutes,
      0,
    );
    if (teamWorked > budget.contractedMinutes) {
      for (const recipient of recipients) {
        const type = "HOURS_ALERT_TEAM_OVER";
        const message = `${month}:team`;
        const exists = await db.userNotification.findFirst({
          where: {
            userId: recipient.userId,
            workspaceId,
            type,
            message: { contains: message },
          },
          select: { id: true },
        });
        if (!exists) {
          await db.userNotification.create({
            data: {
              userId: recipient.userId,
              workspaceId,
              type,
              title: "Contrato mensal excedido",
              message: `${message} · O time ultrapassou o contrato em ${formatMinutes(teamWorked - budget.contractedMinutes)}.`,
              href: `/team-hours?month=${month}`,
            },
          });
        }
      }
    }
  }

  static async configureFeatures(
    actorId: string,
    workspaceId: string,
    input: Partial<HoursFeatureSettings>,
  ) {
    return prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      const actor = await requireMember(tx, workspaceId, actorId, true);
      if (actor.role !== "OWNER" || actor.workspace.kind !== "COMPANY")
        throw new Error("Apenas o owner pode configurar os recursos do espaço.");
      const data = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      ) as Prisma.WorkspaceUpdateInput;
      await tx.workspace.update({ where: { id: workspaceId }, data });
      await audit(
        tx,
        workspaceId,
        actorId,
        actorId,
        "HOURS_FEATURES_CHANGED",
        data as Prisma.InputJsonValue,
      );
    });
  }

  static async configureBudget(
    actorId: string,
    workspaceId: string,
    monthInput: string,
    contractedMinutes: number,
  ) {
    const month = monthValue(monthInput);
    if (
      !Number.isInteger(contractedMinutes) ||
      contractedMinutes < 0 ||
      contractedMinutes > 31 * 24 * 60 * 100
    )
      throw new Error("Informe uma quantidade válida de horas contratadas.");
    return prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      const actor = await requireMember(tx, workspaceId, actorId, true);
      if (
        actor.workspace.kind !== "COMPANY" ||
        (actor.role !== "OWNER" && actor.role !== "MANAGER")
      )
        throw new Error("Você não pode configurar as horas deste espaço.");
      const existing = await tx.workspaceHoursBudget.findUnique({
        where: { workspaceId_month: { workspaceId, month: monthDate(month) } },
      });
      if (existing?.status === "CLOSED")
        throw new Error("Esta competência está fechada.");
      const budget = existing
        ? await tx.workspaceHoursBudget.update({
            where: { id: existing.id },
            data: { contractedMinutes },
          })
        : await tx.workspaceHoursBudget.create({
            data: { workspaceId, month: monthDate(month), contractedMinutes },
          });
      await ensureAllocations(tx, budget.id, workspaceId, budget.contractedMinutes);
      await audit(tx, workspaceId, actorId, actorId, "HOURS_BUDGET_UPDATED", {
        month,
        contractedMinutes,
      });
      return budget;
    });
  }

  static async updateAllocations(
    actorId: string,
    workspaceId: string,
    monthInput: string,
    allocations: Array<{ memberId: string; allocatedMinutes: number }>,
  ) {
    const month = monthValue(monthInput);
    return prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      const actor = await requireMember(tx, workspaceId, actorId, true);
      if (actor.role !== "OWNER" && actor.role !== "MANAGER")
        throw new Error("Você não pode distribuir horas neste espaço.");
      const budget = await getOrCreateBudget(tx, workspaceId, month);
      if (budget.status === "CLOSED") throw new Error("Esta competência está fechada.");
      for (const item of allocations) {
        if (!Number.isInteger(item.allocatedMinutes) || item.allocatedMinutes < 0)
          throw new Error("A cota individual deve ser um número inteiro positivo.");
        await requireHoursMember(tx, workspaceId, actorId, item.memberId);
      }
      for (const item of allocations) {
        const previous = await tx.workspaceHoursAllocation.findUnique({
          where: {
            budgetId_memberId: { budgetId: budget.id, memberId: item.memberId },
          },
          select: { allocatedMinutes: true },
        });
        await tx.workspaceHoursAllocation.upsert({
          where: {
            budgetId_memberId: { budgetId: budget.id, memberId: item.memberId },
          },
          create: {
            budgetId: budget.id,
            memberId: item.memberId,
            allocatedMinutes: item.allocatedMinutes,
            isManual: true,
          },
          update: { allocatedMinutes: item.allocatedMinutes, isManual: true },
        });
        const target = await tx.workspaceMember.findUnique({
          where: { id: item.memberId },
          select: { userId: true },
        });
        if (
          target &&
          (previous?.allocatedMinutes ?? 0) !== item.allocatedMinutes &&
          target.userId !== actorId &&
          actor.workspace.hoursNotificationsEnabled
        ) {
          await tx.userNotification.create({
            data: {
              userId: target.userId,
              workspaceId,
              type: "HOURS_ALLOCATION_UPDATED",
              title: "Sua meta de horas foi atualizada",
              message: `Sua meta nesta competência foi definida para ${formatMinutes(item.allocatedMinutes)} pelo gestor.`,
              href: `/team-hours/${item.memberId}?month=${month}`,
            },
          });
        }
        await audit(
          tx,
          workspaceId,
          actorId,
          item.memberId,
          "HOURS_ALLOCATION_UPDATED",
          {
            month,
            allocatedMinutes: item.allocatedMinutes,
          },
        );
      }
    });
  }

  static async createRule(
    actorId: string,
    workspaceId: string,
    input: {
      month: string;
      memberId: string;
      startDate: string;
      endDate: string;
      weekdays: number[];
      dailyMinutes: number;
      shiftLabel: string;
    },
  ) {
    const month = monthValue(input.month);
    const startDate = dateOnlyStart(input.startDate);
    const endDate = dateOnlyStart(input.endDate);
    if (
      startDate > endDate ||
      startDate < monthDate(month) ||
      endDate >= monthEnd(month)
    )
      throw new Error("O período da regra deve estar dentro da competência.");
    if (
      !input.weekdays.length ||
      input.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
    )
      throw new Error("Selecione ao menos um dia da semana válido.");
    if (
      !Number.isInteger(input.dailyMinutes) ||
      input.dailyMinutes < 1 ||
      input.dailyMinutes > 24 * 60
    )
      throw new Error("Informe uma quantidade diária válida.");
    const shiftLabel = input.shiftLabel.trim();
    if (!shiftLabel || shiftLabel.length > 40)
      throw new Error("Informe um rótulo de turno válido.");
    return prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      const actor = await requireMember(tx, workspaceId, actorId, true);
      if (actor.role !== "OWNER" && actor.role !== "MANAGER")
        throw new Error("Você não pode aplicar regras neste espaço.");
      const { target } = await requireHoursMember(
        tx,
        workspaceId,
        actorId,
        input.memberId,
      );
      const budget = await getOrCreateBudget(tx, workspaceId, month);
      if (budget.status === "CLOSED") throw new Error("Esta competência está fechada.");
      const currentRules = await tx.workspaceAllocationRule.findMany({
        where: {
          budgetId: budget.id,
          memberId: input.memberId,
          active: true,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });
      const weekdays = new Set(input.weekdays);
      if (currentRules.some((rule) => rule.weekdays.some((day) => weekdays.has(day))))
        throw new Error("Já existe uma regra sobreposta para este colaborador.");
      const rule = await tx.workspaceAllocationRule.create({
        data: {
          budgetId: budget.id,
          memberId: input.memberId,
          createdById: actorId,
          startDate,
          endDate,
          weekdays: [...new Set(input.weekdays)].sort((a, b) => a - b),
          dailyMinutes: input.dailyMinutes,
          shiftLabel,
        },
      });
      await audit(tx, workspaceId, actorId, target.userId, "HOURS_RULE_CREATED", {
        month,
        memberId: input.memberId,
        startDate: input.startDate,
        endDate: input.endDate,
        weekdays: input.weekdays,
        dailyMinutes: input.dailyMinutes,
        shiftLabel,
      });
      if (actorId !== target.userId && actor.workspace.hoursNotificationsEnabled) {
        await tx.userNotification.create({
          data: {
            userId: target.userId,
            workspaceId,
            type: "HOURS_RULE_APPLIED",
            title: "Nova regra de horas",
            message: `Você recebeu uma regra de ${Math.floor(input.dailyMinutes / 60)}h${input.dailyMinutes % 60 ? ` ${input.dailyMinutes % 60}min` : ""} no turno ${shiftLabel} para ${input.startDate} a ${input.endDate}.`,
            href: `/team-hours/${target.id}?month=${month}`,
          },
        });
      }
      return rule;
    });
  }

  static async setBudgetStatus(
    actorId: string,
    workspaceId: string,
    monthInput: string,
    status: "OPEN" | "CLOSED",
    reason?: string,
  ) {
    const month = monthValue(monthInput);
    return prisma.$transaction(async (tx) => {
      await lockWorkspace(tx, workspaceId);
      const actor = await requireMember(tx, workspaceId, actorId, true);
      if (actor.role !== "OWNER" && actor.role !== "MANAGER")
        throw new Error("Você não pode alterar o fechamento deste espaço.");
      const budget = await getOrCreateBudget(tx, workspaceId, month);
      await tx.workspaceHoursBudget.update({
        where: { id: budget.id },
        data: {
          status,
          closedAt: status === "CLOSED" ? new Date() : null,
          closedById: status === "CLOSED" ? actorId : null,
        },
      });
      await audit(
        tx,
        workspaceId,
        actorId,
        actorId,
        status === "CLOSED" ? "HOURS_BUDGET_CLOSED" : "HOURS_BUDGET_REOPENED",
        {
          month,
          reason: reason?.trim() || null,
        },
      );
    });
  }
}
