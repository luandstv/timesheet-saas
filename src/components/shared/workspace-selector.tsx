"use client";
import { useActionState } from "react";
import { workspaceAction } from "@/app/(authenticated)/workspaces/actions";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="relative mr-auto flex min-w-0 items-center gap-2">
      <form action={action} className="flex min-w-0 items-center gap-2">
        <input type="hidden" name="operation" value="switch" />
        <Select
          key={current}
          name="workspaceId"
          defaultValue={current}
          disabled={pending}
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
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          {pending ? "…" : "Trocar"}
        </Button>
      </form>
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
