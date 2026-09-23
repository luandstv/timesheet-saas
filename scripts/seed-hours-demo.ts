import { createHash, randomUUID } from "node:crypto";

import { DateTime } from "luxon";

import { TIMEZONE } from "../src/lib/constants";
import { dateOnlyEnd, dateOnlyStart, formatDateOnly } from "../src/lib/date-only";
import prisma from "../src/lib/prisma";
import { TimeCalculationService } from "../src/services/time-calculation.service";

const DEMO_OWNER_NAME = "Michel Telo";
const DEMO_PEOPLE = [
  ["Ana Souza", "ana.souza.teste@jornix.local"],
  ["Bruno Lima", "bruno.lima.teste@jornix.local"],
  ["Camila Oliveira", "camila.oliveira.teste@jornix.local"],
  ["Diego Santos", "diego.santos.teste@jornix.local"],
  ["Elisa Martins", "elisa.martins.teste@jornix.local"],
  ["Felipe Rocha", "felipe.rocha.teste@jornix.local"],
  ["Gabriela Costa", "gabriela.costa.teste@jornix.local"],
  ["Henrique Alves", "henrique.alves.teste@jornix.local"],
  ["Isabela Nunes", "isabela.nunes.teste@jornix.local"],
  ["João Ribeiro", "joao.ribeiro.teste@jornix.local"],
] as const;

const DEMO_ENTRY_PREFIX = "seed-hours-demo";
const MINUTES_STEP = 30;

type PlannedDay = {
  date: DateTime;
  durationMinutes: number;
  startHour: number;
  startMinute: number;
};

function floorToStep(value: number) {
  return Math.floor(value / MINUTES_STEP) * MINUTES_STEP;
}

function createRandom(seed: string) {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);

  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function shuffle<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildPlan(dates: DateTime[], availableMinutes: number, random: () => number) {
  // Mantém uma margem para que a dashboard mostre horas disponíveis.
  const targetMinutes = floorToStep(availableMinutes * (0.55 + random() * 0.25));
  let remainingMinutes = targetMinutes;
  const plan: PlannedDay[] = [];

  for (const date of shuffle(dates, random)) {
    if (remainingMinutes < 60) break;

    const isWeekend = date.weekday === 6 || date.weekday === 7;
    const minimumMinutes = isWeekend ? 120 : 240;
    const maximumMinutes = isWeekend ? 360 : 480;
    const upperBound = Math.min(maximumMinutes, remainingMinutes);
    if (upperBound < 60) continue;

    const lowerBound = upperBound >= minimumMinutes ? minimumMinutes : 60;
    const options = Math.floor((upperBound - lowerBound) / MINUTES_STEP) + 1;
    const durationMinutes = Math.min(
      remainingMinutes,
      lowerBound + Math.floor(random() * options) * MINUTES_STEP,
    );
    if (durationMinutes < 60) continue;

    const startHour = isWeekend
      ? 9 + Math.floor(random() * 3)
      : 8 + Math.floor(random() * 3);
    const startMinute = random() > 0.5 ? 30 : 0;
    plan.push({ date, durationMinutes, startHour, startMinute });
    remainingMinutes -= durationMinutes;
  }

  return plan;
}

