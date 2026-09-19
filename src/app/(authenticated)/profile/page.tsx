import { resolveOnCallMonth } from "@/lib/on-call-month";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { OnCallService } from "@/services/on-call.service";
import prisma from "@/lib/prisma";
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

  return (
    <PersonProfile
      profile={{
        ...membership.user,
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
