import { getWorkspaceContext } from "@/lib/workspace-context";
import { WorkspaceSelector } from "@/components/shared/workspace-selector";
import { Sidebar } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeaderTools } from "@/components/shared/header-tools";
import { BrandMark } from "@/components/shared/brand-mark";
import { AppFooter } from "@/components/shared/app-footer";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace, member, memberships } = await getWorkspaceContext();

  return (
    <div className="flex min-h-dvh w-full overflow-x-clip bg-background">
      <Sidebar name={user.name} email={user.email} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="md:hidden">
            <BrandMark />
          </div>
          <WorkspaceSelector
            current={workspace.id}
            spaces={memberships.map((item) => ({
              id: item.workspaceId,
              name: item.workspace.name,
              active: item.active,
            }))}
          />
          <HeaderTools />
          <ThemeToggle />
          <UserNav name={user.name} email={user.email} />
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