async function main() {
  console.log("Conectando ao banco para preparar os dados de horas...");
  const owner = await prisma.user.findFirst({
    where: { name: { equals: DEMO_OWNER_NAME, mode: "insensitive" } },
  });
  if (!owner) {
    throw new Error(`Usuário de teste "${DEMO_OWNER_NAME}" não foi encontrado.`);
  }

  const ownerMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: owner.id,
      active: true,
      role: "OWNER",
      workspace: { kind: "COMPANY" },
    },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!ownerMembership) {
    throw new Error(
      `O usuário "${DEMO_OWNER_NAME}" precisa ser owner de um espaço empresarial.`,
    );
  }

  const now = DateTime.now().setZone(TIMEZONE);
  const month = now.startOf("month");
  const monthValue = month.toFormat("yyyy-MM");
  const monthStart = dateOnlyStart(month);
  const monthEnd = dateOnlyEnd(month.endOf("month"));
  const lastPastDay = Math.min(month.daysInMonth ?? 0, now.day - 1);
  if (lastPastDay < 1) {
    throw new Error(
      "Ainda não há dias encerrados neste mês para gerar dados de teste.",
    );
  }

  const budget = await prisma.workspaceHoursBudget.findUnique({
    where: {
      workspaceId_month: {
        workspaceId: ownerMembership.workspaceId,
        month: monthStart,
      },
    },
    select: { id: true, contractedMinutes: true, status: true },
  });
  if (!budget) {
    throw new Error(
      `Não existe cota para ${monthValue}. Ative o controle de horas e informe a cota antes de executar o script.`,
    );
  }
  if (budget.status !== "OPEN") {
    throw new Error(
      `A competência ${monthValue} está fechada e não aceita dados de teste.`,
    );
  }

  console.log(
    `Espaço encontrado: ${ownerMembership.workspace.name} · competência ${monthValue} · cota ${budget.contractedMinutes / 60}h`,
  );

  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { date: true },
  });
  const holidayDates = new Set(holidays.map((holiday) => formatDateOnly(holiday.date)));

  const result = await prisma.$transaction(
    async (tx) => {
      const members = await tx.workspaceMember.findMany({
        where: {
          workspaceId: ownerMembership.workspaceId,
          active: true,
          role: { in: ["MANAGER", "COLLABORATOR"] },
          user: { email: { in: DEMO_PEOPLE.map(([, email]) => email) } },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              dailyHours: true,
              workStartHour: true,
              workStartMinute: true,
              workEndHour: true,
              workEndMinute: true,
            },
          },
        },
      });
      if (!members.length) {
        throw new Error("Nenhum colaborador de teste foi encontrado neste espaço.");
      }

      const memberIds = members.map((member) => member.id);
      const demoPrefix = `${DEMO_ENTRY_PREFIX}:${ownerMembership.workspaceId}:${monthValue}:`;
      const oldDemoEntries = await tx.timeEntry.findMany({
        where: {
          requestId: { startsWith: demoPrefix },
          timesheet: {
            workspaceId: ownerMembership.workspaceId,
            userId: { in: members.map((member) => member.userId) },
          },
        },
        select: { timeSheetId: true },
      });
      await tx.timeEntry.deleteMany({
        where: { requestId: { startsWith: demoPrefix } },
      });

      const affectedTimesheetIds = [
        ...new Set(oldDemoEntries.map((entry) => entry.timeSheetId)),
      ];
      const remainingAffectedEntries = await tx.timeEntry.findMany({
        where: { timeSheetId: { in: affectedTimesheetIds } },
        select: { timeSheetId: true },
      });
      const timesheetsWithEntries = new Set(
        remainingAffectedEntries.map((entry) => entry.timeSheetId),
      );
      const emptyTimesheetIds = affectedTimesheetIds.filter(
        (timesheetId) => !timesheetsWithEntries.has(timesheetId),
      );
      if (emptyTimesheetIds.length) {
        await tx.timesheet.updateMany({
          where: { id: { in: emptyTimesheetIds } },
          data: {
            totalWorkedMinutes: 0,
            normalMinutes: 0,
            overtime75FhcMinutes: 0,
            overtime75FhcnMinutes: 0,
            overtime100FhcMinutes: 0,
            overtime100FhcnMinutes: 0,
          },
        });
      }
      for (const timesheetId of affectedTimesheetIds.filter((id) =>
        timesheetsWithEntries.has(id),
      )) {
        const timesheet = await tx.timesheet.findUnique({
          where: { id: timesheetId },
          select: { userId: true },
        });
        const user = members.find((item) => item.userId === timesheet?.userId)?.user;
        if (!timesheet || !user) continue;
        await TimeCalculationService.calculateAndUpdateTimeSheet(
          timesheetId,
          user.dailyHours,
          {
            startHour: user.workStartHour,
            startMinute: user.workStartMinute,
            endHour: user.workEndHour,
            endMinute: user.workEndMinute,
          },
          tx,
        );
      }

      const sheets = await tx.timesheet.findMany({
        where: {
          workspaceId: ownerMembership.workspaceId,
          userId: { in: members.map((member) => member.userId) },
          date: { gte: monthStart, lte: monthEnd },
        },
        select: {
          id: true,
          userId: true,
          date: true,
          status: true,
          totalWorkedMinutes: true,
          entries: { select: { id: true } },
        },
      });
      const sheetsByUser = new Map<string, typeof sheets>();
      for (const sheet of sheets) {
        const current = sheetsByUser.get(sheet.userId) ?? [];
        current.push(sheet);
        sheetsByUser.set(sheet.userId, current);
      }

      const allocations = await tx.workspaceHoursAllocation.findMany({
        where: { budgetId: budget.id, memberId: { in: memberIds } },
        select: { memberId: true, allocatedMinutes: true },
      });
      const allocationByMember = new Map(
        allocations.map((allocation) => [
          allocation.memberId,
          allocation.allocatedMinutes,
        ]),
      );
      let teamRemainingMinutes = Math.max(
        0,
        budget.contractedMinutes -
          sheets.reduce((total, sheet) => total + sheet.totalWorkedMinutes, 0),
      );
      const generated: Array<{
        name: string;
        allocatedMinutes: number;
        existingMinutes: number;
        generatedMinutes: number;
        days: number;
      }> = [];

      for (const member of members) {
        const memberSheets = sheetsByUser.get(member.userId) ?? [];
        const existingMinutes = memberSheets.reduce(
          (total, sheet) => total + sheet.totalWorkedMinutes,
          0,
        );
        const allocatedMinutes = Math.max(0, allocationByMember.get(member.id) ?? 0);
        const availableMinutes = Math.min(
          teamRemainingMinutes,
          Math.max(0, allocatedMinutes - existingMinutes),
        );
        const occupiedDates = new Set(
          memberSheets
            .filter((sheet) => sheet.entries.length > 0 || sheet.status !== "OPEN")
            .map((sheet) => formatDateOnly(sheet.date)),
        );
        const dates = Array.from({ length: lastPastDay }, (_, index) =>
          month.set({ day: index + 1 }),
        ).filter((date) => !occupiedDates.has(date.toFormat("yyyy-MM-dd")));
        const random = createRandom(
          `${ownerMembership.workspaceId}:${monthValue}:${member.userId}`,
        );
        const plan = buildPlan(dates, availableMinutes, random);
        let generatedMinutes = 0;

        console.log(
          `Preparando ${member.user.name}: ${plan.length} dias e ${availableMinutes / 60}h disponíveis para a simulação.`,
        );

        for (const item of plan) {
          const dateValue = item.date.toFormat("yyyy-MM-dd");
          const dateOnly = dateOnlyStart(dateValue);
          const timesheet = await tx.timesheet.upsert({
            where: {
              userId_workspaceId_date: {
                userId: member.userId,
                workspaceId: ownerMembership.workspaceId,
                date: dateOnly,
              },
            },
            update: {
              isWeekend: item.date.weekday === 6 || item.date.weekday === 7,
              isHoliday: holidayDates.has(dateValue),
            },
            create: {
              userId: member.userId,
              workspaceId: ownerMembership.workspaceId,
              date: dateOnly,
              isWeekend: item.date.weekday === 6 || item.date.weekday === 7,
              isHoliday: holidayDates.has(dateValue),
            },
          });
          const start = item.date.set({
            hour: item.startHour,
            minute: item.startMinute,
            second: 0,
            millisecond: 0,
          });
          const end = start.plus({ minutes: item.durationMinutes });
          const baseRequestId = `${demoPrefix}${member.userId}:${dateValue}`;
          await tx.timeEntry.upsert({
            where: { requestId: `${baseRequestId}:in` },
            update: {
              timeSheetId: timesheet.id,
              type: "CLOCK_IN",
              timestamp: start.toJSDate(),
              entryMode: "REGULAR",
            },
            create: {
              id: randomUUID(),
              timeSheetId: timesheet.id,
              requestId: `${baseRequestId}:in`,
              type: "CLOCK_IN",
              timestamp: start.toJSDate(),
              entryMode: "REGULAR",
            },
          });
          await tx.timeEntry.upsert({
            where: { requestId: `${baseRequestId}:out` },
            update: {
              timeSheetId: timesheet.id,
              type: "CLOCK_OUT",
              timestamp: end.toJSDate(),
              entryMode: "REGULAR",
            },
            create: {
              id: randomUUID(),
              timeSheetId: timesheet.id,
              requestId: `${baseRequestId}:out`,
              type: "CLOCK_OUT",
              timestamp: end.toJSDate(),
              entryMode: "REGULAR",
            },
          });
          generatedMinutes += item.durationMinutes;
          teamRemainingMinutes -= item.durationMinutes;
          const isWeekend = item.date.weekday === 6 || item.date.weekday === 7;
          const isHoliday = holidayDates.has(dateValue);
          const calculation = TimeCalculationService.calculateDay(
            [
              { type: "CLOCK_IN", timestamp: start.toJSDate() },
              { type: "CLOCK_OUT", timestamp: end.toJSDate() },
            ],
            member.user.dailyHours,
            isWeekend,
            isHoliday,
            {
              startHour: member.user.workStartHour,
              startMinute: member.user.workStartMinute,
              endHour: member.user.workEndHour,
              endMinute: member.user.workEndMinute,
            },
          );
          await tx.timesheet.update({
            where: { id: timesheet.id },
            data: calculation,
          });
        }

        generated.push({
          name: member.user.name,
          allocatedMinutes,
          existingMinutes,
          generatedMinutes,
          days: plan.length,
        });
      }

      return {
        workspaceName: ownerMembership.workspace.name,
        monthValue,
        contractedMinutes: budget.contractedMinutes,
        generated,
      };
    },
    { maxWait: 30000, timeout: 300000 },
  );

  const totalGenerated = result.generated.reduce(
    (total, member) => total + member.generatedMinutes,
    0,
  );
  console.log(`Espaço: ${result.workspaceName}`);
  console.log(`Período: ${result.monthValue}`);
  console.log(`Cota contratada: ${floorToStep(result.contractedMinutes) / 60}h`);
  console.log(`Horas geradas: ${totalGenerated / 60}h`);
  for (const member of result.generated) {
    console.log(
      `- ${member.name}: ${member.generatedMinutes / 60}h em ${member.days} dias (cota ${member.allocatedMinutes / 60}h; base existente ${member.existingMinutes / 60}h)`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
