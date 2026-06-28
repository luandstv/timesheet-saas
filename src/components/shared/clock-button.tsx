"use client";

import { useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { clockIn } from "@/app/(authenticated)/time-entries/actions";

interface ClockButtonProps {
  nextType: "CLOCK_IN" | "CLOCK_OUT";
}

export function ClockButton({ nextType }: ClockButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const result = await clockIn();

    if (!result.success) {
      alert(!result.error);
    }

    setIsLoading(false);
  }

  const isEntry = nextType === "CLOCK_IN";

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size="lg"
      className="gap-2"
      variant={isEntry ? "default" : "outline"}
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
  );
}
