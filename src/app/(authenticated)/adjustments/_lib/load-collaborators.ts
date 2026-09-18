import "server-only";

import { effectiveEntries } from "@/lib/effective-entries";
import type { Membership } from "@/lib/workspace-policy";
import type { Prisma } from "../../../../../generated/prisma/client";

type DirectoryStatus = "active" | "inactive" | "all";
type DirectorySort = "priority" | "name" | "recent" | "open";

export type CollaboratorDirectoryItem = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: Membership["role"];
  active: boolean;
  pendingCount: number;
  hasOpenPoint: boolean;
  lastActivityAt: string | null;
};

export type CollaboratorDirectory = {
  items: CollaboratorDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const pageSize = 12;

function compareText(left: string, right: string) {
  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function compareRecent(
  left: CollaboratorDirectoryItem,
  right: CollaboratorDirectoryItem,
) {
  return (
    (right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0) -
    (left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0)
  );
}

export async function loadCollaboratorDirectory({
  db,
  actor,
  workspaceId,
  search,
  status,
  sort,
  page,
  includeAll = false,
}: {
  db: Prisma.TransactionClient | typeof import("@/lib/prisma").default;
  actor: Membership;
  workspaceId: string;
  search: string;
  status: DirectoryStatus;
  sort: DirectorySort;
  page: number;
  includeAll?: boolean;
}): Promise<CollaboratorDirectory> {
  const isOwner = actor.role === "OWNER";
  const memberWhere: Prisma.WorkspaceMemberWhereInput = {
    workspaceId,
    ...(isOwner
      ? {}
      : {
          managerId: actor.id,
          role: "COLLABORATOR",
          active: true,
        }),
    ...(isOwner && status !== "all" ? { active: status === "active" } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const members = await db.workspaceMember.findMany({
    where: memberWhere,
    select: {
      id: true,
      userId: true,
      role: true,
      active: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (members.length === 0) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  const userIds = members.map((member) => member.userId);
  const [entries, requests] = await Promise.all([
    db.timeEntry.findMany({
      where: { timesheet: { workspaceId, userId: { in: userIds } } },
      include: { timesheet: { select: { id: true, userId: true } } },
    }),
    db.adjustmentRequest.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING"] },
        timesheet: { workspaceId, userId: { in: userIds } },
      },
      include: { timesheet: { select: { id: true, userId: true } } },
    }),
  ]);

  const rawByUser = new Map<string, typeof entries>();
  for (const entry of entries) {
    const userEntries = rawByUser.get(entry.timesheet.userId) ?? [];
    userEntries.push(entry);
    rawByUser.set(entry.timesheet.userId, userEntries);
  }
  const requestsByUser = new Map<string, typeof requests>();
  for (const request of requests) {
    const userRequests = requestsByUser.get(request.timesheet.userId) ?? [];
    userRequests.push(request);
    requestsByUser.set(request.timesheet.userId, userRequests);
  }

  const items = members.map((member) => {
    const userEntries = rawByUser.get(member.userId) ?? [];
    const userRequests = requestsByUser.get(member.userId) ?? [];
    const effective = effectiveEntries(userEntries, userRequests);
    const pendingCount = userRequests.filter(
      (request) => request.status === "PENDING",
    ).length;
    const activityDates = [
      ...userEntries.flatMap((entry) => [entry.timestamp, entry.createdAt]),
      ...userRequests.map((request) => request.createdAt),
    ];
    const lastActivity = activityDates.sort((left, right) => +right - +left)[0];

    return {
      memberId: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      active: member.active,
      pendingCount,
      hasOpenPoint: effective.at(-1)?.type === "CLOCK_IN",
      lastActivityAt: lastActivity?.toISOString() ?? null,
    } satisfies CollaboratorDirectoryItem;
  });

  items.sort((left, right) => {
    if (sort === "name") return compareText(left.name, right.name);
    if (sort === "recent")
      return compareRecent(left, right) || compareText(left.name, right.name);
    if (sort === "open") {
      return (
        Number(right.hasOpenPoint) - Number(left.hasOpenPoint) ||
        compareText(left.name, right.name)
      );
    }
    return (
      right.pendingCount - left.pendingCount ||
      Number(right.hasOpenPoint) - Number(left.hasOpenPoint) ||
      compareText(left.name, right.name)
    );
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    items: includeAll
      ? items
      : items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: includeAll ? 1 : safePage,
    pageSize,
    totalPages,
  };
}
