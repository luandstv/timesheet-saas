import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import prisma from "@/lib/prisma";
import { publicMember } from "@/services/workspace.service";
import { canReview } from "@/lib/workspace-policy";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionForm } from "@/components/shared/action-form";
import { Field, ManagerField, RoleField } from "@/components/shared/workspace-fields";

export default async function WorkspacesPage() {
  const { user, member, workspace } = await getWorkspaceContext();
  const isOwner =
    member.active && member.role === "OWNER" && workspace.kind === "COMPANY";
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: workspace.id,
      ...(isOwner
        ? {}
        : member.active && member.role === "MANAGER"
          ? {
              OR: [
                { userId: user.id },
                { managerId: member.id, active: true, role: "COLLABORATOR" as const },
              ],
            }
          : { userId: user.id }),
    },
    include: { user: { select: publicMember } },
    orderBy: { createdAt: "asc" },
  });
  const managers = members.filter(
    (value) => value.active && value.role !== "COLLABORATOR",
  );
  const joins = isOwner
    ? await prisma.workspaceJoinRequest.findMany({
        where: { workspaceId: workspace.id, status: "PENDING" },
      })
    : [];
  const applicants = joins.length
    ? await prisma.user.findMany({
        where: { id: { in: joins.map((join) => join.userId) } },
        select: publicMember,
      })
    : [];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Espaços e equipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace.name} ·{" "}
          {workspace.kind === "PERSONAL" ? "Seu trabalho independente" : "Empresa"}.
          Seus dados pessoais continuam privados.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seus vínculos</CardTitle>
            <CardDescription>
              Cada espaço tem registros e permissões próprios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.map((person) => (
              <div key={person.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{person.user.name}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      {person.user.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {!person.active
                      ? "Inativo · histórico preservado"
                      : person.role === "OWNER"
                        ? "Responsável"
                        : person.role === "MANAGER"
                          ? "Gestor"
                          : "Colaborador"}
                  </span>
                </div>
                {(canReview(member, person) || person.userId === user.id) && (
                  <Link
                    className="inline-block text-sm text-accent-foreground underline underline-offset-4"
                    href={`/adjustments?userId=${person.userId}`}
                  >
                    Ajustes e fechamento
                  </Link>
                )}
                {isOwner && person.role !== "OWNER" && (
                  <details>
                    <summary className="cursor-pointer text-sm">
                      Gerenciar vínculo
                    </summary>
                    <div className="mt-4">
                      <ActionForm
                        label="Salvar vínculo"
                        hidden={{
                          operation: "member",
                          workspaceId: workspace.id,
                          memberId: person.id,
                        }}
                      >
                        <RoleField value={person.role} />
                        <ManagerField
                          managers={managers.filter((item) => item.id !== person.id)}
                          current={person.managerId}
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            name="active"
                            value="true"
                            defaultChecked={person.active}
                          />
                          Vínculo ativo
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Desativar preserva o histórico e impede novos pontos. Resolva
                          o ponto aberto antes.
                        </p>
                      </ActionForm>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        {isOwner ? (
          <Card>
            <CardHeader>
              <CardTitle>Convidar para a empresa</CardTitle>
              <CardDescription>
                A pessoa aceita usando a conta do email informado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ActionForm
                label="Gerar convite"
                hidden={{ operation: "invite", workspaceId: workspace.id }}
              >
                <Field label="Email">
                  <Input type="email" name="email" required />
                </Field>
                <RoleField />
                <ManagerField managers={managers} />
              </ActionForm>
              <div className="border-t pt-4">
                <p className="text-sm font-medium">Código para solicitar vínculo</p>
                <p className="mt-2 break-all rounded-lg bg-muted p-3 text-xs select-all">
                  {workspace.joinCode}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Compartilhe com um prestador. O vínculo só começa depois da sua
                  aprovação.
                </p>
              </div>
              <ActionForm
                label="Salvar regra de ajustes"
                hidden={{ operation: "policy", workspaceId: workspace.id }}
              >
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-1"
                    name="allowProvisional"
                    value="true"
                    defaultChecked={workspace.allowProvisional}
                  />
                  <span>
                    Aplicar provisoriamente correções de horário por esquecimento,
                    enquanto aguardam confirmação.
                  </span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Inclusões e exclusões sempre aguardam aprovação. Alterar esta opção
                  não modifica solicitações já enviadas.
                </p>
              </ActionForm>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Participar de uma empresa</CardTitle>
              <CardDescription>
                Seu histórico pessoal permanece no seu espaço.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ActionForm label="Aceitar convite" hidden={{ operation: "accept" }}>
                <Field label="Código do convite">
                  <Input name="token" required minLength={64} maxLength={64} />
                </Field>
              </ActionForm>
              <div className="border-t pt-5">
                <ActionForm label="Solicitar vínculo" hidden={{ operation: "join" }}>
                  <Field label="Código da empresa">
                    <Input name="joinCode" required />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    O responsável da empresa precisa aprovar sua solicitação.
                  </p>
                </ActionForm>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {isOwner && joins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de vínculo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {joins.map((join) => (
              <div key={join.id} className="space-y-3 rounded-xl border p-4">
                <p className="font-medium">
                  {applicants.find((item) => item.id === join.userId)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {applicants.find((item) => item.id === join.userId)?.email}
                </p>
                <ActionForm
                  label="Decidir solicitação"
                  hidden={{
                    operation: "joinDecision",
                    workspaceId: workspace.id,
                    requestId: join.id,
                  }}
                >
                  <ManagerField managers={managers} />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox name="approve" value="true" defaultChecked />
                    Aprovar vínculo (desmarque para rejeitar)
                  </label>
                </ActionForm>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Criar uma empresa</CardTitle>
          <CardDescription>
            Você será o responsável pelo novo espaço. Nenhum registro anterior será
            transferido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            label="Criar empresa"
            hidden={{ operation: "create" }}
            className="max-w-lg space-y-4"
          >
            <Field label="Nome da empresa">
              <Input name="name" required minLength={2} maxLength={80} />
            </Field>
            <Field
              label="Horas contratadas por mês (opcional)"
              description="Ative o controle de horas do time informando o pool mensal."
            >
              <Input
                name="contractedHours"
                type="number"
                min="0"
                max="100000"
                step="0.25"
                placeholder="Ex.: 300"
              />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Entrar em outro espaço</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm label="Aceitar convite" hidden={{ operation: "accept" }}>
              <Field label="Código do convite">
                <Input name="token" required minLength={64} maxLength={64} />
              </Field>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
