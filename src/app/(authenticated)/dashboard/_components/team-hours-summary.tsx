import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMinutesToHours } from "@/lib/format";
import type { HoursBudgetOverview } from "@/services/hours-budget.service";

export function TeamHoursSummary({
  overview,
  canManage,
}: {
  overview: HoursBudgetOverview | null;
  canManage: boolean;
}) {
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
            <Link href="/team-hours">{canManage ? "Configurar" : "Ver controle"}</Link>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Horas contratadas do time</CardTitle>
          <CardDescription>
            Competência {overview.month} · consumo efetivo da equipe.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/team-hours?month=${overview.month}`}>Ver detalhes</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Contratadas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMinutesToHours(overview.contractedMinutes)}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Consumidas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMinutesToHours(overview.consumedMinutes)}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">
              {overview.overageMinutes > 0 ? "Excedente" : "Disponíveis"}
            </p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${overview.overageMinutes > 0 ? "text-destructive" : ""}`}
            >
              {formatMinutesToHours(
                overview.overageMinutes > 0
                  ? overview.overageMinutes
                  : overview.availableMinutes,
              )}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso do pool</span>
            <Badge variant={overview.overageMinutes > 0 ? "destructive" : "outline"}>
              {overview.percentUsed}%
            </Badge>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${overview.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(100, overview.percentUsed)}%` }}
            />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Consumo por colaborador</p>
          {[...overview.members]
            .sort((a, b) => b.workedMinutes - a.workedMinutes)
            .map((member) => (
              <Link
                key={member.memberId}
                href={`/team-hours/${member.memberId}?month=${overview.month}`}
                className="block rounded-lg p-1 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">{member.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatMinutesToHours(member.workedMinutes)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${member.overageMinutes > 0 ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, member.percentUsed)}%` }}
                  />
                </div>
              </Link>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
