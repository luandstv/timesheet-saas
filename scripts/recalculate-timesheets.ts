/**
 * Recalcula total_worked_minutes / normal_minutes / overtime_* de timesheets
 * que foram criados sem passar pelo fluxo normal de clock-in/clock-out da
 * aplicação (por exemplo, massa de dados inserida via SQL direto no Supabase).
 *
 * Por que isso é necessário:
 * O único lugar que hoje dispara o cálculo é `TimeEntryService.clockIn`,
 * que só roda quando o próprio app registra um CLOCK_OUT. Não existe
 * trigger no banco nem rota funcional para recalcular manualmente ainda
 * (a pasta src/app/api/test-calc está vazia). Este script reaproveita o
 * `TimeCalculationService` já existente para preencher esses campos "por
 * fora", sem precisar esperar a rota /api/test-calc ser implementada.
 *
 * Uso:
 *   npx tsx scripts/recalculate-timesheets.ts
 *   npx tsx scripts/recalculate-timesheets.ts --user-id=<uuid>
 *   npx tsx scripts/recalculate-timesheets.ts --user-id=<uuid> --start=2026-07-01 --end=2026-07-31
 *
 * Sem --start/--end, o script recalcula o mês passado por padrão.
 */

import { DateTime } from "luxon";
import prisma from "@/lib/prisma";
import { TimeCalculationService } from "@/services/time-calculation.service";
import { TIMEZONE } from "@/lib/constants";

const DEFAULT_USER_ID = "91d28f84-3c90-49b5-9e24-41249d68de8d";

function parseArgs() {
  const options: Record<string, string> = {};

  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      options[match[1]] = match[2];
    }
  }

  return options;
}

function getLastMonthRange() {
  const now = DateTime.now().setZone(TIMEZONE);
  const lastMonth = now.minus({ months: 1 });

  return {
    start: lastMonth.startOf("month").toJSDate(),
    end: lastMonth.endOf("month").toJSDate(),
  };
}

function parseCustomRange(startStr: string, endStr: string) {
  const start = DateTime.fromFormat(startStr, "yyyy-MM-dd", { zone: TIMEZONE });
  const end = DateTime.fromFormat(endStr, "yyyy-MM-dd", { zone: TIMEZONE });

  if (!start.isValid || !end.isValid) {
    throw new Error(
      `Datas inválidas: --start=${startStr} --end=${endStr} (use o formato yyyy-MM-dd)`,
    );
  }

  return {
    start: start.startOf("day").toJSDate(),
    end: end.endOf("day").toJSDate(),
  };
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

async function main() {
  const options = parseArgs();
  const userId = options["user-id"] ?? DEFAULT_USER_ID;

  const { start, end } =
    options.start && options.end
      ? parseCustomRange(options.start, options.end)
      : getLastMonthRange();

  const startLabel = DateTime.fromJSDate(start)
    .setZone(TIMEZONE)
    .toFormat("yyyy-MM-dd");
  const endLabel = DateTime.fromJSDate(end).setZone(TIMEZONE).toFormat("yyyy-MM-dd");

  console.log(`Recalculando timesheets do usuário ${userId}`);
  console.log(`Período: ${startLabel} a ${endLabel}\n`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyHours: true,
      workStartHour: true,
      workStartMinute: true,
      workEndHour: true,
      workEndMinute: true,
    },
  });

  if (!user) {
    console.error(`Usuário ${userId} não encontrado no banco.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const schedule = {
    startHour: user.workStartHour,
    startMinute: user.workStartMinute,
    endHour: user.workEndHour,
    endMinute: user.workEndMinute,
  };

  const timeSheets = await prisma.timesheet.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });

  if (timeSheets.length === 0) {
    console.log("Nenhum timesheet encontrado nesse período para esse usuário.");
    await prisma.$disconnect();
    return;
  }

  let processed = 0;
  let failed = 0;

  for (const sheet of timeSheets) {
    const dateLabel = DateTime.fromJSDate(sheet.date)
      .setZone(TIMEZONE)
      .toFormat("yyyy-MM-dd");

    try {
      const result = await TimeCalculationService.calculateAndUpdateTimeSheet(
        sheet.id,
        user.dailyHours,
        schedule,
      );

      if (!result) {
        console.warn(
          `  [!] ${dateLabel} - timesheet não encontrado durante o cálculo (id: ${sheet.id})`,
        );
        failed++;
        continue;
      }

      processed++;
      console.log(
        `  [ok] ${dateLabel} | total: ${formatMinutes(result.totalWorkedMinutes)} | ` +
          `normal: ${formatMinutes(result.normalMinutes)} | ` +
          `75% FHC: ${formatMinutes(result.overtime75FhcMinutes)} | ` +
          `75% FHCN: ${formatMinutes(result.overtime75FhcnMinutes)} | ` +
          `100% FHC: ${formatMinutes(result.overtime100FhcMinutes)} | ` +
          `100% FHCN: ${formatMinutes(result.overtime100FhcnMinutes)}`,
      );
    } catch (error) {
      failed++;
      console.error(`  [erro] ${dateLabel} (id: ${sheet.id}):`, error);
    }
  }

  console.log(
    `\n${processed}/${timeSheets.length} timesheets recalculados com sucesso.`,
  );
  if (failed > 0) {
    console.log(`${failed} falharam - veja os logs acima.`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro ao recalcular timesheets:", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
