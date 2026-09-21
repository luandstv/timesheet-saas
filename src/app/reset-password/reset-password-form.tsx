"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As senhas não conferem.");
      return;
    }
    setPending(true);
    setMessage(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage("Não foi possível atualizar a senha. Solicite um novo link.");
      setPending(false);
      return;
    }
    router.push("/login?reset=success");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em]">
          Criar nova senha
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Escolha uma senha com pelo menos 8 caracteres para proteger sua conta.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-password">Nova senha</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirmation">Confirmar nova senha</Label>
          <Input
            id="reset-confirmation"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            minLength={8}
          />
        </div>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Atualizando…" : "Atualizar senha"}
        </Button>
      </form>
    </div>
  );
}
