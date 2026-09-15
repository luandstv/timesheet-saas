"use client";

import { clockIn } from "@/app/(authenticated)/time-entries/actions";
import { AlarmClock, CalendarDays, LoaderCircle, LogIn, LogOut, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { LiveClock } from "./live-clock";
import { cn } from "@/lib/utils";

interface ClockCardProps {
  nextType: "CLOCK_IN" | "CLOCK_OUT";
  lastEntryTime: string | null;
  lastEntryDate?: string | null;
  hasPendingPreviousDay?: boolean;
  dateLabel?: string;
  className?: string;
}

export function ClockCard({ nextType, lastEntryTime, lastEntryDate, hasPendingPreviousDay = false, dateLabel, className }: ClockCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const submissionInFlight = useRef(false);
  const requestIdRef = useRef<string | null>(null);

  async function handleClick() {
    // Bloqueia também dois cliques antes de React renderizar o botão desabilitado.
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    const requestId =
      requestIdRef.current ?? (requestIdRef.current = crypto.randomUUID());
    setIsPending(true);
    setError(null);
    try {
      const result = await clockIn(requestId);
      if (!result.success) {
        requestIdRef.current = null;
        setError(result.error ?? "Não foi possível registrar o ponto.");
      } else {
        requestIdRef.current = null;
      }
      // A Server Action já envia a UI atualizada por revalidatePath. Um segundo
      // router.refresh iniciaria outra navegação após a gravação ter terminado.
    } catch {
      setError("Não foi possível confirmar o registro. Confira seus pontos antes de tentar novamente.");
    } finally {
      submissionInFlight.current = false;
      setIsPending(false);
    }
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
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><span className="size-2.5 rounded-full bg-primary" />{hasPendingPreviousDay ? "Ponto em aberto" : isWorking ? "Trabalhando" : "Parado"}</p>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{lastEntryTime ? `${isWorking ? "Entrada" : "Saída"}${lastEntryDate ? ` de ${lastEntryDate}` : ""} às ${lastEntryTime}` : "Nenhum movimento registrado hoje"}</p>
            {hasPendingPreviousDay && (
              <p role="status" className="mt-3 max-w-sm rounded-lg border border-primary/30 bg-primary/10 p-3 text-center text-xs leading-5 text-accent-foreground">
                Há uma entrada de outro dia sem saída. Confira antes de encerrar:
                a saída usará o horário atual e será vinculada à jornada de {lastEntryDate}.
              </p>
            )}
            <Button onClick={handleClick} disabled={isPending} size="lg" className="mt-5 h-11 w-full max-w-60 rounded-full bg-primary font-semibold text-primary-foreground shadow-sm hover:brightness-105 motion-reduce:transition-none dark:bg-linear-to-r dark:from-primary dark:to-[#ffc477]">
              {isPending ? <LoaderCircle className="animate-spin" /> : isWorking ? <LogOut /> : <LogIn />}
              {isPending ? "Registrando..." : isWorking ? "Registrar Saída" : "Registrar Entrada"}
            </Button>
            {error && <p role="alert" className="mt-3 text-center text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <div className="relative hidden min-w-0 flex-col justify-end border-l border-border pl-4 xl:flex">
          <Image src="/jornix/south-america.svg" width={250} height={270} alt="" loading="eager" className="absolute inset-0 h-full w-full object-contain opacity-80" />
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
