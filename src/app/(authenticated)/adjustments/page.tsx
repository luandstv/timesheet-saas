import { DateTime } from "luxon";
import { Building2, UserRound } from "lucide-react";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import { dateOnlyStart, formatDateOnly } from "@/lib/date-only";
import { effectiveEntries } from "@/lib/effective-entries";
import { canReview } from "@/lib/workspace-policy";
import prisma from "@/lib/prisma";
import { requireRead, publicMember } from "@/services/workspace.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/workspace-fields";
import { AdjustmentsDateFilter } from "./_components/adjustments-date-filter";
import { CollaboratorsPanel } from "./_components/collaborators-panel";
import { SelectPersonLink } from "./_components/select-person-link";
import { loadCollaboratorDirectory } from "./_lib/load-collaborators";
import {
  AdjustmentsTabs,
  type AdjustmentTab,
} from "@/components/shared/adjustments-tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notFound } from "next/navigation";
import { z } from "zod";

const statuses = {
  PENDING: "Pendente",
  APPROVED: "Confirmado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
};
const types = {
  INSERTION: "Incluir",
  MODIFICATION: "Corrigir",
  DELETION: "Desconsiderar",
};
const time = (value: Date | null) =>
  value
    ? DateTime.fromJSDate(value).setZone(TIMEZONE).toFormat("dd/MM/yyyy HH:mm:ss")
    : "—";
