"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Check,
  LoaderCircle,
  LockKeyhole,
  Save,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinutesToHours } from "@/lib/format";
import type { HoursBudgetOverview } from "@/services/hours-budget.service";
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

function ActionFeedback({
  message,
  ok,
}: {
  message: string | null;
  ok: boolean | null;
}) {
  if (!message) return null;
  return (
    <p
      className={ok ? "text-sm text-emerald-500" : "text-sm text-destructive"}
      role={ok ? "status" : "alert"}
    >
      {message}
    </p>
  );
}

function formatHoursInput(minutes: number) {
  return (minutes / 60).toString();
}

function monthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function TeamHoursClient({
  overview,
  workspaceId,
  month,
  canManage,
  isOwner,
}: {
  overview: HoursBudgetOverview | null;
  workspaceId: string;
  month: string;
  canManage: boolean;
  isOwner: boolean;
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
  const [selectedMember, setSelectedMember] = useState(
    overview?.members[0]?.memberId ?? "",
  );
  const [startDate, setStartDate] = useState(`${month}-01`);
  const [endDate, setEndDate] = useState(monthEndDate(month));
  const [dailyHours, setDailyHours] = useState("6");
  const [shiftLabel, setShiftLabel] = useState("Tarde");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sortedMembers = useMemo(
    () => [...(overview?.members ?? [])].sort((a, b) => b.percentUsed - a.percentUsed),
    [overview?.members],
  );

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setFeedback({ message: result.message ?? "Operação concluída.", ok: result.ok });
    });
  }

  function saveBudget() {
    const parsed = Number(budgetHours.replace(",", "."));
    run(() =>
      saveHoursBudget({
        workspaceId,
        month,
        contractedMinutes: Math.round(parsed * 60),
      }),
    );
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
              step="0.25"
            />
          </div>
          <Button type="button" onClick={saveBudget} disabled={pending || !canManage}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
            Ativar controle
          </Button>
          {!canManage && (
            <p className="text-sm text-muted-foreground">
              Somente gestores podem ativar este controle.
            </p>
          )}
          <ActionFeedback
            message={feedback?.message ?? null}
            ok={feedback?.ok ?? false}
          />
        </CardContent>
      </Card>
    );
  }

  const progress = Math.min(100, Math.max(0, overview.percentUsed));
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            CONTROLE CONTRATUAL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Horas do time</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Distribua a meta mensal, acompanhe o consumo e comunique mudanças de turno.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <ReportFormatActions
            query={`month=${month}`}
            prefix="horas-do-time"
            exportPath="/team-hours/export"
          />
          <div className="grid gap-1.5">
            <Label htmlFor="hours-month">Competência</Label>
            <Input
              id="hours-month"
              type="month"
              defaultValue={month}
              onChange={(event) => {
                if (event.target.value)
                  router.push(`/team-hours?month=${event.target.value}`);
              }}
            />
          </div>
          <Badge variant={overview.status === "OPEN" ? "outline" : "secondary"}>
            {overview.status === "OPEN" ? "Mês aberto" : "Mês fechado"}
          </Badge>
        </div>
      </div>

      <ActionFeedback message={feedback?.message ?? null} ok={feedback?.ok ?? false} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Horas contratadas", overview.contractedMinutes],
          ["Horas alocadas", overview.allocatedMinutes],
          ["Horas consumidas", overview.consumedMinutes],
          [
            overview.overageMinutes > 0 ? "Excedente" : "Horas disponíveis",
            overview.overageMinutes > 0
              ? overview.overageMinutes
              : overview.availableMinutes,
          ],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMinutesToHours(value as number)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Consumo do contrato</CardTitle>
            <CardDescription>
              {overview.percentUsed}% do pool mensal utilizado.
            </CardDescription>
          </div>
          {overview.unallocatedMinutes !== 0 && (
            <Badge variant="outline">
              {formatMinutesToHours(Math.abs(overview.unallocatedMinutes))}{" "}
              {overview.unallocatedMinutes > 0
                ? "sem distribuir"
                : "alocadas acima do contrato"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horas por colaborador</CardTitle>
          <CardDescription>
            Todos os membros podem consultar este resumo no espaço compartilhado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedMembers.map((member) => (
            <Link
              key={member.memberId}
              href={`/team-hours/${member.memberId}?month=${month}`}
              className="block rounded-xl border border-border/70 p-3 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <p>
                    {formatMinutesToHours(member.workedMinutes)} /{" "}
                    {formatMinutesToHours(member.allocatedMinutes)}
                  </p>
                  <p
                    className={
                      member.overageMinutes > 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {member.overageMinutes > 0
                      ? `${formatMinutesToHours(member.overageMinutes)} acima`
                      : `${member.percentUsed}% consumido`}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${member.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(member.percentUsed, 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribuir horas</CardTitle>
              <CardDescription>
                O excedente permitido fica registrado e gera alerta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.members.map((member) => (
                <div
                  key={member.memberId}
                  className="grid gap-2 sm:grid-cols-[1fr_9rem] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Consumido: {formatMinutesToHours(member.workedMinutes)}
                    </p>
                  </div>
                  <div className="relative">
                    <Input
                      aria-label={`Meta de ${member.name}`}
                      type="number"
                      min="0"
                      step="0.25"
                      value={allocations[member.memberId] ?? "0"}
                      onChange={(event) =>
                        setAllocations((current) => ({
                          ...current,
                          [member.memberId]: event.target.value,
                        }))
                      }
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                      h
                    </span>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  run(() =>
                    saveHoursAllocations({
                      workspaceId,
                      month,
                      allocations: overview.members.map((member) => ({
                        memberId: member.memberId,
                        allocatedMinutes: Math.round(
                          Number(
                            (allocations[member.memberId] ?? "0").replace(",", "."),
                          ) * 60,
                        ),
                      })),
                    }),
                  )
                }
                disabled={pending || overview.status === "CLOSED"}
              >
                <Save /> Salvar distribuição
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aplicar uma regra de turno</CardTitle>
              <CardDescription>
                A pessoa será notificada assim que a regra for aplicada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Colaborador</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
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
                  <Input
                    id="rule-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rule-end">Data final</Label>
                  <Input
                    id="rule-end"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
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
              <div className="grid gap-2">
                <Label>Dias aplicáveis</Label>
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
              <Button
                type="button"
                onClick={() =>
                  run(() =>
                    saveHoursRule({
                      workspaceId,
                      month,
                      memberId: selectedMember,
                      startDate,
                      endDate,
                      weekdays,
                      dailyMinutes: Math.round(
                        Number(dailyHours.replace(",", ".")) * 60,
                      ),
                      shiftLabel,
                    }),
                  )
                }
                disabled={pending || overview.status === "CLOSED" || !selectedMember}
              >
                <Check /> Aplicar e notificar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isOwner && (
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
                    run(() =>
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
                  disabled={pending}
                />
                <span>{label}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              run(() =>
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
            disabled={pending}
          >
            {overview.status === "OPEN" ? <LockKeyhole /> : <SlidersHorizontal />}
            {overview.status === "OPEN" ? "Fechar competência" : "Reabrir competência"}
          </Button>
        </div>
      )}
    </div>
  );
}
