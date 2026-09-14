import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
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
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh w-full overflow-x-clip bg-background">
      <Sidebar name={user.name} email={user.email} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="md:hidden"><BrandMark /></div>
          <div className="mr-auto hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <span>Jornix</span>
            <span className="text-primary">/</span>
            <span className="font-medium text-foreground">Meu espaço</span>
          </div>
          <HeaderTools />
          <ThemeToggle />
          <UserNav name={user.name} email={user.email} />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
