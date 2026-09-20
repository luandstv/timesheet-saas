import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import prisma from "@/lib/prisma";
import { TIMEZONE } from "@/lib/constants";
import { effectiveEntries, validateMovements } from "@/lib/effective-entries";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import {
  assertMonthOpen,
  loadEffectiveUser,
  recalculate,
} from "./effective-time.service";
import {
  audit,
  lockPerson,
  lockWorkspace,
  requireMember,
  requireReview,
  type Database,
} from "./workspace.service";
import { TimeEntryService } from "./time-entry.service";

type RequestInput = {
  date: string;
  targetEventId?: string;
  type: "INSERTION" | "MODIFICATION" | "DELETION";
  entryType: "CLOCK_IN" | "CLOCK_OUT";
  timestamp?: string;
  reason: string;
  forgotten: boolean;
};

export async function validateTimeSheets(
  db: Database,
  userId: string,
  timeSheetIds: string[],
) {
  const ids = [...new Set(timeSheetIds)];
  if (ids.length === 0) return;

  // Validate only the affected journeys. A user can have legacy data from a
  // different day or workspace that is already inconsistent; that must not
  // block an otherwise valid correction in the current journey.
  const [raw, requests] = await Promise.all([
    db.timeEntry.findMany({
      where: { timeSheetId: { in: ids }, timesheet: { userId } },
    }),
    db.adjustmentRequest.findMany({
      where: {
        timeSheetId: { in: ids },
        timesheet: { userId },
        status: { in: ["APPROVED", "PENDING"] },
      },
    }),
  ]);

  validateMovements(effectiveEntries(raw, requests));
  validateMovements(
    effectiveEntries(
      raw,
      requests.filter((request) => request.status === "APPROVED"),
    ),
  );
  for (const pending of requests.filter(
    (request) => request.status === "PENDING" && request.provisional,
  )) {
    validateMovements(
      effectiveEntries(
        raw,
        requests.filter((request) => request.id !== pending.id),
      ),
    );
  }
}

