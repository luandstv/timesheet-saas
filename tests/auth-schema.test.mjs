import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, registerSchema } from "../src/schemas/auth.schema.ts";

test("login aceita senha preenchida sem revelar ou impor tamanho mínimo", () => {
  const result = loginSchema.safeParse({
    email: "michel@example.com",
    password: "123",
  });

  assert.equal(result.success, true);
});

test("login exige senha preenchida e e-mail válido", () => {
  const result = loginSchema.safeParse({
    email: "michel",
    password: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(
      result.error.issues.map((issue) => issue.path[0]),
      ["email", "password"],
    );
  }
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
