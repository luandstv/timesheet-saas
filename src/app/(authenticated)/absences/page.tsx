import { getWorkspaceContext } from "@/lib/workspace-context";
import { canReview } from "@/lib/workspace-policy";
import { formatDateOnly } from "@/lib/date-only";
import prisma from "@/lib/prisma";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/workspace-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const typeLabels = {
  MEDICAL_LEAVE: "Afastamento médico",
  VACATION: "Férias",
  COMPENSATORY_OFF: "Folga compensatória",
  DAY_OFF: "Folga",
  JUSTIFIED_ABSENCE: "Ausência justificada",
  UNJUSTIFIED_ABSENCE: "Ausência não justificada",
  BEREAVEMENT: "Licença por luto",
  MATERNITY: "Licença maternidade",
  PATERNITY: "Licença paternidade",
  OTHER: "Outro",
} as const;

const statusLabels = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
} as const;

function formatDateRange(start: Date, end: Date) {
  const first = formatDateOnly(start).split("-").reverse().join("/");
  const last = formatDateOnly(end).split("-").reverse().join("/");
  return first === last ? first : `${first} a ${last}`;
}

export default async function AbsencesPage() {
  const { user, workspace, member } = await getWorkspaceContext();
  const visibleMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: workspace.id,
      ...(member.role === "OWNER"
        ? {}
        : member.role === "MANAGER" && member.active
          ? { OR: [{ userId: user.id }, { managerId: member.id }] }
          : { userId: user.id }),
    },
    select: { id: true, userId: true, role: true, active: true, managerId: true },
  });
  const visibleUserIds = visibleMembers.map((item) => item.userId);
  const absences = await prisma.absences.findMany({
    where: { workspaceId: workspace.id, userId: { in: visibleUserIds } },
    include: {
      user: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  const canReviewTeam =
    member.active &&
    workspace.kind === "COMPANY" &&
    (member.role === "OWNER" || member.role === "MANAGER");
  const reviewable = new Set(
    visibleMembers
      .filter((item) => canReview(member, { ...item, workspaceId: workspace.id }))
      .map((item) => item.userId),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ausências</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre férias, folgas e afastamentos. O histórico fica separado por espaço.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Registrar ausência</CardTitle>
            <CardDescription>
              {workspace.kind === "COMPANY" && member.role === "COLLABORATOR"
                ? "O gestor responsável revisará o pedido."
                : "Neste espaço, o registro ficará disponível imediatamente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              label="Salvar ausência"
              hidden={{ operation: "absenceCreate", workspaceId: workspace.id }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data inicial">
                  <Input name="startDate" type="date" required />
                </Field>
                <Field label="Data final">
                  <Input name="endDate" type="date" required />
                </Field>
              </div>
              <Field label="Tipo">
                <select
                  name="type"
                  defaultValue="DAY_OFF"
                  className="h-11 w-full rounded-[11px] border border-border bg-input/50 px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Observação">
                <textarea
                  name="reason"
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={4}
                  placeholder="Informe o motivo ou uma observação para a equipe."
                  className="w-full resize-y rounded-[11px] border border-border bg-input/50 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
                />
              </Field>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {canReviewTeam ? "Pedidos da equipe" : "Meus registros"}
            </CardTitle>
            <CardDescription>
              {canReviewTeam
                ? "Acompanhe e decida os pedidos das pessoas sob sua responsabilidade."
                : "Confira o andamento das suas ausências."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {absences.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Nenhuma ausência registrada neste espaço.
              </p>
            ) : (
              absences.map((absence) => {
                const isOwn = absence.userId === user.id;
                const canDecide =
                  absence.status === "PENDING" && reviewable.has(absence.userId);
                return (
                  <div key={absence.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {isOwn ? "Você" : absence.user.name}
                        </p>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground">
                            {absence.user.email}
                          </p>
                        )}
                        <p className="mt-2 text-sm">
                          {typeLabels[absence.type]} ·{" "}
                          {formatDateRange(absence.startDate, absence.endDate)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {absence.reason}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          absence.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : absence.status === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {statusLabels[absence.status]}
                      </span>
                    </div>
                    {absence.approvedBy && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Decidida por {absence.approvedBy.name}.
                      </p>
                    )}
                    {canDecide && (
                      <div className="mt-4 border-t border-border pt-4">
                        <ActionForm
                          label="Aprovar"
                          hidden={{
                            operation: "absenceDecide",
                            workspaceId: workspace.id,
                            absenceId: absence.id,
                            decision: "APPROVED",
                          }}
                        >
                          <Field label="Comentário da decisão">
                            <Input
                              name="reason"
                              required
                              minLength={3}
                              placeholder="Ex.: conferido com a equipe"
                            />
                          </Field>
                        </ActionForm>
                        <ActionForm
                          label="Rejeitar pedido"
                          hidden={{
                            operation: "absenceDecide",
                            workspaceId: workspace.id,
                            absenceId: absence.id,
                            decision: "REJECTED",
                          }}
                          className="mt-3 space-y-4"
                        >
                          <Field label="Motivo da rejeição">
                            <Input
                              name="reason"
                              required
                              minLength={3}
                              placeholder="Explique a decisão"
                            />
                          </Field>
                        </ActionForm>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
