import test from "node:test";
import assert from "node:assert/strict";
import { canReadMember, canReview } from "../src/lib/workspace-policy.ts";

const member = (id, role, extra = {}) => ({
  id,
  userId: id,
  workspaceId: "company-a",
  role,
  active: true,
  managerId: null,
  ...extra,
});

test("owner revisa a empresa e a si próprio, nunca outro espaço", () => {
  const owner = member("owner", "OWNER");
  assert.equal(canReview(owner, owner), true);
  assert.equal(canReview(owner, member("x", "MANAGER")), true);
  assert.equal(
    canReview(owner, member("x", "COLLABORATOR", { workspaceId: "company-b" })),
    false,
  );
});
test("gestor revisa apenas colaboradores diretos ativos e nunca a si próprio", () => {
  const manager = member("manager", "MANAGER");
  assert.equal(
    canReview(manager, member("employee", "COLLABORATOR", { managerId: "manager" })),
    true,
  );
  assert.equal(canReview(manager, manager), false);
  assert.equal(canReview(manager, member("employee", "COLLABORATOR")), false);
  assert.equal(
    canReview(
      manager,
      member("employee", "COLLABORATOR", { managerId: "manager", active: false }),
    ),
    false,
  );
  assert.equal(
    canReview(manager, member("other", "MANAGER", { managerId: "manager" })),
    false,
  );
});
test("troca de gestor transfere pendências e desligamento mantém só leitura própria", () => {
  const employee = member("employee", "COLLABORATOR", { managerId: "new-manager" });
  assert.equal(canReview(member("old-manager", "MANAGER"), employee), false);
  assert.equal(canReview(member("new-manager", "MANAGER"), employee), true);
  const inactive = { ...employee, active: false };
  assert.equal(canReadMember(inactive, inactive), true);
  assert.equal(canReadMember(inactive, member("another", "COLLABORATOR")), false);
  assert.equal(canReview(member("owner", "OWNER"), inactive), true);
  assert.equal(canReview(member("owner", "OWNER", { active: false }), inactive), false);
});
test("colaborador não lê colegas e papel global legado não concede aprovação", () => {
  const collaborator = { ...member("me", "COLLABORATOR"), globalRole: "ADMIN" };
  assert.equal(canReview(collaborator, collaborator), false);
  assert.equal(canReadMember(collaborator, member("other", "COLLABORATOR")), false);
  assert.equal(
    canReadMember(collaborator, { ...collaborator, workspaceId: "another" }),
    false,
  );
});
