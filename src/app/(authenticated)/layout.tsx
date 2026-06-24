import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { Sidebar } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";

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
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end gap-4 border-b px-6">
          <ThemeToggle />
          <UserNav name={user.name} email={user.email} />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
