import assert from "node:assert/strict";
import test from "node:test";
import {
  authCallbackDestination,
  authCallbackErrorDestination,
  authRouteRedirect,
} from "../src/lib/auth-route-policy.ts";

test("a recuperação mantém callback e nova senha acessíveis após criar a sessão", () => {
  assert.equal(authRouteRedirect("/auth/callback", false), null);
  assert.equal(authRouteRedirect("/auth/callback", true), null);
  assert.equal(authRouteRedirect("/reset-password", true), null);
  assert.equal(authRouteRedirect("/reset-password", false), null);
});

test("páginas privadas ainda exigem login e páginas de entrada não reaparecem após login", () => {
  assert.equal(authRouteRedirect("/dashboard", false), "/login");
  assert.equal(authRouteRedirect("/login", true), "/dashboard");
  assert.equal(authRouteRedirect("/forgot-password", true), null);
});

test("o callback leva o link de recuperação à troca de senha e restringe destinos desconhecidos", () => {
  assert.equal(authCallbackDestination("/reset-password"), "/reset-password");
  assert.equal(authCallbackDestination(null), "/dashboard");
  assert.equal(authCallbackDestination("/\\evil.example"), "/dashboard");
  assert.equal(
    authCallbackErrorDestination("/reset-password"),
    "/reset-password?error=link",
  );
  assert.equal(authCallbackErrorDestination(null), "/login?error=callback");
});
