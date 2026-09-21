"use client";

import { Check, LoaderCircle } from "lucide-react";
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
    <Button
      type="submit"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={pending ? "Marcando como lida" : "Marcar como lida"}
      className="absolute right-2 bottom-2 size-7 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
    >
      {pending ? (
        <LoaderCircle
          className="size-3.5 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Check className="size-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}

export function MarkNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult, FormData>(workspaceAction, {});

  useEffect(() => {
    if (state.ok === true) router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="absolute right-2 bottom-2">
      <input type="hidden" name="operation" value="readNotification" />
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton />
    </form>
  );
}
