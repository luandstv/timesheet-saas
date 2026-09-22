import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMinutesToHours } from "@/lib/format";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import { HoursBudgetService } from "@/services/hours-budget.service";

export default async function TeamHoursMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  const { user, workspace } = await getWorkspaceContext();
  const { memberId } = await params;
  const month =
    (await searchParams)?.month ?? DateTime.now().setZone(TIMEZONE).toFormat("yyyy-MM");
  const detail = await HoursBudgetService.getMemberDetail(
    user.id,
    workspace.id,
    memberId,
    month,
  );
  if (!detail) notFound();
  const { member, overview, days } = detail;
  const rules = overview.rules.filter((rule) => rule.memberId === member.memberId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/team-hours?month=${overview.month}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar para horas do time
          </Link>
          <h1 className="mt-3 text-3xl font-semibold">{member.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {member.email} · competência {overview.month}
          </p>
        </div>
        <Badge variant={member.overageMinutes > 0 ? "destructive" : "outline"}>
          {member.overageMinutes > 0
            ? `${formatMinutesToHours(member.overageMinutes)} acima da meta`
            : `${member.percentUsed}% consumido`}
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Meta mensal", member.allocatedMinutes],
          ["Consumido", member.workedMinutes],
          [
            member.remainingMinutes >= 0 ? "Saldo" : "Excedente",
            Math.abs(member.remainingMinutes),
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
        <CardHeader>
          <CardTitle>Regras aplicadas</CardTitle>
          <CardDescription>
            Distribuições de turno recebidas nesta competência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.length ? (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">
                    {rule.shiftLabel} · {formatMinutesToHours(rule.dailyMinutes)} por
                    dia
                  </p>
                  <Badge variant="outline">
                    {rule.startDate} a {rule.endDate}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Regra {rule.active ? "ativa" : "encerrada"} para os dias selecionados.
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma regra de turno aplicada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumo diário</CardTitle>
          <CardDescription>
            Horas efetivas fechadas que reduziram a meta mensal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.length ? (
            days.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{day.date}</span>
                <strong className="tabular-nums">
                  {formatMinutesToHours(day.workedMinutes)}
                </strong>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum par de ponto fechado nesta competência.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link
            href={`/reports?scope=team&startDate=${overview.month}-01&endDate=${overview.month}-31`}
          >
            Abrir relatório da equipe
          </Link>
        </Button>
      </div>
    </div>
  );
}
