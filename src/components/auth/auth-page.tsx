"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs } from "radix-ui";

import { LoginForm } from "@/app/login/login-form";
import { RegisterForm } from "@/app/register/register-form";
import { AuthShell } from "./auth-shell";

type AuthMode = "login" | "register";
const modes = ["login", "register"] as const;
const content = {
  login: {
    title: "Bom ter você por aqui.",
    description: "Entre para continuar sua jornada.",
  },
  register: {
    title: "Crie seu espaço.",
    description: "Uma forma simples de cuidar da sua jornada.",
  },
};

export function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const panelsRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number>();

  useEffect(() => {
    const panel = panelsRef.current?.querySelector<HTMLElement>(
      '[data-state="active"]',
    );
    if (!panel) return;

    // Follow the active content, including validation messages and text wrapping.
    const observer = new ResizeObserver(() => {
      setPanelHeight(panel.getBoundingClientRect().height);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <Tabs.Root value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
      <AuthShell
        tabs={
          <Tabs.List
            aria-label="Acesso ao Jornix"
            className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-input/50 p-1"
          >
            {modes.map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="h-10 rounded-[9px] px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {tab === "login" ? "Entrar" : "Criar conta"}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        }
      >
        {/* Preserve form state without reserving space for the inactive panel. */}
        <div
          ref={panelsRef}
          style={{ height: panelHeight }}
          className="relative transition-[height] duration-200 ease-out motion-reduce:transition-none"
        >
          {modes.map((tab) => (
            <Tabs.Content
              key={tab}
              value={tab}
              forceMount
              inert={mode !== tab}
              aria-hidden={mode !== tab}
              className="flow-root w-full min-w-0 outline-none data-[state=inactive]:absolute data-[state=inactive]:inset-x-0 data-[state=inactive]:top-0 data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0"
            >
              <div className="mb-6">
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.045em]">
                  {content[tab].title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {content[tab].description}
                </p>
              </div>
              {tab === "login" ? <LoginForm /> : <RegisterForm />}
              <p className="mt-6 text-center text-sm leading-6 text-muted-foreground">
                {tab === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
                <button
                  type="button"
                  onClick={() => setMode(tab === "login" ? "register" : "login")}
                  className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {tab === "login" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </Tabs.Content>
          ))}
        </div>
      </AuthShell>
    </Tabs.Root>
  );
}
