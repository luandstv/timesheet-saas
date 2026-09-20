import { DateTime } from "luxon";
import { z } from "zod";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { OnCallService } from "@/services/on-call.service";
import { requireRead } from "@/services/workspace.service";
import { OnCallCalendar } from "./_components/on-call-calendar";
import { OnCallPersonSelector } from "./_components/on-call-person-selector";
import { OnCallTeamOverview } from "./_components/on-call-team-overview";

export default async function OnCallPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; person?: string }>;
}) {
  const { user, workspace, member } = await getWorkspaceContext();
  const query = (await searchParams) ?? {};
  const now = DateTime.now().setZone(TIMEZONE);
  const requestedMonth = query.month ?? now.toFormat("yyyy-MM");
  const parsed = DateTime.fromISO(`${requestedMonth}-01`, { zone: TIMEZONE });
  const monthKey =
    parsed.isValid && /^\d{4}-\d{2}$/.test(requestedMonth)
      ? requestedMonth
      : now.toFormat("yyyy-MM");
  const canViewTeam =
    member.active &&
    workspace.kind === "COMPANY" &&
    (member.role === "OWNER" || member.role === "MANAGER");
  const people = canViewTeam
    ? await prisma.workspaceMember.findMany({
        where: {
          workspaceId: workspace.id,
          active: true,
          ...(member.role === "MANAGER"
            ? { managerId: member.id, role: "COLLABORATOR" }
            : {}),
        },
        select: { userId: true, user: { select: { name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];
  const personOptions = [
    { userId: user.id, name: user.name, email: user.email },
    ...people.map((person) => ({
      userId: person.userId,
      name: person.user.name,
      email: person.user.email,
    })),
  ].filter(
    (person, index, options) =>
      options.findIndex((candidate) => candidate.userId === person.userId) === index,
  );
  const requestedPerson =
    query.person && z.string().uuid().safeParse(query.person).success
      ? query.person
      : user.id;
  const subjectId = personOptions.some((person) => person.userId === requestedPerson)
    ? requestedPerson
    : user.id;
  if (subjectId !== user.id) {
    await requireRead(prisma, workspace.id, user.id, subjectId);
  }
  const subject = personOptions.find((person) => person.userId === subjectId) ?? {
    userId: user.id,
    name: user.name,
    email: user.email,
  };
  const teamPeople = [
    { userId: user.id, name: user.name, email: user.email },
    ...people.map((person) => ({
      userId: person.userId,
      name: person.user.name,
      email: person.user.email,
    })),
  ].filter(
    (person, index, options) =>
      options.findIndex((candidate) => candidate.userId === person.userId) === index,
  );
  const [days, teamDays] = await Promise.all([
    OnCallService.listMonth(subjectId, workspace.id, monthKey),
    canViewTeam
      ? OnCallService.listMonthForUsers(
          teamPeople.map((person) => person.userId),
          workspace.id,
          monthKey,
        )
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sobreaviso</h1>
            <p className="mt-2 text-muted-foreground">
              {subjectId === user.id
                ? "Marque sua disponibilidade e acompanhe quanto tempo ficou de sobreaviso."
                : `Escala de ${subject.name} e disponibilidade de sobreaviso.`}
            </p>
          </div>
          {canViewTeam && personOptions.length > 1 && (
            <OnCallPersonSelector
              people={personOptions}
              currentUserId={subjectId}
              monthKey={monthKey}
            />
          )}
        </div>
      </div>

      <OnCallCalendar
        key={`${monthKey}-${subjectId}`}
        monthKey={monthKey}
        days={days}
        teamDays={teamDays}
        readOnly={subjectId !== user.id}
        personId={subjectId !== user.id ? subjectId : undefined}
      />

      {canViewTeam && <OnCallTeamOverview days={teamDays} monthKey={monthKey} />}

      <p className="text-xs leading-5 text-muted-foreground">
        A disponibilidade é calculada por dia civil: 15 horas em dias úteis e 24 horas
        em fins de semana ou feriados. Os acionamentos efetivamente trabalhados
        continuam sendo registrados em Registros de ponto e entram separadamente nas
        horas extras.
      </p>
    </div>
  );
}
