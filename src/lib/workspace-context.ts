import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import prisma from "./prisma";
import { getAuthenticatedUser } from "./auth";

/** Request-local memoization only; never shares identity between users. */
export const getWorkspaceContext = cache(async () => {
  const user = await getAuthenticatedUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  const selected = (await cookies()).get("jornix-workspace")?.value;
  const member =
    memberships.find((item) => item.workspaceId === selected) ??
    memberships.find((item) => item.workspace.kind === "PERSONAL");
  if (!member)
    throw new Error(
      "Seu espaço pessoal não foi criado. Verifique a migração de espaços.",
    );
  return { user, member, workspace: member.workspace, memberships };
});
