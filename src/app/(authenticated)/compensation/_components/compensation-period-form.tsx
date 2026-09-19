"use client";

import { Calculator, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { LoadingOverlay } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompensationPeriodForm({ month }: { month: string }) {
  const router = useRouter();
  const [monthValue, setMonthValue] = useState(month);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!monthValue || isPending) return;

    startTransition(() => {
      if (monthValue === month) {
        router.refresh();
        return;
      }

      router.push(`/compensation?month=${encodeURIComponent(monthValue)}`);
    });
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="grid gap-2">
          <Label htmlFor="compensation-month">Período</Label>
          <Input
            id="compensation-month"
            name="month"
            type="month"
            value={monthValue}
            onChange={(event) => setMonthValue(event.target.value)}
            className="sm:w-52"
          />
        </div>
        <Button type="submit" disabled={isPending || !monthValue}>
          {isPending ? (
            <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Calculator aria-hidden="true" />
          )}
          {isPending ? "Atualizando…" : "Atualizar cálculo"}
        </Button>
      </form>
      {isPending && <LoadingOverlay message="Atualizando cálculo…" />}
    </>
  );
}
