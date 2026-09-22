"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { workspaceAction } from "./actions";

export function WorkspaceDangerActions({
  workspaceId,
  isOwner,
}: {
  workspaceId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(workspaceAction, {});
  const router = useRouter();
  const operation = isOwner ? "archive" : "leave";

  useEffect(() => {
    if (state.ok) router.push("/");
  }, [router, state.ok]);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isOwner ? "Arquivar empresa" : "Sair da empresa"}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !pending) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-danger-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="workspace-danger-title" className="font-semibold">
                    {isOwner ? "Arquivar esta empresa?" : "Sair desta empresa?"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isOwner
                      ? "A empresa ficará arquivada e deixará de aparecer para todos. O histórico será preservado e você voltará ao seu espaço pessoal."
                      : "Seu vínculo será desativado e você voltará ao seu espaço pessoal. O histórico da empresa será preservado."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Fechar confirmação"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <form action={action} className="mt-6 space-y-3">
              <input type="hidden" name="operation" value={operation} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending && (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  )}
                  {isOwner ? "Arquivar empresa" : "Confirmar saída"}
                </Button>
              </div>
              {state.message && (
                <p
                  role={state.ok ? "status" : "alert"}
                  className="text-sm text-destructive"
                >
                  {state.message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
