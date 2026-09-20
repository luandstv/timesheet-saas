import { getWorkspaceContext } from "@/lib/workspace-context";
import { WorkspaceSelector } from "@/components/shared/workspace-selector";
import { Sidebar } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderTools } from "@/components/shared/header-tools";
import { BrandLogo } from "@/components/shared/brand-mark";
import { AppFooter } from "@/components/shared/app-footer";
import prisma from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatar";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace, member, memberships } = await getWorkspaceContext();
  const canReviewTeam =
    member.active &&
    workspace.kind === "COMPANY" &&
    (member.role === "OWNER" || member.role === "MANAGER");
  const pendingReviewCount = canReviewTeam
    ? await prisma.adjustmentRequest.count({
        where: {
          status: "PENDING",
          timesheet: {
            workspaceId: workspace.id,
            ...(member.role === "MANAGER"
              ? {
                  user: {
                    memberships: {
                      some: {
                        workspaceId: workspace.id,
                        managerId: member.id,
                        role: "COLLABORATOR",
                        active: true,
                      },
                    },
                  },
                }
              : {}),
          },
        },
      })
    : 0;
  const notifications = await prisma.userNotification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      message: true,
      href: true,
      createdAt: true,
    },
  });
  const avatarUrl = await resolveAvatarUrl(user.avatarPath);

  return (
    <div className="flex min-h-dvh w-full overflow-x-clip bg-background">
      <Sidebar name={user.name} email={user.email} avatarUrl={avatarUrl} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="md:hidden">
            <BrandLogo className="w-28" />
          </div>
          <WorkspaceSelector
            current={workspace.id}
            spaces={memberships.map((item) => ({
              id: item.workspaceId,
              name: item.workspace.name,
              active: item.active,
            }))}
          />
          <HeaderTools
            pendingCount={pendingReviewCount}
            notifications={notifications.map((notification) => ({
              ...notification,
              createdAt: notification.createdAt.toISOString(),
            }))}
          />
          <ThemeToggle />
          <UserNav name={user.name} email={user.email} avatarUrl={avatarUrl} />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {!member.active && (
            <p className="mb-5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-accent-foreground">
              Vínculo encerrado. Seu histórico está disponível para consulta.
            </p>
          )}
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
