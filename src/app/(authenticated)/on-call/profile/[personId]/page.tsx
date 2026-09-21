import { notFound } from "next/navigation";
import { z } from "zod";

import { PersonProfile } from "@/components/shared/person-profile";
import { resolveOnCallMonth } from "@/lib/on-call-month";
import { canReadMember } from "@/lib/workspace-policy";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { OnCallService } from "@/services/on-call.service";
import prisma from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";

export default async function OnCallPersonProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  const { personId } = await params;
  if (!z.string().uuid().safeParse(personId).success) notFound();
  const { user, workspace, member } = await getWorkspaceContext();
  const monthKey = resolveOnCallMonth((await searchParams)?.month);
  const subject = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: personId,
      active: true,
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      active: true,
      managerId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarPath: true,
          dailyHours: true,
          weeklyHours: true,
          workStartHour: true,
          workStartMinute: true,
          workEndHour: true,
          workEndMinute: true,
        },
      },
      manager: { select: { user: { select: { name: true } } } },
    },
  });

  if (!subject) notFound();

  if (!canReadMember(member, subject)) notFound();

  const onCallDays = await OnCallService.listMonth(personId, workspace.id, monthKey);
  const avatarUrl = await resolveAvatarUrl(subject.user.avatarPath);
  const backHref = `/on-call?${new URLSearchParams({ month: monthKey }).toString()}`;

  return (
    <PersonProfile
      profile={{
        id: subject.user.id,
        name: subject.user.name,
        email: subject.user.email,
        phone: subject.user.phone,
        avatarUrl,
        dailyHours: subject.user.dailyHours,
        weeklyHours: subject.user.weeklyHours,
        workStartHour: subject.user.workStartHour,
        workStartMinute: subject.user.workStartMinute,
        workEndHour: subject.user.workEndHour,
        workEndMinute: subject.user.workEndMinute,
        role: subject.role,
        managerName: subject.manager?.user.name ?? null,
        workspaceName: workspace.name,
      }}
      onCallDays={onCallDays}
      monthKey={monthKey}
      backHref={backHref}
      isOwn={personId === user.id}
    />
  );
}
