import { DateTime } from "luxon";
import { Calculator, CircleHelp, Clock3, Coins, MoonStar } from "lucide-react";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import { formatMinutesToHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCompensationData } from "@/services/compensation.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getMonth(value: string | undefined) {
  const now = DateTime.now().setZone(TIMEZONE);
  const candidate = value ? DateTime.fromISO(`${value}-01`, { zone: TIMEZONE }) : now;
  return candidate.isValid && /^\d{4}-\d{2}$/.test(value ?? "")
    ? candidate
    : now.startOf("month");
}

export default async function CompensationPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const { user, workspace } = await getWorkspaceContext();
  const query = (await searchParams) ?? {};
  const month = getMonth(query.month);
  const monthKey = month.toFormat("yyyy-MM");
  const startDate = month.startOf("month").toFormat("yyyy-MM-dd");
  const endDate = month.endOf("month").toFormat("yyyy-MM-dd");
  const calculation = await getCompensationData({
    userId: user.id,
    workspaceId: workspace.id,
    startDate,
    endDate,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Conferência pessoal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Minha remuneração
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Veja uma estimativa transparente do salário configurado, horas extras,
            sobreaviso e DSR do período.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-7 rounded-full px-3 py-1 text-xs leading-4 font-semibold",
            calculation.provisional
              ? "border-primary/50 bg-primary/8 text-primary"
              : "border-emerald-500/40 bg-emerald-500/8 text-emerald-500",
          )}
        >
          {calculation.provisional ? "Prévia com pendências" : "Período conferido"}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="compensation-month">Período</Label>
              <Input
                id="compensation-month"
                name="month"
                type="month"
                defaultValue={monthKey}
                className="sm:w-52"
              />
            </div>
            <Button type="submit">
              <Calculator />
              Atualizar cálculo
            </Button>
          </form>
        </CardContent>
      </Card>

      {!calculation.salaryConfigured && (
        <Card className="border-primary/35 bg-primary/5">
          <CardContent className="flex gap-3 p-5 text-sm text-muted-foreground sm:p-6">
            <CircleHelp className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              Configure seu salário em Configurações para transformar horas em valores.
              As horas continuam sendo exibidas mesmo sem salário informado.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Salário configurado"
          value={currency(calculation.baseSalary)}
          icon={Coins}
        />
        <MetricCard
          label="Valor da hora"
          value={currency(calculation.hourlyRate)}
          icon={Clock3}
        />
        <MetricCard
          label="Horas extras"
          value={`${formatMinutesToHours(calculation.overtime75Minutes + calculation.overtime100Minutes)}`}
          icon={Clock3}
        />
        <MetricCard
          label="Sobreaviso"
          value={formatMinutesToHours(calculation.onCallMinutes)}
          icon={MoonStar}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Como o valor foi formado</CardTitle>
            <CardDescription>
              O sistema separa disponibilidade, trabalho extra e DSR para facilitar a
              conferência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownRow
              label="Extras a 75%"
              minutes={calculation.overtime75Minutes}
              value={
                (calculation.overtime75Minutes / 60) * calculation.hourlyRate * 1.75
              }
            />
            <BreakdownRow
              label="Extras a 100%"
              minutes={calculation.overtime100Minutes}
              value={(calculation.overtime100Minutes / 60) * calculation.hourlyRate * 2}
            />
            <BreakdownRow
              label="Disponibilidade de sobreaviso"
              minutes={calculation.onCallMinutes}
              value={calculation.onCallValue}
            />
            <BreakdownRow label="DSR estimado" value={calculation.dsrValue} />
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Variáveis do período</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {currency(calculation.variableValue + calculation.dsrValue)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="h-7 rounded-full px-3 py-1 text-xs leading-4 font-semibold"
                >
                  Estimativa
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premissas do cálculo</CardTitle>
            <CardDescription>Confira os dados usados nesta prévia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Premise label="Carga mensal" value={`${calculation.monthlyHours} horas`} />
            <Premise
              label="Dias úteis considerados"
              value={String(calculation.workDays)}
            />
            <Premise label="Domingos e feriados" value={String(calculation.restDays)} />
            <Premise label="Fórmula do sobreaviso" value="1/3 do valor da hora" />
            <Premise
              label="Pendências"
              value={
                calculation.pendingAdjustments
                  ? `${calculation.pendingAdjustments} ajustes`
                  : "Nenhuma"
              }
            />
            <div className="rounded-xl border border-border bg-muted/35 p-3 leading-5 text-muted-foreground">
              DSR é uma estimativa sobre as verbas variáveis. A regra pode ser
              parametrizada futuramente após validação contábil.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm text-muted-foreground">Total bruto estimado</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {currency(calculation.estimatedGrossValue)}
            </p>
          </div>
          <p className="max-w-sm text-sm leading-5 text-muted-foreground">
            Valor de conferência. Não inclui impostos, benefícios, descontos ou
            retenções.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Coins;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  minutes,
  value,
}: {
  label: string;
  minutes?: number;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/35 px-3.5 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {minutes !== undefined && (
          <p className="text-xs text-muted-foreground">
            {formatMinutesToHours(minutes)}
          </p>
        )}
      </div>
      <p className="font-semibold tabular-nums">{currency(value)}</p>
    </div>
  );
}

function Premise({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
