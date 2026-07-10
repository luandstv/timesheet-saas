"use client";

import { clockIn } from "@/app/(authenticated)/time-entries/actions";
import { Clock, LogIn, LogOut } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { LiveClock } from "./live-clock";

interface ClockCardProps {
  nextType: "CLOCK_IN" | "CLOCK_OUT";
  lastEntryTime: string | null;
}

export function ClockCard({ nextType, lastEntryTime }: ClockCardProps) {
  const router = useRouter();
  const [currentType, setCurrentType] = useState(nextType);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentType(nextType);
  }, [nextType]);

  async function handleClick() {
    if (isLoading) return;
    setIsLoading(true);

    const result = await clockIn();

    if (!result.success) {
      console.error("clock-card:33", result.error);
    } else {
      setCurrentType(result.type === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN");
      startTransition(() => {
        router.refresh();
      });
    }

    setIsLoading(false);
  }

  const isWorking = currentType === "CLOCK_OUT";
  const isEntry = currentType === "CLOCK_IN";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <LiveClock />

        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full 
                ${isWorking ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          <span className="text-sm text-muted-foreground">
            {isWorking ? "Trabalhando" : "Parado"}
          </span>
        </div>

        {lastEntryTime && (
          <p className="text-xs text-muted-foreground">
            {isWorking ? "Entrada" : "Saída"} ás {lastEntryTime}
          </p>
        )}

        <Button
          onClick={handleClick}
          disabled={isLoading}
          size="lg"
          className="mt-2 gap-2"
          variant={isEntry ? "default" : "secondary"}
        >
          {isLoading ? (
            <Clock className="h-5 w-5 animate-spin" />
          ) : isEntry ? (
            <LogIn className="h-5 w-5" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}

          {isLoading
            ? "Registrando..."
            : isEntry
              ? "Registrar Entrada"
              : "Registrar Saída"}
        </Button>
      </CardContent>
    </Card>
  );
}
