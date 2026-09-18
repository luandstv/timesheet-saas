"use client";
import { useActionState, useTransition } from "react";
import { useRef } from "react";
import { workspaceAction } from "@/app/(authenticated)/workspaces/actions";
import { LoadingOverlay } from "./page-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WorkspaceSelector({
  current,
  spaces,
}: {
  current: string;
  spaces: { id: string; name: string; active: boolean }[];
}) {
  const [state, action, pending] = useActionState(workspaceAction, {});
  const [isSwitching, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const switchWorkspace = (workspaceId: string) => {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    formData.set("workspaceId", workspaceId);
    startTransition(() => action(formData));
  };

  const switching = pending || isSwitching;

  return (
    <div className="relative mr-auto flex min-w-0 items-center gap-2">
      <form ref={formRef} action={action} className="flex min-w-0 items-center">
        <input type="hidden" name="operation" value="switch" />
        <Select
          key={current}
          defaultValue={current}
          disabled={switching}
          onValueChange={switchWorkspace}
        >
          <SelectTrigger
            size="sm"
            aria-label="Espaço de trabalho"
            className="w-28 bg-card sm:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spaces.map((space) => (
              <SelectItem value={space.id} key={space.id}>
                {space.name}
                {space.active ? "" : " (histórico)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
      {switching && <LoadingOverlay message="Trocando espaço…" />}
      {state.ok === false && (
        <p
          role="alert"
          className="absolute top-full left-0 z-50 mt-1 whitespace-nowrap rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive shadow-sm"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
