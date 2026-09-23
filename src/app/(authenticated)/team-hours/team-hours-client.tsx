"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addTransitionType,
  startTransition as startPageTransition,
  useMemo,
  useRef,
  useState,
  useTransition,
  ViewTransition,
} from "react";
import { DateTime } from "luxon";
import {
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Save,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinutesToHours } from "@/lib/format";
import { formatHoursInput, parseHoursInput } from "@/lib/hours-allocation";
import { TIMEZONE } from "@/lib/constants";
import type {
  HoursBudgetOverview,
  HoursMemberSummary,
} from "@/services/hours-budget.service";
import { ReportFormatActions } from "../reports/_components/report-format-actions";
import {
  changeHoursBudgetStatus,
  saveHoursAllocations,
  saveHoursBudget,
  saveHoursFeatures,
  saveHoursRule,
} from "./actions";

const weekdayOptions = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [7, "Dom"],
] as const;

const monthOptions = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"],
] as const;

type HoursActionKind = "budget" | "allocation" | "rule" | "features" | "closure";
type HoursFeedback = { kind: HoursActionKind; message: string; ok: boolean };
type MemberSortKey = "name" | "worked" | "allocated" | "remaining" | "status";
type MemberFilter = "all" | "attention" | "overage" | "without-target";
const MEMBERS_PER_PAGE = 8;

function isMemberInAttention(member: HoursMemberSummary) {
  return member.overageMinutes > 0 || member.percentUsed >= 80;
}

function memberStatus(member: HoursMemberSummary) {
  if (member.overageMinutes > 0) return "Excedente";
  if (member.allocatedMinutes === 0) return "Sem meta";
  if (member.percentUsed >= 80) return "Atenção";
  return "Dentro da meta";
}

