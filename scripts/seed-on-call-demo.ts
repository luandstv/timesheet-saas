import { randomUUID } from "node:crypto";

import { DateTime } from "luxon";

import { dateOnlyEnd, dateOnlyStart, formatDateOnly } from "../src/lib/date-only";
import { TIMEZONE } from "../src/lib/constants";
import { describeOnCallDay } from "../src/lib/on-call";
import prisma from "../src/lib/prisma";

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

function buildScheduleDates(month: DateTime, personIndex: number) {
  return Array.from({ length: month.daysInMonth ?? 0 }, (_, index) =>
    month.set({ day: index + 1 }),
  ).filter((date) => {
    const day = date.day;
    return day === personIndex + 1 || (day + personIndex * 2) % 7 === 0;
  });
}

async function main() {
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

  const month = DateTime.now().setZone(TIMEZONE).startOf("month");
  const monthStart = dateOnlyStart(month);
  const monthEnd = dateOnlyEnd(month.endOf("month"));
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { date: true },
  });
  const holidayDates = new Set(holidays.map((holiday) => formatDateOnly(holiday.date)));

  const result = await prisma.$transaction(
    async (tx) => {
      const people: { id: string; name: string; email: string; dates: DateTime[] }[] =
        [];

      for (const [index, [name, email]] of DEMO_PEOPLE.entries()) {
        const existing = await tx.user.findUnique({ where: { email } });
        const person = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: {
                name,
                role: "COLLABORATOR",
                managerId: owner.id,
                dailyHours: 8,
                weeklyHours: 40,
                workStartHour: 8,
                workStartMinute: 0,
                workEndHour: 17,
                workEndMinute: 0,
              },
            })
          : await tx.user.create({
              data: {
                id: randomUUID(),
                email,
                name,
                role: "COLLABORATOR",
                managerId: owner.id,
              },
            });

        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: ownerMembership.workspaceId,
              userId: person.id,
            },
          },
          update: { active: true, role: "COLLABORATOR", managerId: ownerMembership.id },
          create: {
            workspaceId: ownerMembership.workspaceId,
            userId: person.id,
            active: true,
            role: "COLLABORATOR",
            managerId: ownerMembership.id,
          },
        });

        const dates = buildScheduleDates(month, index);
        for (const date of dates) {
          const dateValue = date.toFormat("yyyy-MM-dd");
          const details = describeOnCallDay(date, null, holidayDates);
          await tx.onCallSchedule.upsert({
            where: {
              workspaceId_userId_date: {
                workspaceId: ownerMembership.workspaceId,
                userId: person.id,
                date: dateOnlyStart(dateValue),
              },
            },
            update: {
              totalOnCallMinutes: details.totalOnCallMinutes,
              holidayOverride: null,
            },
            create: {
              workspaceId: ownerMembership.workspaceId,
              userId: person.id,
              date: dateOnlyStart(dateValue),
              totalOnCallMinutes: details.totalOnCallMinutes,
              holidayOverride: null,
            },
          });
        }

        people.push({ id: person.id, name: person.name, email: person.email, dates });
      }

      return people;
    },
    { maxWait: 10000, timeout: 30000 },
  );

  const scheduledDays = new Set(
    result.flatMap((person) => person.dates.map((date) => date.day)),
  );
  console.log(`Espaço: ${ownerMembership.workspace.name}`);
  console.log(`Responsável: ${owner.name} (${owner.email})`);
  console.log(`Período: ${month.toFormat("yyyy-MM")}`);
  console.log(`Colaboradores preparados: ${result.length}`);
  console.log(`Dias com pelo menos uma escala: ${scheduledDays.size}`);
  for (const person of result) {
    console.log(`- ${person.name}: ${person.email} (${person.dates.length} dias)`);
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
