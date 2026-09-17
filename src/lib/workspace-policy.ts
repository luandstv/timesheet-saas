export type Membership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: "OWNER" | "MANAGER" | "COLLABORATOR";
  active: boolean;
  managerId: string | null;
};

/** Global legacy roles never grant workspace permissions. */
export function canReview(actor: Membership, subject: Membership) {
  if (!actor.active || actor.workspaceId !== subject.workspaceId) return false;
  if (actor.role === "OWNER") return true;
  return (
    actor.role === "MANAGER" &&
    subject.active &&
    subject.userId !== actor.userId &&
    subject.managerId === actor.id &&
    subject.role === "COLLABORATOR"
  );
}

export function canReadMember(actor: Membership, subject: Membership) {
  return (
    actor.workspaceId === subject.workspaceId &&
    (actor.userId === subject.userId || canReview(actor, subject))
  );
}