function ActionFeedback({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${ok ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-destructive/35 bg-destructive/10 text-destructive"}`}
      role={ok ? "status" : "alert"}
    >
      {ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{message}</span>
    </div>
  );
}

function monthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function formatDateLabel(value: string) {
  const date = DateTime.fromISO(value, { zone: TIMEZONE });
  return date.isValid ? date.toFormat("dd/MM/yyyy") : "Selecione a data";
}

function getWeekday(value: string) {
  return DateTime.fromISO(value, { zone: TIMEZONE }).weekday;
}

function TeamHoursDatePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = value
    ? DateTime.fromISO(value, { zone: TIMEZONE }).toJSDate()
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-10 w-full justify-start text-left font-normal"
        >
          <CalendarDays
            className="mr-2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className={!value ? "text-muted-foreground" : undefined}>
            {formatDateLabel(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(
              date
                ? DateTime.fromJSDate(date, { zone: TIMEZONE }).toFormat("yyyy-MM-dd")
                : "",
            );
          }}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

export function TeamHoursClient({
  overview,
  workspaceId,
  month,
  canManage,
  canConfigureFeatures,
}: {
  overview: HoursBudgetOverview | null;
  workspaceId: string;
  month: string;
  canManage: boolean;
  canConfigureFeatures: boolean;
}) {
  const [budgetHours, setBudgetHours] = useState(
    overview ? formatHoursInput(overview.contractedMinutes) : "",
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      overview?.members.map((member) => [
        member.memberId,
        formatHoursInput(member.allocatedMinutes),
      ]) ?? [],
    ),
  );
  const [selectedMember, setSelectedMember] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>("worked");
  const [memberSortDirection, setMemberSortDirection] = useState<"asc" | "desc">(
    "desc",
  );
  const [memberPage, setMemberPage] = useState(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [bulkHours, setBulkHours] = useState("6");
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkHasError, setBulkHasError] = useState(false);
  const [startDate, setStartDate] = useState(`${month}-01`);
  const [endDate, setEndDate] = useState(monthEndDate(month));
  const [dailyHours, setDailyHours] = useState("6");
  const [shiftLabel, setShiftLabel] = useState("Tarde");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [feedback, setFeedback] = useState<HoursFeedback | null>(null);
  const [activeAction, setActiveAction] = useState<HoursActionKind | null>(null);
  const actionInFlight = useRef(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isBusy = pending || activeAction !== null;

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase("pt-BR");
    return [...(overview?.members ?? [])]
      .filter((member) => {
        const matchesSearch =
          !query ||
          member.name.toLocaleLowerCase("pt-BR").includes(query) ||
          member.email.toLocaleLowerCase("pt-BR").includes(query);
        const matchesFilter =
          memberFilter === "all" ||
          (memberFilter === "attention" && isMemberInAttention(member)) ||
          (memberFilter === "overage" && member.overageMinutes > 0) ||
          (memberFilter === "without-target" && member.allocatedMinutes === 0);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const comparison =
          memberSortKey === "name"
            ? a.name.localeCompare(b.name, "pt-BR")
            : memberSortKey === "worked"
              ? a.workedMinutes - b.workedMinutes
              : memberSortKey === "allocated"
                ? a.allocatedMinutes - b.allocatedMinutes
                : memberSortKey === "remaining"
                  ? a.remainingMinutes - b.remainingMinutes
                  : memberStatus(a).localeCompare(memberStatus(b), "pt-BR");
        return (
          (memberSortDirection === "asc" ? comparison : -comparison) ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      });
  }, [
    overview?.members,
    memberSearch,
    memberFilter,
    memberSortKey,
    memberSortDirection,
  ]);
  const memberPageCount = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );
  const currentMemberPage = Math.min(memberPage, memberPageCount);
  const pageMembers = filteredMembers.slice(
    (currentMemberPage - 1) * MEMBERS_PER_PAGE,
    currentMemberPage * MEMBERS_PER_PAGE,
  );
  const allPageMembersSelected =
    pageMembers.length > 0 &&
    pageMembers.every((member) => selectedMemberIds.includes(member.memberId));
  const somePageMembersSelected = pageMembers.some((member) =>
    selectedMemberIds.includes(member.memberId),
  );

  function changeMemberSort(key: MemberSortKey) {
    if (memberSortKey === key) {
      setMemberSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setMemberSortKey(key);
      setMemberSortDirection(key === "name" ? "asc" : "desc");
    }
    setMemberPage(1);
  }

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

  function togglePageSelection() {
    const ids = pageMembers.map((member) => member.memberId);
    setSelectedMemberIds((current) =>
      allPageMembersSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  }

  function applyBulkHours() {
    const minutes = parseHoursInput(bulkHours);
    if (minutes === null) {
      setBulkHasError(true);
      setBulkMessage("Informe horas válidas com no máximo duas casas decimais.");
      return;
    }
    if (selectedMemberIds.length === 0) return;
    setAllocations((current) => {
      const next = { ...current };
      for (const memberId of selectedMemberIds)
        next[memberId] = formatHoursInput(minutes);
      return next;
    });
    setBulkHasError(false);
    setBulkMessage(
      `Meta de ${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "pessoa alterada" : "pessoas alteradas"}. Salve a distribuição para confirmar.`,
    );
  }

  function run(
    kind: HoursActionKind,
    action: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActiveAction(kind);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await action();
        setFeedback({
          kind,
          message: result.message ?? "Operação concluída.",
          ok: result.ok,
        });
        if (kind === "allocation" && result.ok) {
          setBulkMessage(null);
          setSelectedMemberIds([]);
        }
      } catch {
        setFeedback({
          kind,
          message: "Não foi possível concluir a operação. Tente novamente.",
          ok: false,
        });
      } finally {
        actionInFlight.current = false;
        setActiveAction(null);
      }
    });
  }

  function saveBudget() {
    const contractedMinutes = parseHoursInput(budgetHours);
    if (contractedMinutes === null) {
      setFeedback({
        kind: "budget",
        message: "Informe horas válidas com no máximo duas casas decimais.",
        ok: false,
      });
      return;
    }
    run("budget", async () => {
      const result = await saveHoursBudget({
        workspaceId,
        month,
        contractedMinutes,
      });
      if (result.ok) setBudgetHours(formatHoursInput(contractedMinutes));
      return result;
    });
  }

  if (!overview) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>Controle de horas do time</CardTitle>
          <CardDescription>
            Ative o recurso informando o pool mensal contratado para esta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="initial-budget">Horas contratadas no mês atual</Label>
            <Input
              id="initial-budget"
              value={budgetHours}
              onChange={(event) => setBudgetHours(event.target.value)}
              placeholder="Ex.: 300"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          <Button type="button" onClick={saveBudget} disabled={isBusy || !canManage}>
            {activeAction === "budget" ? (
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {activeAction === "budget" ? "Ativando…" : "Ativar controle"}
          </Button>
          {!canManage && (
            <p className="text-sm text-muted-foreground">
              Somente gestores podem ativar este controle.
            </p>
          )}
          <ActionFeedback
            message={feedback?.kind === "budget" ? feedback.message : null}
            ok={feedback?.ok ?? false}
          />
        </CardContent>
      </Card>
    );
  }

  const progress = Math.min(100, Math.max(0, overview.percentUsed));
  const attentionCount = overview.members.filter(isMemberInAttention).length;
  const activeRules = overview.rules
    .filter((rule) => rule.active)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activeRuleCount = activeRules.length;
  const parsedAllocations = overview.members.map((member) => ({
    member,
    allocatedMinutes: parseHoursInput(allocations[member.memberId] ?? "0"),
  }));
  const hasInvalidAllocation = parsedAllocations.some(
    (item) => item.allocatedMinutes === null,
  );
  const changedAllocations = parsedAllocations.flatMap(
    ({ member, allocatedMinutes }) =>
      allocatedMinutes !== null && allocatedMinutes !== member.allocatedMinutes
        ? [{ memberId: member.memberId, allocatedMinutes }]
        : [],
  );
  const changedAllocationCount = changedAllocations.length;
  const selectedRuleMember = overview.members.find(
    (member) => member.memberId === selectedMember,
  );
  const pageStart = (currentMemberPage - 1) * MEMBERS_PER_PAGE;
  const visiblePageNumbers = Array.from(
    { length: Math.min(5, memberPageCount) },
    (_, index) =>
      Math.max(1, Math.min(currentMemberPage - 2, memberPageCount - 4)) + index,
  );
  const hasOverage = overview.overageMinutes > 0;
  const consumptionStatus = hasOverage
    ? "Limite ultrapassado"
    : overview.percentUsed >= 80
      ? "Consumo em atenção"
      : "Consumo saudável";
  const isSingleDayRule = Boolean(startDate) && startDate === endDate;
  const singleDayWeekday = getWeekday(startDate);
  const singleDayName = DateTime.fromISO(startDate, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("cccc");
  const selectedYear = month.slice(0, 4);
  const selectedMonth = month.slice(5);
  const yearOptions = Array.from({ length: 11 }, (_, index) =>
    String(Number(selectedYear) - 5 + index),
  );
  return (
    <div className="space-y-6">
      <section
        className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
        aria-label="Resumo das horas do time"
      >
        <div className="flex min-h-72 flex-col justify-center rounded-2xl border border-primary/25 bg-card bg-linear-to-br from-primary/[0.08] via-transparent to-transparent p-6 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <UsersRound className="size-7" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Controle contratual
            </p>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${overview.status === "OPEN" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-muted/60 text-muted-foreground"}`}
            >
              <span
                className={`size-2 rounded-full ${overview.status === "OPEN" ? "bg-emerald-500" : "bg-muted-foreground"}`}
                aria-hidden="true"
              />
              {overview.status === "OPEN"
                ? "Competência ativa"
                : "Competência encerrada"}
            </span>
          </div>
          <h1 className="mt-7 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Horas do time
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Distribua a meta mensal, acompanhe o consumo e comunique mudanças de turno.
          </p>
        </div>

        <div className="flex min-h-72 flex-col items-start gap-5 rounded-2xl border border-border bg-card bg-linear-to-br from-primary/[0.04] to-transparent p-6 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-7">
          <div
            className="relative flex size-28 shrink-0 items-center justify-center rounded-full sm:size-36"
            style={{
              background: `conic-gradient(${hasOverage ? "var(--destructive)" : "var(--primary)"} ${progress}%, var(--muted) ${progress}% 100%)`,
            }}
            role="progressbar"
            aria-label="Horas contratadas utilizadas"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="flex size-[calc(100%-12px)] flex-col items-center justify-center rounded-full bg-card text-center">
              <strong className="text-2xl leading-none font-bold tabular-nums sm:text-3xl">
                {overview.percentUsed}%
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">utilizado</span>
            </div>
          </div>
          <div className="min-w-0 border-t border-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <h2 className="font-heading text-lg font-semibold sm:text-xl">
              {consumptionStatus}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Foram consumidas{" "}
              <strong className="font-semibold text-primary tabular-nums">
                {formatMinutesToHours(overview.consumedMinutes)}
              </strong>{" "}
              de {formatMinutesToHours(overview.contractedMinutes)} no mês.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {hasOverage
                ? `${formatMinutesToHours(overview.overageMinutes)} acima da cota.`
                : `Restam ${formatMinutesToHours(Math.max(0, overview.availableMinutes))} disponíveis.`}
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${hasOverage ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
            >
              <span
                className={`size-2 rounded-full ${hasOverage ? "bg-destructive" : "bg-emerald-500"}`}
                aria-hidden="true"
              />
              {hasOverage ? "Acima da cota" : "Dentro da cota"}
            </span>
          </div>
        </div>

        <div className="min-h-72 rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2 xl:col-span-1 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 font-heading text-lg font-semibold sm:text-xl">
              <CalendarDays className="size-6 text-primary" aria-hidden="true" />
              Competência
            </h2>
            <Badge variant={overview.status === "OPEN" ? "outline" : "secondary"}>
              {overview.status === "OPEN" ? "Mês aberto" : "Mês fechado"}
            </Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="hours-month" className="text-sm text-muted-foreground">
                Mês
              </Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) =>
                  router.push(`/team-hours?month=${selectedYear}-${value}`)
                }
              >
                <SelectTrigger
                  id="hours-month"
                  className="h-11 w-full bg-background/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="hours-year" className="text-sm text-muted-foreground">
                Ano
              </Label>
              <Select
                value={selectedYear}
                onValueChange={(value) =>
                  router.push(`/team-hours?month=${value}-${selectedMonth}`)
                }
              >
                <SelectTrigger id="hours-year" className="h-11 w-full bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Download className="size-4 text-primary" aria-hidden="true" />
              Exportar
            </p>
            <ReportFormatActions
              query={`month=${month}`}
              prefix="horas-do-time"
              exportPath="/team-hours/export"
              compactLabels
              className="grid grid-cols-3 gap-2 [&>div]:min-w-0 [&_button]:w-full"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Horas contratadas",
            value: overview.contractedMinutes,
            icon: FileText,
          },
          {
            label: "Horas alocadas",
            value: overview.allocatedMinutes,
            icon: UsersRound,
          },
          {
            label: "Horas consumidas",
            value: overview.consumedMinutes,
            icon: ChartNoAxesColumnIncreasing,
          },
          {
            label: hasOverage ? "Excedente" : "Horas disponíveis",
            value: hasOverage ? overview.overageMinutes : overview.availableMinutes,
            icon: Clock3,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-h-36 justify-between">
            <CardHeader className="flex flex-row items-center gap-4 pb-0">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <CardDescription className="text-sm sm:text-base">
                {label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold tracking-tight tabular-nums">
                {formatMinutesToHours(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChartPie className="size-6" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-lg">Consumo do contrato</CardTitle>
              <CardDescription>
                {overview.percentUsed}% do pool mensal utilizado.
              </CardDescription>
            </div>
          </div>
          <span className="rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary tabular-nums">
            {overview.percentUsed}% utilizado
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="h-4 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Consumo do contrato"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${overview.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0h</span>
            <span>{formatMinutesToHours(overview.contractedMinutes)}</span>
          </div>
          {overview.unallocatedMinutes !== 0 && (
            <p className="text-xs text-muted-foreground">
              {formatMinutesToHours(Math.abs(overview.unallocatedMinutes))}{" "}
              {overview.unallocatedMinutes > 0
                ? "ainda sem distribuir entre os colaboradores"
                : "alocadas acima do contrato"}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="distribution-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck2 className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="distribution-title"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                Distribuição e regras de turno
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {canManage
                  ? "Acompanhe as metas, distribua horas e comunique as regras de turno."
                  : "Consulte o consumo e as metas de horas do time."}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={canManage ? "/reports?scope=team" : "/reports"}>
              <ChartNoAxesColumnIncreasing aria-hidden="true" />
              Ver relatórios
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pessoas no time",
              value: String(overview.members.length),
              icon: UsersRound,
            },
            { label: "Em atenção", value: String(attentionCount), icon: CircleAlert },
            {
              label: "Horas distribuídas",
              value: formatMinutesToHours(overview.allocatedMinutes),
              icon: Clock3,
            },
            { label: "Regras ativas", value: String(activeRuleCount), icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`grid min-w-0 gap-4 ${canManage ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]" : ""}`}
        >
          <Card className="min-w-0 self-stretch gap-0">
            <CardHeader>
              <CardTitle className="text-lg">Horas por colaborador</CardTitle>
              <CardDescription>
                {canManage
                  ? "As metas automáticas usam horas inteiras. Ajustes aceitam até duas casas decimais."
                  : "Consumo e metas de todas as pessoas do espaço."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Buscar colaborador"
                    placeholder="Buscar por nome ou email..."
                    value={memberSearch}
                    onChange={(event) => {
                      setMemberSearch(event.target.value);
                      setMemberPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={memberFilter}
                  onValueChange={(value: MemberFilter) => {
                    setMemberFilter(value);
                    setMemberPage(1);
                  }}
                >
                  <SelectTrigger aria-label="Filtrar colaboradores" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="attention">Em atenção</SelectItem>
                    <SelectItem value="overage">Excedente</SelectItem>
                    <SelectItem value="without-target">Sem meta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-x-auto rounded-xl border border-border">
                <table
                  className={`w-full min-w-180 border-collapse text-left text-sm ${pageMembers.length === MEMBERS_PER_PAGE ? "h-full" : ""}`}
                >
                  <caption className="sr-only">
                    Horas consumidas, metas e saldos dos colaboradores
                  </caption>
                  <thead className="bg-muted/45 text-xs text-muted-foreground">
                    <tr>
                      {canManage && (
                        <th scope="col" className="w-10 px-3 py-3">
                          <Checkbox
                            aria-label="Selecionar pessoas desta página"
                            checked={
                              allPageMembersSelected
                                ? true
                                : somePageMembersSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={togglePageSelection}
                            disabled={
                              isBusy ||
                              pageMembers.length === 0 ||
                              overview.status === "CLOSED"
                            }
                          />
                        </th>
                      )}
                      {(
                        [
                          ["name", "Colaborador"],
                          ["worked", "Consumido"],
                          ["allocated", "Meta"],
                          ["remaining", "Saldo"],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          scope="col"
                          aria-sort={
                            memberSortKey === key
                              ? memberSortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          className="px-3 py-2"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 px-2 text-xs text-muted-foreground"
                            onClick={() => changeMemberSort(key)}
                          >
                            {label}
                            {memberSortKey === key ? (
                              memberSortDirection === "asc" ? (
                                <ArrowUp
                                  className="size-3.5 text-primary"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ArrowDown
                                  className="size-3.5 text-primary"
                                  aria-hidden="true"
                                />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5" aria-hidden="true" />
                            )}
                          </Button>
                        </th>
                      ))}
                      <th
                        scope="col"
                        aria-sort={
                          memberSortKey === "status"
                            ? memberSortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="px-3 py-2"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 px-2 text-xs text-muted-foreground"
                          onClick={() => changeMemberSort("status")}
                        >
                          Status
                          {memberSortKey === "status" ? (
                            memberSortDirection === "asc" ? (
                              <ArrowUp
                                className="size-3.5 text-primary"
                                aria-hidden="true"
                              />
                            ) : (
                              <ArrowDown
                                className="size-3.5 text-primary"
                                aria-hidden="true"
                              />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5" aria-hidden="true" />
                          )}
                        </Button>
                      </th>
                      <th scope="col" className="w-12 px-3 py-3">
                        <span className="sr-only">Detalhes</span>
                      </th>
                    </tr>
                  </thead>
                  <ViewTransition
                    key={currentMemberPage}
                    name="team-hours-member-page"
                    share={{
                      "team-hours-next": "team-hours-next",
                      "team-hours-previous": "team-hours-previous",
                      default: "none",
                    }}
                    default="none"
                  >
                    <tbody>
                      {pageMembers.map((member) => {
                        const status = memberStatus(member);
                        const isSelected = selectedMemberIds.includes(member.memberId);
                        return (
                          <tr
                            key={member.memberId}
                            className="border-t border-border/70 hover:bg-accent/20"
                          >
                            {canManage && (
                              <td className="px-3 py-3">
                                <Checkbox
                                  aria-label={`Selecionar ${member.name}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    setSelectedMemberIds((current) =>
                                      checked
                                        ? [...new Set([...current, member.memberId])]
                                        : current.filter(
                                            (id) => id !== member.memberId,
                                          ),
                                    )
                                  }
                                  disabled={isBusy || overview.status === "CLOSED"}
                                />
                              </td>
                            )}
                            <td className="max-w-40 px-3 py-3">
                              <Link
                                href={`/team-hours/${member.memberId}?month=${month}`}
                                className="font-medium hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                {member.name}
                              </Link>
                              <p
                                className="truncate text-xs text-muted-foreground"
                                title={member.email}
                              >
                                {member.email}
                              </p>
                            </td>
                            <td className="px-3 py-3 tabular-nums">
                              <span className="font-medium">
                                {formatMinutesToHours(member.workedMinutes)}
                              </span>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full ${member.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
                                    style={{
                                      width: `${Math.min(100, member.percentUsed)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {member.percentUsed}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 tabular-nums">
                              {canManage ? (
                                <div className="relative w-25">
                                  <Input
                                    aria-label={`Meta de ${member.name} em horas`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={allocations[member.memberId] ?? "0"}
                                    onChange={(event) => {
                                      setAllocations((current) => ({
                                        ...current,
                                        [member.memberId]: event.target.value,
                                      }));
                                      setBulkMessage(null);
                                    }}
                                    disabled={isBusy || overview.status === "CLOSED"}
                                    className="h-9 pr-6"
                                  />
                                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                                    h
                                  </span>
                                </div>
                              ) : (
                                formatMinutesToHours(member.allocatedMinutes)
                              )}
                            </td>
                            <td
                              className={`px-3 py-3 font-medium tabular-nums ${member.remainingMinutes < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}
                            >
                              {member.remainingMinutes < 0 ? "−" : "+"}
                              {formatMinutesToHours(Math.abs(member.remainingMinutes))}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${status === "Excedente" ? "border-destructive/40 bg-destructive/10 text-destructive" : status === "Atenção" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : status === "Sem meta" ? "border-border bg-muted/60 text-muted-foreground" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {canManage ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Criar regra de turno para ${member.name}`}
                                  disabled={overview.status === "CLOSED"}
                                  onClick={() => {
                                    setSelectedMember(member.memberId);
                                    document
                                      .getElementById("rule-panel")
                                      ?.scrollIntoView({ block: "start" });
                                  }}
                                >
                                  <SlidersHorizontal
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              ) : (
                                <Link
                                  href={`/team-hours/${member.memberId}?month=${month}`}
                                  aria-label={`Ver detalhes de ${member.name}`}
                                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                  <ChevronRight className="size-4" aria-hidden="true" />
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pageMembers.length === 0 && (
                        <tr>
                          <td
                            colSpan={canManage ? 7 : 6}
                            className="px-4 py-12 text-center text-sm text-muted-foreground"
                          >
                            {overview.members.length === 0
                              ? "Ainda não há pessoas para distribuir horas neste espaço."
                              : "Nenhuma pessoa corresponde à busca ou ao filtro."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </ViewTransition>
                </table>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span aria-live="polite">
                  Mostrando {filteredMembers.length === 0 ? 0 : pageStart + 1}–
                  {Math.min(pageStart + MEMBERS_PER_PAGE, filteredMembers.length)} de{" "}
                  {filteredMembers.length} pessoas
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

              {canManage && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <p className="mr-auto self-center text-sm font-medium">
                      {selectedMemberIds.length}{" "}
                      {selectedMemberIds.length === 1
                        ? "pessoa selecionada"
                        : "pessoas selecionadas"}
                    </p>
                    {selectedMemberIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMemberIds([])}
                      >
                        Limpar seleção
                      </Button>
                    )}
                    <div className="grid gap-1">
                      <Label htmlFor="bulk-hours" className="text-xs">
                        Meta em horas
                      </Label>
                      <div className="relative w-27">
                        <Input
                          id="bulk-hours"
                          type="number"
                          min="0"
                          step="0.01"
                          value={bulkHours}
                          onChange={(event) => {
                            setBulkHours(event.target.value);
                            setBulkMessage(null);
                            setBulkHasError(false);
                          }}
                          disabled={isBusy || overview.status === "CLOSED"}
                          className="h-9 pr-6"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                          h
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={applyBulkHours}
                      disabled={
                        isBusy ||
                        selectedMemberIds.length === 0 ||
                        overview.status === "CLOSED"
                      }
                    >
                      Aplicar às selecionadas
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        run("allocation", async () => {
                          const result = await saveHoursAllocations({
                            workspaceId,
                            month,
                            allocations: changedAllocations,
                          });
                          if (result.ok) {
                            setAllocations((current) => {
                              const next = { ...current };
                              for (const item of changedAllocations)
                                next[item.memberId] = formatHoursInput(
                                  item.allocatedMinutes,
                                );
                              return next;
                            });
                          }
                          return result;
                        })
                      }
                      disabled={
                        isBusy ||
                        overview.status === "CLOSED" ||
                        hasInvalidAllocation ||
                        changedAllocationCount === 0
                      }
                      aria-busy={activeAction === "allocation"}
                    >
                      {activeAction === "allocation" ? (
                        <LoaderCircle
                          className="motion-safe:animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Save aria-hidden="true" />
                      )}
                      {activeAction === "allocation"
                        ? "Salvando…"
                        : "Salvar distribuição"}
                    </Button>
                  </div>
                  {changedAllocationCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {changedAllocationCount}{" "}
                      {changedAllocationCount === 1
                        ? "meta alterada"
                        : "metas alteradas"}{" "}
                      ainda sem salvar.
                    </p>
                  )}
                  {hasInvalidAllocation && (
                    <p role="alert" className="text-xs text-destructive">
                      Use metas válidas com no máximo duas casas decimais.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Valores fracionados são arredondados ao minuto mais próximo.
                  </p>
                  {bulkMessage && (
                    <p
                      role={bulkHasError ? "alert" : "status"}
                      className={`text-xs ${bulkHasError ? "text-destructive" : "text-primary"}`}
                    >
                      {bulkMessage}
                    </p>
                  )}
                  <ActionFeedback
                    message={feedback?.kind === "allocation" ? feedback.message : null}
                    ok={feedback?.ok ?? false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card id="rule-panel" className="min-w-0 self-stretch scroll-mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  Aplicar regra de turno
                </CardTitle>
                <CardDescription>
                  Defina horas e período para uma pessoa. Ela será notificada ao
                  aplicar.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="rule-member">Colaborador</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger id="rule-member">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {overview.members.map((member) => (
                        <SelectItem key={member.memberId} value={member.memberId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="rule-start">Data inicial</Label>
                    <TeamHoursDatePicker
                      id="rule-start"
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rule-end">Data final</Label>
                    <TeamHoursDatePicker
                      id="rule-end"
                      value={endDate}
                      onChange={setEndDate}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="rule-hours">Horas por dia</Label>
                    <Input
                      id="rule-hours"
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      value={dailyHours}
                      onChange={(event) => setDailyHours(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="rule-label">Turno</Label>
                    <Input
                      id="rule-label"
                      value={shiftLabel}
                      onChange={(event) => setShiftLabel(event.target.value)}
                    />
                  </div>
                </div>
                {isSingleDayRule ? (
                  <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <CalendarCheck2 className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Regra para um único dia
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-primary">
                        {singleDayName}, {formatDateLabel(startDate)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        A regra e a notificação valem somente para esta data.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <div>
                      <Label>Dias da semana no período</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A regra se repete nestes dias entre as datas selecionadas.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weekdayOptions.map(([value, label]) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm"
                        >
                          <Checkbox
                            checked={weekdays.includes(value)}
                            onCheckedChange={(checked) =>
                              setWeekdays((current) =>
                                checked
                                  ? [...new Set([...current, value])]
                                  : current.filter((day) => day !== value),
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="text-sm font-semibold">Prévia da regra</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedRuleMember
                      ? `${selectedRuleMember.name} · ${dailyHours || "0"}h por dia · ${shiftLabel || "Turno não informado"}`
                      : "Selecione uma pessoa para conferir a regra antes de aplicá-la."}
                  </p>
                  {selectedRuleMember && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateLabel(startDate)} a {formatDateLabel(endDate)}
                      {!isSingleDayRule &&
                        ` · ${weekdays.length} dias da semana selecionados`}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    run("rule", () =>
                      saveHoursRule({
                        workspaceId,
                        month,
                        memberId: selectedMember,
                        startDate,
                        endDate,
                        weekdays: isSingleDayRule ? [singleDayWeekday] : weekdays,
                        dailyMinutes: Math.round(
                          Number(dailyHours.replace(",", ".")) * 60,
                        ),
                        shiftLabel,
                      }),
                    )
                  }
                  disabled={isBusy || overview.status === "CLOSED" || !selectedMember}
                  aria-busy={activeAction === "rule"}
                >
                  {activeAction === "rule" ? (
                    <LoaderCircle
                      className="motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                  {activeAction === "rule"
                    ? "Aplicando e notificando…"
                    : "Aplicar e notificar"}
                </Button>
                <ActionFeedback
                  message={feedback?.kind === "rule" ? feedback.message : null}
                  ok={feedback?.ok ?? false}
                />
                <section className="mt-auto border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Regras desta competência
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Confira as regras aplicadas ao time.
                      </p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {activeRuleCount}
                    </Badge>
                  </div>
                  {activeRuleCount === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs leading-5 text-muted-foreground">
                      Nenhuma regra ativa nesta competência. As regras aplicadas
                      aparecerão aqui.
                    </div>
                  ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {activeRules.map((rule) => (
                        <li
                          key={rule.id}
                          className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2 text-sm">
                            <span
                              className="min-w-0 truncate font-medium"
                              title={rule.memberName}
                            >
                              {rule.memberName}
                            </span>
                            <span className="shrink-0 font-semibold text-primary tabular-nums">
                              {formatMinutesToHours(rule.dailyMinutes)}/dia
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {rule.shiftLabel} · {formatDateLabel(rule.startDate)}
                            {rule.startDate !== rule.endDate &&
                              ` a ${formatDateLabel(rule.endDate)}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {canConfigureFeatures && (
        <Card>
          <CardHeader>
            <CardTitle>Recursos do espaço</CardTitle>
            <CardDescription>
              As alterações entram em vigor imediatamente para novas operações.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                [
                  "hoursControlEnabled",
                  "Controle contratual de horas",
                  overview.features.hoursControlEnabled,
                ],
                [
                  "adjustmentsRequireApproval",
                  "Exigir aprovação para ajustes",
                  overview.features.adjustmentsRequireApproval,
                ],
                [
                  "hoursNotificationsEnabled",
                  "Notificar mudanças de distribuição",
                  overview.features.hoursNotificationsEnabled,
                ],
                [
                  "hoursAlertsEnabled",
                  "Alertar consumo e excedentes",
                  overview.features.hoursAlertsEnabled,
                ],
              ] as const
            ).map(([key, label, checked]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-xl border p-3 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    run("features", () =>
                      saveHoursFeatures({
                        workspaceId,
                        hoursControlEnabled:
                          key === "hoursControlEnabled"
                            ? Boolean(value)
                            : overview.features.hoursControlEnabled,
                        adjustmentsRequireApproval:
                          key === "adjustmentsRequireApproval"
                            ? Boolean(value)
                            : overview.features.adjustmentsRequireApproval,
                        hoursNotificationsEnabled:
                          key === "hoursNotificationsEnabled"
                            ? Boolean(value)
                            : overview.features.hoursNotificationsEnabled,
                        hoursAlertsEnabled:
                          key === "hoursAlertsEnabled"
                            ? Boolean(value)
                            : overview.features.hoursAlertsEnabled,
                      }),
                    )
                  }
                  disabled={isBusy}
                />
                <span>{label}</span>
              </label>
            ))}
            {feedback?.kind === "features" && (
              <div className="sm:col-span-2">
                <ActionFeedback message={feedback.message} ok={feedback.ok} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex flex-col items-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              run("closure", () =>
                changeHoursBudgetStatus({
                  workspaceId,
                  month,
                  status: overview.status === "OPEN" ? "CLOSED" : "OPEN",
                  reason:
                    overview.status === "OPEN"
                      ? "Fechamento da competência"
                      : "Reabertura autorizada",
                }),
              )
            }
            disabled={isBusy}
            aria-busy={activeAction === "closure"}
          >
            {activeAction === "closure" ? (
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
            ) : overview.status === "OPEN" ? (
              <LockKeyhole aria-hidden="true" />
            ) : (
              <SlidersHorizontal aria-hidden="true" />
            )}
            {activeAction === "closure"
              ? overview.status === "OPEN"
                ? "Fechando…"
                : "Reabrindo…"
              : overview.status === "OPEN"
                ? "Fechar competência"
                : "Reabrir competência"}
          </Button>
          <ActionFeedback
            message={feedback?.kind === "closure" ? feedback.message : null}
            ok={feedback?.ok ?? false}
          />
        </div>
      )}
    </div>
  );
}
