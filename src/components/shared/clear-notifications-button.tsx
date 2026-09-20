"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  workspaceAction,
  type ActionResult,
} from "@/app/(authenticated)/workspaces/actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? (
        <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
      {pending ? "Limpando…" : "Limpar notificações"}
    </Button>
  );
}

export function ClearNotificationsButton() {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult, FormData>(workspaceAction, {});

  useEffect(() => {
    if (state.ok === true) router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="operation" value="clearNotifications" />
      <SubmitButton />
      {state.ok === false && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {state.message ?? "Não foi possível limpar as notificações."}
        </p>
      )}
    </form>
  );
}
