"use client";

import { clockIn } from "@/app/(authenticated)/time-entries/actions";
import { AlarmClock, CalendarDays, LoaderCircle, LogIn, LogOut, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { LiveClock } from "./live-clock";
import { cn } from "@/lib/utils";

interface ClockCardProps {
  nextType: "CLOCK_IN" | "CLOCK_OUT";
  lastEntryTime: string | null;
  dateLabel?: string;
  className?: string;
}

export function ClockCard({ nextType, lastEntryTime, dateLabel, className }: ClockCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await clockIn();
        if (!result.success) setError(result.error ?? "Não foi possível registrar o ponto.");
        else router.refresh();
      } catch {
        setError("Não foi possível registrar. Confira sua conexão e tente novamente.");
      }
    });
  }

  const isWorking = nextType === "CLOCK_OUT";
  return (
    <Card className={cn("min-h-[290px] py-5", className)}>
      <CardContent className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground"><AlarmClock className="size-6" /></span>
            <div><h2 className="font-semibold">Agora</h2><p className="mt-1 text-xs text-muted-foreground">Horário oficial do seu ponto</p></div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center pt-5">
            <LiveClock className="min-h-14 text-[clamp(2.5rem,4vw,4rem)] leading-tight font-bold tracking-tight tabular-nums" />
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><span className="size-2.5 rounded-full bg-primary" />{isWorking ? "Trabalhando" : "Parado"}</p>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{lastEntryTime ? `${isWorking ? "Entrada" : "Saída"} às ${lastEntryTime}` : "Nenhum movimento registrado hoje"}</p>
            <Button onClick={handleClick} disabled={isPending} size="lg" className="mt-5 h-11 w-full max-w-60 rounded-full bg-primary font-semibold text-primary-foreground shadow-sm hover:brightness-105 motion-reduce:transition-none dark:bg-linear-to-r dark:from-primary dark:to-[#ffc477]">
              {isPending ? <LoaderCircle className="animate-spin" /> : isWorking ? <LogOut /> : <LogIn />}
              {isPending ? "Registrando..." : isWorking ? "Registrar Saída" : "Registrar Entrada"}
            </Button>
            {error && <p role="alert" className="mt-3 text-center text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <div className="relative hidden min-w-0 flex-col justify-end border-l border-border pl-4 xl:flex">
          <Image src="/jornix/south-america.svg" width={250} height={270} alt="" className="absolute inset-0 h-full w-full object-contain opacity-80" />
          <span className="relative mx-auto mb-12 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-accent px-2.5 py-2 text-[10px] font-medium text-accent-foreground"><MapPin className="size-3" />América/São Paulo</span>
          <div className="relative flex items-start gap-2 rounded-xl border border-border bg-card/95 p-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0"><p className="text-[11px] font-medium leading-5">{dateLabel ?? "Horário de Brasília"}</p><p className="mt-1 text-[10px] text-muted-foreground">América/São Paulo (BRT)</p></div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground xl:hidden">{dateLabel ? `${dateLabel} · ` : ""}América/São Paulo (BRT)</p>
      </CardContent>
    </Card>
  );
}
