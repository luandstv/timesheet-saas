import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, registerSchema } from "../src/schemas/auth.schema.ts";

test("rejeita login com e-mail inválido e senha curta", () => {
  const result = loginSchema.safeParse({
    email: "michel",
    password: "123",
  });

  assert.equal(result.success, false);
});

test("exige confirmação igual à senha no cadastro", () => {
  const result = registerSchema.safeParse({
    name: "Michel Telo",
    email: "michel@example.com",
    password: "segura123",
    confirmPassword: "outra123",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0].path[0], "confirmPassword");
  }
});