const auditLabels: Record<string, string> = {
  ADJUSTMENT_REQUESTED: "Ajuste solicitado",
  ADJUSTMENT_APPROVED: "Ajuste confirmado",
  ADJUSTMENT_REJECTED: "Ajuste rejeitado",
  ADJUSTMENT_CANCELLED: "Ajuste cancelado",
  MONTH_CLOSED: "Mês fechado",
  MONTH_REOPENED: "Mês reaberto",
  MEMBERSHIP_CHANGED: "Vínculo alterado",
};

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
    tab?: string;
    memberSearch?: string;
    memberStatus?: string;
    memberSort?: string;
    memberPage?: string;
  }>;
}) {
  const query = await searchParams;
  const { user, workspace, member } = await getWorkspaceContext();
  const userId = query.userId ?? user.id;
  if (!z.string().uuid().safeParse(userId).success) notFound();
  let access;
  try {
    access = await requireRead(prisma, workspace.id, user.id, userId);
  } catch {
    notFound();
  }
  const review = canReview(member, access.subject);
  const own = user.id === userId;
  const now = DateTime.now().setZone(TIMEZONE);
  const parsed = DateTime.fromISO(`${query.month ?? now.toFormat("yyyy-MM")}-01`, {
    zone: TIMEZONE,
  });
  const month =
    parsed.isValid && /^\d{4}-\d{2}$/.test(query.month ?? now.toFormat("yyyy-MM"))
      ? parsed
      : now.startOf("month");
  const monthKey = month.toFormat("yyyy-MM");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsedStartDate =
    query.startDate && datePattern.test(query.startDate)
      ? DateTime.fromISO(query.startDate, { zone: TIMEZONE })
      : null;
  const parsedEndDate =
    query.endDate && datePattern.test(query.endDate)
      ? DateTime.fromISO(query.endDate, { zone: TIMEZONE })
      : null;
  const requestedStartDate = parsedStartDate?.isValid ? parsedStartDate : null;
  const requestedEndDate = parsedEndDate?.isValid ? parsedEndDate : null;
  const rangeStart = requestedStartDate ?? month.startOf("month");
  const rangeEnd = requestedEndDate ?? month.endOf("month").startOf("day");
  const validRange = rangeStart <= rangeEnd;
  const filterStart = validRange ? rangeStart : month.startOf("month");
  const filterEnd = validRange ? rangeEnd : month.endOf("month").startOf("day");
  const monthStart = dateOnlyStart(month);
  const date = {
    gte: dateOnlyStart(filterStart),
    lt: dateOnlyStart(filterEnd.plus({ days: 1 })),
  };
  const [subject, sheets, closure, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicMember,
    }),
    prisma.timesheet.findMany({
      where: { userId, workspaceId: workspace.id, date },
      include: { entries: true, requests: { orderBy: { sequence: "desc" } } },
      orderBy: { date: "desc" },
    }),
    prisma.monthlyClosure.findUnique({
      where: {
        workspaceId_userId_month: {
          workspaceId: workspace.id,
          userId,
          month: monthStart,
        },
      },
    }),
    prisma.workspaceAudit.findMany({
      where: {
        workspaceId: workspace.id,
        subjectId: userId,
        action: { in: Object.keys(auditLabels) },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const actors = await prisma.user.findMany({
    where: { id: { in: [...new Set(history.map((item) => item.actorId))] } },
    select: { id: true, name: true },
  });
  const requests = sheets.flatMap((sheet) => sheet.requests);
  const pending = requests.filter((request) => request.status === "PENDING");
  const visibleSheets = sheets.filter(
    (sheet) => sheet.entries.length > 0 || sheet.requests.length > 0,
  );
  const canManageCollaborators =
    member.active &&
    workspace.kind === "COMPANY" &&
    (member.role === "OWNER" || member.role === "MANAGER");
  const requestedTab = query.tab as AdjustmentTab | undefined;
  const defaultTab: AdjustmentTab =
    requestedTab === "requests" ||
    requestedTab === "history" ||
    (requestedTab === "closure" && review) ||
    (requestedTab === "collaborators" && canManageCollaborators)
      ? requestedTab
      : "movements";
  const people = canManageCollaborators
    ? await prisma.workspaceMember.findMany({
        where: {
          workspaceId: workspace.id,
          ...(member.role === "OWNER"
            ? { active: true }
            : { managerId: member.id, active: true, role: "COLLABORATOR" }),
        },
        select: { userId: true, user: { select: { name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];
  const directory =
    canManageCollaborators && defaultTab === "collaborators"
      ? await loadCollaboratorDirectory({
          db: prisma,
          actor: member,
          workspaceId: workspace.id,
          // A lista completa é carregada uma vez; a busca e os filtros são
          // aplicados no cliente para evitar uma consulta a cada tecla.
          search: "",
          status: member.role === "OWNER" ? "all" : "active",
          sort: "priority",
          page: 1,
          includeAll: true,
        })
      : null;
  const defaultDate =
    query.date && datePattern.test(query.date)
      ? query.date
      : filterStart.toFormat("yyyy-MM-dd");
  const hidden = { workspaceId: workspace.id, userId };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-semibold">Ajustes e fechamento</h1>
        </div>
        <div
          className={`rounded-2xl border border-primary/30 bg-card/70 px-4 py-3 shadow-sm ${
            canManageCollaborators ? "" : "lg:col-span-2"
          }`}
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Espaço em análise
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Building2 aria-hidden="true" className="size-5 text-primary" />
            <span className="text-lg font-semibold">{workspace.name}</span>
            <Badge
              variant="outline"
              className={
                workspace.kind === "COMPANY"
                  ? "h-7 rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
                  : "h-7 rounded-full border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200"
              }
            >
              {workspace.kind === "COMPANY" ? "Empresa" : "Pessoal"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Registros de {subject.name} · Horários de Brasília.
          </p>
        </div>
        {canManageCollaborators && (
          <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card/70 px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pessoa em foco
              </p>
              <div className="mt-1 flex items-center gap-2">
                <UserRound aria-hidden="true" className="size-5 text-primary" />
                <span className="text-lg font-semibold">{subject.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione outra pessoa para consultar os registros.
              </p>
            </div>
            <div>
              <SelectPersonLink
                href={`/adjustments?${new URLSearchParams({
                  tab: "collaborators",
                  startDate: filterStart.toFormat("yyyy-MM-dd"),
                  endDate: filterEnd.toFormat("yyyy-MM-dd"),
                }).toString()}`}
                people={people.map((person) => ({
                  userId: person.userId,
                  name: person.user.name,
                  email: person.user.email,
                }))}
                currentUserId={userId}
                startDate={filterStart.toFormat("yyyy-MM-dd")}
                endDate={filterEnd.toFormat("yyyy-MM-dd")}
              />
            </div>
          </div>
        )}
      </div>
      <AdjustmentsDateFilter
        userId={userId}
        startDate={filterStart.toFormat("yyyy-MM-dd")}
        endDate={filterEnd.toFormat("yyyy-MM-dd")}
        tab={defaultTab}
        closed={Boolean(closure?.closed)}
      />
      <AdjustmentsTabs
        key={defaultTab}
        defaultTab={defaultTab}
        pendingCount={pending.length}
        showClosure={review}
        showCollaborators={canManageCollaborators}
      >
        <TabsContent value="movements" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Registros de ponto</CardTitle>
              <CardDescription>
                Os registros originais são preservados. Horários corrigidos entram na
                apuração após confirmação, ou provisoriamente quando permitido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {visibleSheets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro neste período. Use “Incluir registro” se esqueceu de
                  registrar.
                </p>
              )}
              {visibleSheets.map((sheet) => (
                <div key={sheet.id} className="rounded-xl border p-4">
                  <h2 className="mb-3 font-medium">
                    {DateTime.fromISO(formatDateOnly(sheet.date)).toFormat(
                      "dd/MM/yyyy",
                    )}
                  </h2>
                  <div className="space-y-2">
                    {effectiveEntries(sheet.entries, sheet.requests).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"
                      >
                        <div>
                          <p>
                            {entry.type === "CLOCK_IN" ? "Entrada" : "Saída"} ·{" "}
                            {time(entry.timestamp)}
                          </p>
                          {entry.provisional && (
                            <p className="mt-1 text-xs text-accent-foreground">
                              Ajuste provisório — aguardando confirmação
                            </p>
                          )}
                        </div>
                        {own && member.active && !closure?.closed && (
                          <details className="w-full">
                            <summary className="cursor-pointer text-xs text-accent-foreground">
                              Solicitar correção deste registro
                            </summary>
                            <div className="mt-4 max-w-lg">
                              <ActionForm
                                label="Enviar solicitação"
                                hidden={{
                                  operation: "request",
                                  workspaceId: workspace.id,
                                  date: formatDateOnly(sheet.date),
                                  targetEventId: entry.id,
                                  entryType: entry.type,
                                }}
                              >
                                <Field label="O que deseja alterar?">
                                  <Select name="type" defaultValue="MODIFICATION">
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="MODIFICATION">
                                        Corrigir horário
                                      </SelectItem>
                                      <SelectItem value="DELETION">
                                        Desconsiderar registro
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field label="Horário correto (Brasília)">
                                  <Input
                                    type="datetime-local"
                                    name="timestamp"
                                    step="1"
                                    defaultValue={DateTime.fromJSDate(entry.timestamp)
                                      .setZone(TIMEZONE)
                                      .toFormat("yyyy-MM-dd'T'HH:mm:ss")}
                                  />
                                </Field>
                                <Field label="Justificativa">
                                  <Input
                                    name="reason"
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    placeholder="Explique o que aconteceu"
                                  />
                                </Field>
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox name="forgotten" value="true" />
                                  Esqueci de registrar no horário correto
                                </label>
                              </ActionForm>
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Ver registros originais
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {sheet.entries.map((entry) => (
                        <li key={entry.id}>
                          {entry.type === "CLOCK_IN" ? "Entrada" : "Saída"} ·{" "}
                          {time(entry.timestamp)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </CardContent>
          </Card>
          {own && member.active && (
            <Card>
              <CardHeader>
                <CardTitle>Incluir registro de ponto esquecido</CardTitle>
                <CardDescription>
                  Informe a data em que a jornada começou. Inclusões aguardam
                  confirmação. Para um período inteiro esquecido, solicite a entrada e a
                  saída e confirme as duas juntas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionForm
                  label="Solicitar inclusão"
                  hidden={{
                    operation: "request",
                    workspaceId: workspace.id,
                    type: "INSERTION",
                    forgotten: "true",
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Data da jornada">
                      <Input
                        name="date"
                        type="date"
                        defaultValue={defaultDate}
                        required
                      />
                    </Field>
                    <Field label="Tipo de registro">
                      <Select name="entryType" defaultValue="CLOCK_IN">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLOCK_IN">Entrada</SelectItem>
                          <SelectItem value="CLOCK_OUT">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Horário (Brasília)">
                      <Input name="timestamp" type="datetime-local" step="1" required />
                    </Field>
                  </div>
                  <Field label="Justificativa">
                    <Input
                      name="reason"
                      minLength={10}
                      maxLength={2000}
                      required
                      placeholder="Explique por que o registro precisa ser incluído"
                    />
                  </Field>
                </ActionForm>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações deste mês</CardTitle>
              <CardDescription>
                Compare o horário original e o solicitado antes de confirmar. Seleções
                que deixam entradas ou saídas sem par não são aplicadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há ajustes solicitados neste mês.
                </p>
              ) : (
                <ActionForm
                  disabled={
                    pending.length === 0 || (!review && !(own && member.active))
                  }
                  label={review ? "Registrar decisão" : "Cancelar selecionados"}
                  hidden={{
                    operation: "decide",
                    ...hidden,
                    ...(!review ? { decision: "CANCELLED" } : {}),
                  }}
                >
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <label
                        key={request.id}
                        className="flex gap-3 rounded-xl border p-4 text-sm"
                      >
                        {request.status === "PENDING" &&
                          (review || (own && member.active)) && (
                            <Checkbox className="mt-1" name="ids" value={request.id} />
                          )}
                        <span className="grid min-w-0 gap-1">
                          <span className="font-medium">
                            {types[request.type]}{" "}
                            {request.entryType === "CLOCK_IN" ? "entrada" : "saída"} ·{" "}
                            {statuses[request.status]}
                          </span>
                          <span className="text-muted-foreground">
                            {time(request.previousTimestamp)} →{" "}
                            {time(request.newTimestamp)}
                          </span>
                          <span className="break-words">{request.reason}</span>
                          {request.provisional && request.status === "PENDING" && (
                            <span className="text-xs text-accent-foreground">
                              Ajuste provisório — aguardando confirmação
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {pending.length > 0 && (review || (own && member.active)) && (
                    <>
                      {review && (
                        <Field label="Decisão">
                          <Select name="decision" defaultValue="APPROVED">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APPROVED">
                                Confirmar selecionados
                              </SelectItem>
                              <SelectItem value="REJECTED">
                                Rejeitar selecionados
                              </SelectItem>
                              {own && (
                                <SelectItem value="CANCELLED">
                                  Cancelar selecionados
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                      <Field label="Justificativa da decisão">
                        <Input name="reason" minLength={10} maxLength={2000} required />
                      </Field>
                    </>
                  )}
                </ActionForm>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {review && (
          <TabsContent value="closure">
            <Card>
              <CardHeader>
                <CardTitle>{closure?.closed ? "Reabrir mês" : "Fechar mês"}</CardTitle>
                <CardDescription>
                  {closure?.closed
                    ? "A reabertura libera ajustes e fica registrada no histórico."
                    : "Confirme todos os ajustes e encerre os pontos abertos. O fechamento fica disponível após o fim do mês."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionForm
                  label={closure?.closed ? "Reabrir mês" : "Fechar mês"}
                  hidden={{
                    operation: "month",
                    ...hidden,
                    month: monthKey,
                    reopen: closure?.closed ? "true" : "false",
                  }}
                >
                  <Field
                    label={
                      closure?.closed ? "Motivo da reabertura" : "Observação (opcional)"
                    }
                  >
                    <Input
                      name="reason"
                      required={closure?.closed}
                      minLength={closure?.closed ? 10 : undefined}
                      maxLength={2000}
                    />
                  </Field>
                </ActionForm>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de decisões</CardTitle>
              <CardDescription>
                Últimos 50 eventos desta pessoa neste espaço. Os registros de auditoria
                são preservados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {history.map((item) => {
                  const details = item.details as Record<string, unknown>;
                  return (
                    <li
                      key={item.id}
                      className="border-l-2 border-primary/30 pl-4 text-sm"
                    >
                      <p className="font-medium">
                        {auditLabels[item.action] ?? item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {time(item.createdAt)} ·{" "}
                        {actors.find((actor) => actor.id === item.actorId)?.name ??
                          "Usuário"}
                      </p>
                      {typeof details.reason === "string" && (
                        <p className="mt-1 break-words">{details.reason}</p>
                      )}
                      {typeof details.month === "string" && (
                        <p className="text-xs">Mês: {details.month}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma decisão registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {canManageCollaborators && directory && (
          <TabsContent value="collaborators">
            <CollaboratorsPanel
              directory={directory}
              currentUserId={userId}
              startDate={filterStart.toFormat("yyyy-MM-dd")}
              endDate={filterEnd.toFormat("yyyy-MM-dd")}
              initialSearch={query.memberSearch?.trim() ?? ""}
              initialStatus={
                query.memberStatus === "inactive" || query.memberStatus === "all"
                  ? query.memberStatus
                  : "active"
              }
              initialSort={
                query.memberSort === "name" ||
                query.memberSort === "recent" ||
                query.memberSort === "open"
                  ? query.memberSort
                  : "priority"
              }
              canViewInactive={member.role === "OWNER"}
            />
          </TabsContent>
        )}
      </AdjustmentsTabs>
    </div>
  );
}