export class AdjustmentService {
  static async request(actorId: string, workspaceId: string, input: RequestInput) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await lockPerson(tx, actorId);
        const member = await requireMember(tx, workspaceId, actorId, true);
        const civilDate = DateTime.fromISO(input.date, { zone: TIMEZONE });
        if (
          !civilDate.isValid ||
          civilDate.toFormat("yyyy-MM-dd") !== input.date ||
          civilDate.startOf("day") > DateTime.now().setZone(TIMEZONE)
        )
          throw new Error("Informe uma data de jornada válida, até hoje.");
        const timestamp = input.timestamp
          ? DateTime.fromISO(input.timestamp, { zone: TIMEZONE })
          : null;
        if (
          input.type !== "DELETION" &&
          (!timestamp?.isValid || +timestamp > Date.now())
        )
          throw new Error(
            "Informe um horário válido, até o momento atual, em Brasília.",
          );
        const sheet = await TimeEntryService.getOrCreateTimeSheet(
          actorId,
          civilDate,
          tx,
          workspaceId,
        );
        await assertMonthOpen(tx, workspaceId, actorId, sheet.date);
        if (sheet.status !== "OPEN")
          throw new Error("Reabra a jornada antes de solicitar ajustes.");
        const events = await loadEffectiveUser(actorId, tx);
        const target = input.targetEventId
          ? events.find(
              (event) =>
                event.id === input.targetEventId && event.timeSheetId === sheet.id,
            )
          : undefined;
        if (input.type !== "INSERTION" && !target)
          throw new Error("Movimento não encontrado nesta jornada.");
        const entryType = target?.type ?? input.entryType;
        if (
          input.type !== "DELETION" &&
          entryType === "CLOCK_IN" &&
          timestamp?.toFormat("yyyy-MM-dd") !== input.date
        )
          throw new Error("A entrada deve pertencer à data da jornada selecionada.");
        if (timestamp && timestamp.startOf("day") < civilDate.startOf("day"))
          throw new Error("O horário não pode anteceder a jornada selecionada.");
        if (
          target &&
          (await tx.adjustmentRequest.findFirst({
            where: {
              timeSheetId: sheet.id,
              targetEventId: target.id,
              status: "PENDING",
            },
          }))
        )
          throw new Error(
            "Este movimento já tem uma solicitação pendente. Cancele-a antes de enviar outra.",
          );
        const provisional =
          member.workspace.kind === "COMPANY" &&
          member.workspace.allowProvisional &&
          input.forgotten &&
          input.type === "MODIFICATION";
        const request = await tx.adjustmentRequest.create({
          data: {
            id: randomUUID(),
            timeSheetId: sheet.id,
            targetEventId: target?.id,
            type: input.type,
            entryType,
            previousTimestamp: target?.timestamp,
            newTimestamp: input.type === "DELETION" ? null : timestamp!.toJSDate(),
            reason: input.reason,
            forgotten: input.forgotten,
            provisional,
            requestedById: actorId,
          },
        });
        if (provisional) {
          await validateTimeSheets(tx, actorId, [sheet.id]);
          await recalculate(tx, sheet.id, actorId);
        }
        await audit(tx, workspaceId, actorId, actorId, "ADJUSTMENT_REQUESTED", {
          requestId: request.id,
          type: input.type,
          entryType,
          reason: input.reason,
          provisional,
          original: target?.timestamp.toISOString() ?? null,
          proposed: request.newTimestamp?.toISOString() ?? null,
        });
        return request;
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }

  static async decide(
    actorId: string,
    workspaceId: string,
    userId: string,
    ids: string[],
    decision: "APPROVED" | "REJECTED" | "CANCELLED",
    reason: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await lockPerson(tx, userId);
        if (decision === "CANCELLED") {
          await requireMember(tx, workspaceId, actorId, true);
          if (actorId !== userId)
            throw new Error("Só o solicitante pode cancelar o ajuste.");
        } else await requireReview(tx, workspaceId, actorId, userId);
        const requests = await tx.adjustmentRequest.findMany({
          where: {
            id: { in: ids },
            status: "PENDING",
            timesheet: { userId, workspaceId },
          },
          include: { timesheet: true },
          orderBy: { sequence: "asc" },
        });
        if (requests.length !== new Set(ids).size || requests.length === 0)
          throw new Error(
            "Há solicitações que já foram decididas ou não pertencem a esta pessoa.",
          );
        const effective = await loadEffectiveUser(userId, tx);
        for (const request of requests) {
          await assertMonthOpen(tx, workspaceId, userId, request.timesheet.date);
          if (
            decision === "APPROVED" &&
            request.targetEventId &&
            !effective.some((event) => event.id === request.targetEventId)
          )
            throw new Error(
              "O movimento foi alterado. Cancele esta solicitação e confira o histórico.",
            );
          await tx.adjustmentRequest.update({
            where: { id: request.id },
            data: { status: decision, decidedById: actorId, decidedAt: new Date() },
          });
          await audit(tx, workspaceId, actorId, userId, `ADJUSTMENT_${decision}`, {
            requestId: request.id,
            reason,
            original: request.previousTimestamp?.toISOString() ?? null,
            proposed: request.newTimestamp?.toISOString() ?? null,
            requestedReason: request.reason,
            selfConfirmed: actorId === userId,
          });
        }
        await validateTimeSheets(
          tx,
          userId,
          requests.map((request) => request.timeSheetId),
        );
        for (const id of new Set(requests.map((request) => request.timeSheetId)))
          await recalculate(tx, id, userId);

        if (actorId !== userId && decision !== "CANCELLED") {
          const firstDate = formatDateOnly(requests[0].timesheet.date);
          const requestLabel = requests.length === 1 ? "solicitação" : "solicitações";
          const decisionLabel = decision === "APPROVED" ? "aprovada" : "rejeitada";
          const decisionLabelPlural =
            decision === "APPROVED" ? "aprovadas" : "rejeitadas";
          const title =
            decision === "APPROVED" ? "Ajuste aprovado" : "Ajuste rejeitado";
          const month = firstDate.slice(0, 7);
          const href = `/adjustments?${new URLSearchParams({
            userId,
            month,
            tab: "requests",
          }).toString()}`;

          await tx.userNotification.create({
            data: {
              userId,
              workspaceId,
              type: `ADJUSTMENT_${decision}`,
              title,
              message:
                requests.length === 1
                  ? `Sua solicitação de ajuste de ${firstDate.split("-").reverse().join("/")} foi ${decisionLabel} pelo gestor.`
                  : `${requests.length} ${requestLabel} de ajuste foram ${decisionLabelPlural} pelo gestor.`,
              href,
            },
          });
        }
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }

  static async closeMonth(
    actorId: string,
    workspaceId: string,
    userId: string,
    monthKey: string,
    reopen: boolean,
    reason: string,
  ) {
    const month = DateTime.fromISO(`${monthKey}-01`, { zone: TIMEZONE });
    if (!month.isValid || month.toFormat("yyyy-MM") !== monthKey)
      throw new Error("Mês inválido.");
    if (!reopen && month.endOf("month") >= DateTime.now().setZone(TIMEZONE))
      throw new Error("O mês só pode ser fechado após o último dia.");
    if (reopen && reason.trim().length < 10)
      throw new Error("Explique o motivo da reabertura (mínimo de 10 caracteres).");
    return prisma.$transaction(
      async (tx) => {
        await lockWorkspace(tx, workspaceId);
        await lockPerson(tx, userId);
        await requireReview(tx, workspaceId, actorId, userId);
        const date = {
          gte: dateOnlyStart(month),
          lt: dateOnlyStart(month.plus({ months: 1 })),
        };
        const key = { workspaceId, userId, month: date.gte };
        const existing = await tx.monthlyClosure.findUnique({
          where: { workspaceId_userId_month: key },
        });
        if (reopen) {
          if (!existing?.closed) throw new Error("Este mês não está fechado.");
          await tx.monthlyClosure.update({
            where: { id: existing.id },
            data: { closed: false },
          });
          await tx.timesheet.updateMany({
            where: { workspaceId, userId, date },
            data: { status: "OPEN" },
          });
          await audit(tx, workspaceId, actorId, userId, "MONTH_REOPENED", {
            month: monthKey,
            reason,
            previousSnapshot: existing.snapshot,
          });
          return;
        }
        if (existing?.closed) throw new Error("Este mês já está fechado.");
        const pending = await tx.adjustmentRequest.count({
          where: { status: "PENDING", timesheet: { workspaceId, userId, date } },
        });
        if (pending)
          throw new Error(
            "Confirme ou rejeite os ajustes pendentes antes de fechar o mês.",
          );
        const events = await loadEffectiveUser(userId, tx);
        validateMovements(events);
        const last = events.at(-1);
        if (last?.type === "CLOCK_IN" && last.timesheet.workspaceId === workspaceId)
          throw new Error(
            "Existe um ponto aberto neste espaço. Encerre ou ajuste a jornada antes de fechar o mês.",
          );
        const sheets = await tx.timesheet.findMany({
          where: { workspaceId, userId, date },
          select: {
            id: true,
            date: true,
            totalWorkedMinutes: true,
            normalMinutes: true,
            overtime75FhcMinutes: true,
            overtime75FhcnMinutes: true,
            overtime100FhcMinutes: true,
            overtime100FhcnMinutes: true,
          },
          orderBy: { date: "asc" },
        });
        const snapshot = sheets.map((sheet) => ({
          ...sheet,
          date: formatDateOnly(sheet.date),
        }));
        await tx.monthlyClosure.upsert({
          where: { workspaceId_userId_month: key },
          create: { ...key, snapshot },
          update: { closed: true, snapshot },
        });
        await tx.timesheet.updateMany({
          where: { workspaceId, userId, date },
          data: { status: "APPROVED" },
        });
        await audit(tx, workspaceId, actorId, userId, "MONTH_CLOSED", {
          month: monthKey,
          snapshot,
        });
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }
}
