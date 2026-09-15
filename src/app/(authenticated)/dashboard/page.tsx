import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clock3,
  EllipsisVertical,
  TrendingUp,
} from "lucide-react";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockCard } from "@/components/shared/clock-card";
import { TimeEntriesList } from "@/components/shared/time-entries-list";
import { getAuthenticatedUser } from "@/lib/auth";
import { formatMinutesToHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  buildDashboardModel,
  resolveDashboardQuery,
  type DashboardSearchParams,
} from "./_lib/dashboard";
import { loadDashboardData } from "./_lib/load-dashboard";

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground">
      {children}
    </span>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-muted"
    >
      <div
        style={{ width: `${value}%` }}
        className="h-full rounded-full bg-primary"
      />
    </div>
  );
}

function DetailsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="-mr-2 ml-auto rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      <EllipsisVertical className="size-4" />
    </Link>
  );
}

type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await getAuthenticatedUser();
  const context = resolveDashboardQuery((await searchParams) ?? {}, DateTime.now());
  const data = await loadDashboardData(user.id, context);
  const model = buildDashboardModel(user, data, context);
  const { header, journey, metrics, activity } = model;
  const { weekStart, weekEnd } = context;
  const { firstName, greeting, dateLabel, periods } = header;
  const { entries, days } = activity;
  const { progress, targetMinutes: target } = journey;
  const {
    workedMinutes: weekWorkedMinutes,
    weekProgress,
    monthOvertime,
  } = metrics;
  const { reportHref, previousHref, nextHref } = activity;
  const selected = {
    workedMinutes: journey.workedMinutes,
    targetMinutes: target,
  };

  return (
    <div className="relative mx-auto w-full max-w-360 space-y-4">
      <section className="relative isolate pb-2">
        <Image
          src="/jornix/mountains.svg"
          width={900}
          height={300}
          alt=""
          priority
          className="pointer-events-none absolute -top-8 right-0 -z-10 h-48 w-2/3 object-cover object-top opacity-[0.06] dark:opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]"
        />
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-foreground">
              {greeting}, {firstName}
            </p>
            <h1 className="max-w-5xl text-2xl leading-tight font-bold tracking-tight sm:text-3xl 2xl:text-[38px]">
              O dia está andando no ritmo certo, {firstName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {dateLabel}. Registre o próximo movimento e deixe o restante da
              jornada com o Jornix.
            </p>
          </div>
          <blockquote className="hidden w-44 shrink-0 pt-1 text-sm leading-6 text-muted-foreground 2xl:block">
            <span className="mb-1 block text-xl text-accent-foreground">—</span>
            “Disciplina hoje,
            <br />
            resultados amanhã.”
          </blockquote>
        </div>
        <nav
          aria-label="Período do resumo"
          className="mt-4 ml-auto flex w-full max-w-72 rounded-2xl border border-border bg-card/80 p-0.5"
        >
          {periods.map(({ value, label, active, href }) => (
            <Link
              key={value}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 rounded-xl px-4 py-2 text-center text-xs focus-visible:outline-2 focus-visible:outline-ring",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <ClockCard
          {...journey.clock}
        />
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <IconTile>
              <ChartNoAxesCombined className="size-6" />
            </IconTile>
            <div className="min-w-0">
              <CardTitle>
                Jornada {journey.title}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Total dos períodos apurados
              </p>
            </div>
            <Clock3 className="mt-1 ml-auto size-5 shrink-0 text-accent-foreground" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-8">
            <div>
              <p className="text-[clamp(2rem,3.5vw,3.5rem)] leading-tight font-bold tracking-tight tabular-nums">
                {formatMinutesToHours(selected.workedMinutes)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {target > 0
                  ? `de ${formatMinutesToHours(target)} previstas`
                  : "Apuração consolidada no mês"}
              </p>
            </div>
            {target > 0 ? (
              <div className="mt-auto space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress}% concluído</span>
                  <span>{formatMinutesToHours(target)}</span>
                </div>
                <Progress value={progress} label="Meta do período" />
              </div>
            ) : (
              <Link
                href="/reports"
                className="mt-auto text-sm underline underline-offset-4"
              >
                Consultar relatório mensal
              </Link>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <IconTile>
              <TrendingUp className="size-5" />
            </IconTile>
            <CardTitle className="text-sm">Horas da semana</CardTitle>
            <DetailsLink href="/reports" label="Ver detalhes da semana" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatMinutesToHours(weekWorkedMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">
              Meta semanal: {user.weeklyHours}h
            </p>
            <Progress value={weekProgress} label="Meta semanal" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{weekProgress}% da meta</span>
              <span>{user.weeklyHours}h</span>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <IconTile>
              <Clock3 className="size-5" />
            </IconTile>
            <CardTitle className="text-sm">Horas extras no mês</CardTitle>
            <DetailsLink
              href="/reports"
              label="Ver detalhes das horas extras"
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatMinutesToHours(monthOvertime)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Apuração consolidada até hoje
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-start gap-3">
            <IconTile>
              <Bell className="size-5" />
            </IconTile>
            <div>
              <CardTitle className="text-sm">Sobreaviso</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Planejamento mensal
              </p>
            </div>
            <DetailsLink
              href="/on-call"
              label="Ver planejamento de sobreaviso"
            />
          </CardHeader>
          <CardContent>
            {/* TODO(JORNIX-UI-01): integrar sobreaviso ao serviço real. Nunca somar este mock aos totais. */}
            <Badge
              variant="outline"
              className="border-primary/30 bg-accent text-accent-foreground"
            >
              Mock temporário · TODO
            </Badge>
            <p className="mt-2 text-2xl font-bold tracking-tight">0 dias</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Dado de demonstração até a integração real
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-4">
            <IconTile>
              <ChartNoAxesCombined className="size-6" />
            </IconTile>
            <div>
              <CardTitle className="text-lg">
                A jornada se desenha aqui
              </CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Acompanhe seus registros, horas e evolução ao longo do tempo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-card text-xs">
              <span className="flex items-center gap-2 px-3 py-2.5">
                <CalendarDays className="size-4 text-muted-foreground" />
              {weekStart.toFormat("dd/MM")} – {weekEnd.toFormat("dd/MM/yyyy")}
              </span>
              {previousHref && (
                <Link
                  href={previousHref}
                  scroll={false}
                  aria-label="Semana anterior"
                  className="border-l border-border p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              )}
              {nextHref && (
                <Link
                  href={nextHref}
                  scroll={false}
                  aria-label="Próxima semana"
                  className="border-l border-border p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
            <Button asChild variant="outline" className="rounded-lg">
              <Link href={reportHref}>
                <ChartNoAxesCombined className="text-accent-foreground" />
                Ver relatórios
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-x-auto rounded-xl border border-border"
            tabIndex={0}
            aria-label="Horas por dia da semana"
          >
            <div className="grid min-w-[560px] grid-cols-7 divide-x divide-border">
              {days.map(({ minutes, heightPercent, dateKey, label, isToday }) => (
                <div
                  key={dateKey}
                  className={cn(
                    "px-3 py-4 text-center",
                    isToday && "bg-primary/[0.04]",
                  )}
                >
                  <p className="text-xs capitalize text-muted-foreground">
                    {label}
                  </p>
                  <div className="mt-4 flex h-20 items-end justify-center border-b border-border">
                    <div
                      className="w-7 rounded-t-md bg-primary/80"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium tabular-nums">
                    {minutes ? formatMinutesToHours(minutes) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {minutes ? "apuradas" : "Sem horas apuradas"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Registros de hoje</h3>
            <Link
              href="/time-entries"
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Ver meu ponto
            </Link>
          </div>
          <div className="mt-4">
            <TimeEntriesList entries={entries} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
