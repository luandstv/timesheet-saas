"use client";

import Link from "next/link";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await requestPasswordReset(email);
    setMessage({ ok: result.ok, text: result.message });
    setPending(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em]">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recovery-email">E-mail</Label>
          <Input
            id="recovery-email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {message && (
          <p
            role="status"
            className={
              message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Enviando…" : "Enviar instruções"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
