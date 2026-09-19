import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";
import { buildClockPresentation, type ClockState } from "@/lib/clock-presentation";
import type { ReportRow, ReportSummary } from "@/services/report.service";

const MAX_WEEK_OFFSET = 52;
const PERIODS = [
  { value: "day", label: "Hoje", title: "de hoje" },
  { value: "week", label: "Semana", title: "da semana" },
  { value: "month", label: "Mês", title: "do mês" },
] as const;

export type DashboardSearchParams = {
  period?: string | string[];
  week?: string | string[];
};

type DashboardEntry = {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  entryMode: string;
};

export type DashboardData = {
  entries: DashboardEntry[];
  clockState: ClockState;
  today: ReportSummary;
  week: ReportSummary;
  month: ReportSummary;
  weeklyRows: Pick<ReportRow, "date" | "totalWorkedMinutes">[];
  onCallDays: { totalOnCallMinutes: number }[];
};

type DashboardUser = { name: string; dailyHours: number; weeklyHours: number };

export function resolveDashboardQuery(
  query: DashboardSearchParams,
  currentTime: DateTime,
) {
  const period =
    query.period === "week" || query.period === "month" ? query.period : "day";
  const offset = typeof query.week === "string" ? Number(query.week) : 0;
  const weekOffset =
    Number.isInteger(offset) && Math.abs(offset) <= MAX_WEEK_OFFSET ? offset : 0;
  const now = currentTime.setZone(TIMEZONE).setLocale("pt-BR");
  // O resumo semanal do domínio usa domingo como primeiro dia. Aplicar a
  // mesma regra aqui evita que o total fique fora da grade diária.
  const weekStart = now
    .setLocale("en-US")
    .startOf("week")
    .plus({ weeks: weekOffset })
    .setLocale("pt-BR");
  const weekEnd = weekStart.endOf("week");

  return {
    period,
    weekOffset,
    now,
    weekStart,
    weekEnd,
    startDate: weekStart.toFormat("yyyy-MM-dd"),
    endDate: weekEnd.toFormat("yyyy-MM-dd"),
  };
}

export type DashboardQuery = ReturnType<typeof resolveDashboardQuery>;

function progressPercentage(minutes: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((minutes / target) * 100)) : 0;
}

function buildWeekActivity(
  context: DashboardQuery,
  rows: DashboardData["weeklyRows"],
  dailyMinutes: number,
) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = context.weekStart.plus({ days: index });
    const dateKey = date.toFormat("yyyy-MM-dd");
    const row = rows.find((item) => item.date === dateKey);
    return {
      dateKey,
      label: date.toFormat("ccc dd/MM"),
      isToday: date.hasSame(context.now, "day"),
      minutes: row?.totalWorkedMinutes ?? 0,
    };
  });
  const chartMax = Math.max(dailyMinutes, ...days.map((day) => day.minutes), 1);
  const weekHref = (step: number) =>
    `/dashboard?period=${context.period}&week=${context.weekOffset + step}`;

  return {
    days: days.map((day) => ({
      ...day,
      heightPercent: (day.minutes / chartMax) * 100,
    })),
    startLabel: context.weekStart.toFormat("dd/MM"),
    endLabel: context.weekEnd.toFormat("dd/MM/yyyy"),
    previousHref: context.weekOffset > -MAX_WEEK_OFFSET ? weekHref(-1) : null,
    nextHref: context.weekOffset < MAX_WEEK_OFFSET ? weekHref(1) : null,
    reportHref: `/reports?startDate=${context.startDate}&endDate=${context.endDate}`,
  };
}

/** Prepara dados para exibição sem consultar serviços ou alterar os objetos recebidos. */
export function buildDashboardModel(
  user: DashboardUser,
  data: DashboardData,
  context: DashboardQuery,
) {
  const { now, period, weekOffset } = context;
  const entries = [...data.entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const dateLabel = now.toFormat("cccc, dd 'de' LLLL");
  const dailyMinutes = Number(user.dailyHours) * 60;
  const weeklyMinutes = Number(user.weeklyHours) * 60;
  const selected =
    period === "day" ? data.today : period === "week" ? data.week : data.month;
  // O período mensal ainda não possui uma meta definida pelo domínio.
  const target =
    period === "day" ? dailyMinutes : period === "week" ? weeklyMinutes : 0;

  return {
    header: {
      firstName: user.name.split(" ")[0],
      greeting: now.hour < 12 ? "Bom dia" : now.hour < 18 ? "Boa tarde" : "Boa noite",
      dateLabel,
      periods: PERIODS.map((option) => ({
        ...option,
        active: option.value === period,
        href: `/dashboard?period=${option.value}&week=${weekOffset}`,
      })),
    },
    journey: {
      clock: {
        ...buildClockPresentation(data.clockState, now),
        dateLabel,
      },
      title: PERIODS.find((option) => option.value === period)!.title,
      workedMinutes: selected.totalWorkedMinutes,
      targetMinutes: target,
      progress: progressPercentage(selected.totalWorkedMinutes, target),
    },
    metrics: {
      workedMinutes: data.week.totalWorkedMinutes,
      weeklyHours: user.weeklyHours,
      weekProgress: progressPercentage(data.week.totalWorkedMinutes, weeklyMinutes),
      monthOvertime:
        data.month.overtime75FhcMinutes +
        data.month.overtime75FhcnMinutes +
        data.month.overtime100FhcMinutes +
        data.month.overtime100FhcnMinutes,
      onCallDays: data.onCallDays.length,
      onCallMinutes: data.onCallDays.reduce(
        (sum, day) => sum + day.totalOnCallMinutes,
        0,
      ),
    },
    activity: { ...buildWeekActivity(context, data.weeklyRows, dailyMinutes), entries },
  };
}

export type DashboardModel = ReturnType<typeof buildDashboardModel>;
