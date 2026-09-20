"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { workspaceAction } from "@/app/(authenticated)/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Salvando…" : label}
    </Button>
  );
}

export function ActionForm({
  children,
  label,
  hidden,
  disabled,
  refreshOnSuccess = false,
  className = "space-y-4",
}: {
  children?: ReactNode;
  label: string;
  hidden: Record<string, string>;
  className?: string;
  disabled?: boolean;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(workspaceAction, {});

  useEffect(() => {
    if (refreshOnSuccess && state.ok === true) router.refresh();
  }, [refreshOnSuccess, router, state]);

  return (
    <form action={action} className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={false} className="min-w-0 space-y-3">
        {children}
      </fieldset>
      <Submit label={label} disabled={disabled} />
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      )}
      {state.invitation && (
        <div className="rounded-xl border border-primary/30 bg-accent p-3">
          <label className="text-sm font-medium">
            Código do convite
            <Input
              aria-label="Código do convite"
              readOnly
              value={state.invitation}
              onFocus={(event) => event.target.select()}
              className="mt-2 h-9 text-xs"
            />
          </label>
        </div>
      )}
    </form>
  );
}
