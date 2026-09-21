"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ActivityDateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function handleChange(nextValue: string) {
    if (!nextValue) return;
    startTransition(() => {
      router.replace(`${pathname}?activityDate=${encodeURIComponent(nextValue)}`, {
        scroll: false,
      });
    });
  }

  return (
    <div className="grid gap-1.5 sm:min-w-44">
      <Label htmlFor="activity-day">Dia das atividades</Label>
      <div className="relative">
        <Input
          id="activity-day"
          type="date"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          disabled={pending}
          aria-busy={pending}
        />
        {pending && (
          <LoaderCircle className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>
      {pending && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Carregando atividades…
        </p>
      )}
    </div>
  );
}
