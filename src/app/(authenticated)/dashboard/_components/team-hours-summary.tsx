"use client";

import Link from "next/link";
import {
  addTransitionType,
  startTransition as startPageTransition,
  useMemo,
  useState,
  ViewTransition,
} from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Info,
  Search,
  UsersRound,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinutesToHours } from "@/lib/format";
import type {
  HoursBudgetOverview,
  HoursMemberSummary,
} from "@/services/hours-budget.service";

type SortMode = "consumption" | "name" | "remaining";
const MEMBERS_PER_PAGE = 8;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "blue" | "green" | "red";
  icon: React.ReactNode;
}) {
  const tones = {
    amber: "bg-primary/12 text-primary",
    blue: "bg-sky-500/12 text-sky-300",
    green: "bg-emerald-500/12 text-emerald-300",
    red: "bg-destructive/12 text-destructive",
  } as const;

  return (
    <div className="rounded-2xl border border-border/70 bg-background/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {label}
            <Info className="size-3.5" aria-hidden="true" />
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function getMemberStatus(member: HoursMemberSummary) {
  if (member.overageMinutes > 0) {
    return {
      label: "Acima do limite",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    };
  }
  if (member.workedMinutes > 0) {
    return {
      label: "Em uso",
      className: "border-primary/25 bg-primary/10 text-primary",
    };
  }
  return {
    label: "Sem uso",
    className: "border-border bg-muted/40 text-muted-foreground",
  };
}

export function TeamHoursSummary({
  overview,
  canManage,
}: {
  overview: HoursBudgetOverview | null;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("consumption");
  const [memberPage, setMemberPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const members = (overview?.members ?? []).filter((member) => {
      if (!normalizedQuery) return true;
      return (
        member.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
        member.email.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      );
    });

    return [...members].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "remaining") return b.remainingMinutes - a.remainingMinutes;
      return b.workedMinutes - a.workedMinutes;
    });
  }, [overview?.members, query, sort]);

  const memberPageCount = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );
  const currentMemberPage = Math.min(memberPage, memberPageCount);
  const pageStart = (currentMemberPage - 1) * MEMBERS_PER_PAGE;
  const pageMembers = filteredMembers.slice(pageStart, pageStart + MEMBERS_PER_PAGE);
  const visiblePageNumbers = Array.from(
    { length: Math.min(5, memberPageCount) },
    (_, index) =>
      Math.max(1, Math.min(currentMemberPage - 2, memberPageCount - 4)) + index,
  );

  function goToMemberPage(page: number) {
    const nextPage = Math.max(1, Math.min(memberPageCount, page));
    if (nextPage === currentMemberPage) return;
    startPageTransition(() => {
      addTransitionType(
        nextPage > currentMemberPage ? "team-hours-next" : "team-hours-previous",
      );
      setMemberPage(nextPage);
    });
  }

  if (!overview) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Horas contratadas do time</CardTitle>
            <CardDescription>
              Ative o controle mensal para acompanhar metas, consumo e excedentes.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={canManage ? "/settings#hours-features" : "/team-hours"}>
              {canManage ? "Configurar" : "Ver controle"}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Informe as horas contratadas na tela do time para começar."
              : "O owner ou gestor ainda precisa ativar este recurso neste espaço."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const consumedPercent =
    overview.contractedMinutes > 0
      ? Math.min(100, (overview.consumedMinutes / overview.contractedMinutes) * 100)
      : 0;
  const progress = Math.min(100, Math.max(0, overview.percentUsed));
  const markerPosition = Math.min(99, Math.max(1, consumedPercent));
  const isOverLimit = overview.overageMinutes > 0;
  const availableLabel = isOverLimit ? "Excedentes" : "Disponíveis";
  const availableValue = isOverLimit
    ? overview.overageMinutes
    : overview.availableMinutes;

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-[0_20px_65px_-42px_rgba(0,0,0,0.8)]">
      <CardHeader className="border-b border-border/60 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="flex items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/15">
              <UsersRound className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Horas contratadas do time
              </CardTitle>
              <CardDescription className="mt-1">
                Competência {overview.month}
                <span className="px-2 text-border" aria-hidden="true">
                  •
                </span>
                Consumo efetivo da equipe.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-background/20 px-3.5"
              aria-label={`Competência ${overview.month}`}
            >
              <CalendarDays
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="leading-tight">
                <span className="block text-[11px] text-muted-foreground">
                  Competência
                </span>
                <span className="block text-sm font-medium tabular-nums">
                  {overview.month}
                </span>
              </span>
              <ChevronDown
                className="ml-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <Button
              asChild
              className="h-11 gap-2 px-4 shadow-[0_8px_24px_-12px_var(--primary)]"
            >
              <Link href={`/team-hours?month=${overview.month}`}>
                Ver detalhes
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:space-y-5 sm:p-7">
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label="Contratadas"
            value={formatMinutesToHours(overview.contractedMinutes)}
            detail="Total de horas contratadas para o período."
            tone="amber"
            icon={<Database className="size-6" />}
          />
          <StatCard
            label="Consumidas"
            value={formatMinutesToHours(overview.consumedMinutes)}
            detail="Horas registradas pela equipe."
            tone="blue"
            icon={<Clock3 className="size-6" />}
          />
          <StatCard
            label={availableLabel}
            value={formatMinutesToHours(availableValue)}
            detail={
              isOverLimit
                ? "Horas acima do contrato neste período."
                : "Saldo de horas para o período."
            }
            tone={isOverLimit ? "red" : "green"}
            icon={<Zap className="size-6" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.7fr)]">
          <div className="rounded-2xl border border-border/70 bg-background/20 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-base font-semibold">
                  Progresso do pool
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {progress}% das horas contratadas foram consumidas.
                </p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="mt-5">
              <div
                className="relative h-3 rounded-full bg-muted/80"
                role="progressbar"
                aria-label="Progresso das horas contratadas"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full ${isOverLimit ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${progress}%` }}
                />
                <span
                  className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-card shadow-[0_0_0_4px_rgba(255,180,94,0.14)] ${isOverLimit ? "bg-destructive" : "bg-primary"}`}
                  style={{ left: `calc(${markerPosition}% - 10px)` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>0h</span>
                <span>{formatMinutesToHours(overview.contractedMinutes)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-border/70 bg-background/20 p-4 sm:p-5">
            <div
              className="relative flex size-28 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${isOverLimit ? "var(--destructive)" : "var(--primary)"} ${consumedPercent}%, var(--muted) 0)`,
              }}
              role="img"
              aria-label={`${Math.round(consumedPercent)}% das horas contratadas consumidas`}
            >
              <div className="flex size-[84px] flex-col items-center justify-center rounded-full bg-card text-center ring-1 ring-border/60">
                <span className="text-xl font-semibold tabular-nums">{progress}%</span>
                <span className="text-[11px] text-muted-foreground">utilizado</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  Consumidas
                </span>
                <span className="font-medium tabular-nums">
                  {formatMinutesToHours(overview.consumedMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2 rounded-full bg-muted-foreground/60"
                    aria-hidden="true"
                  />
                  {availableLabel}
                </span>
                <span className="font-medium tabular-nums">
                  {formatMinutesToHours(availableValue)}
                </span>
              </div>
              <div className="border-t border-border/70 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">
                    {formatMinutesToHours(overview.contractedMinutes)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-background/15">
          <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div>
              <h3 className="font-heading text-base font-semibold">
                Consumo por colaborador
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Acompanhe o uso de horas por cada membro do time.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative sm:w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMemberPage(1);
                  }}
                  placeholder="Buscar colaborador..."
                  aria-label="Buscar colaborador"
                  className="h-10 pl-9"
                />
              </div>
              <div className="flex h-10 items-center gap-2 text-xs text-muted-foreground">
                <span className="whitespace-nowrap">Ordenar por</span>
                <Select
                  value={sort}
                  onValueChange={(value: SortMode) => {
                    setSort(value);
                    setMemberPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Ordenar colaboradores"
                    className="h-10 w-40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumption">Maior consumo</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="remaining">Maior saldo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(180px,1.1fr)_150px_minmax(180px,1.4fr)_80px_126px_20px] gap-4 bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span>Colaborador</span>
            <span>Horas consumidas</span>
            <span />
            <span>% da cota</span>
            <span>Status</span>
            <span />
          </div>

          <ViewTransition
            key={currentMemberPage}
            name="dashboard-team-hours-member-page"
            share={{
              "team-hours-next": "team-hours-next",
              "team-hours-previous": "team-hours-previous",
              default: "none",
            }}
            default="none"
          >
            <div className={memberPageCount > 1 ? "lg:min-h-128" : ""}>
              {pageMembers.length ? (
                pageMembers.map((member) => {
                  const status = getMemberStatus(member);
                  const memberProgress = Math.min(100, Math.max(0, member.percentUsed));
                  return (
                    <Link
                      key={member.memberId}
                      href={`/team-hours/${member.memberId}?month=${overview.month}`}
                      className="grid gap-3 border-b border-border/60 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-accent/20 focus-visible:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[minmax(180px,1.1fr)_150px_minmax(180px,1.4fr)_80px_126px_20px] lg:items-center lg:gap-4 lg:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border/70">
                          {initials(member.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {member.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        </span>
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground lg:text-foreground">
                        {formatMinutesToHours(member.workedMinutes)}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className={`block h-full rounded-full ${member.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${memberProgress}%` }}
                          />
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {member.percentUsed}%
                      </span>
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        <span
                          className="size-1.5 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {status.label}
                      </span>
                      <ArrowUpRight
                        className="hidden size-4 text-muted-foreground lg:block"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhum colaborador encontrado para esta busca.
                </div>
              )}
            </div>
          </ViewTransition>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span aria-live="polite">
              Mostrando {filteredMembers.length === 0 ? 0 : pageStart + 1}–
              {Math.min(pageStart + MEMBERS_PER_PAGE, filteredMembers.length)} de{" "}
              {filteredMembers.length} colaboradores
            </span>
            {memberPageCount > 1 && (
              <nav
                aria-label="Páginas de colaboradores"
                className="flex items-center gap-1"
              >
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label="Página anterior"
                  onClick={() => goToMemberPage(currentMemberPage - 1)}
                  disabled={currentMemberPage === 1}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                {visiblePageNumbers.map((page) => (
                  <Button
                    key={page}
                    type="button"
                    size="icon-sm"
                    variant={page === currentMemberPage ? "default" : "ghost"}
                    aria-label={`Página ${page}`}
                    aria-current={page === currentMemberPage ? "page" : undefined}
                    onClick={() => goToMemberPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label="Próxima página"
                  onClick={() => goToMemberPage(currentMemberPage + 1)}
                  disabled={currentMemberPage === memberPageCount}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </nav>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
