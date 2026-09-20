import { resolveOnCallMonth } from "@/lib/on-call-month";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { OnCallService } from "@/services/on-call.service";
import prisma from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";
import { PersonProfile } from "@/components/shared/person-profile";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const { user, workspace } = await getWorkspaceContext();
  const monthKey = resolveOnCallMonth((await searchParams)?.month);
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    select: {
      role: true,
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

  if (!membership) return null;

  const onCallDays = await OnCallService.listMonth(user.id, workspace.id, monthKey);
  const avatarUrl = await resolveAvatarUrl(membership.user.avatarPath);

  return (
    <PersonProfile
      profile={{
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        phone: membership.user.phone,
        avatarUrl,
        dailyHours: membership.user.dailyHours,
        weeklyHours: membership.user.weeklyHours,
        workStartHour: membership.user.workStartHour,
        workStartMinute: membership.user.workStartMinute,
        workEndHour: membership.user.workEndHour,
        workEndMinute: membership.user.workEndMinute,
        role: membership.role,
        managerName: membership.manager?.user.name ?? null,
        workspaceName: workspace.name,
      }}
      onCallDays={onCallDays}
      monthKey={monthKey}
      backHref="/dashboard"
      isOwn
    />
  );
}
