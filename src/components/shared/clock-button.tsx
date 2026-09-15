"use client";

import { useRef, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { clockIn } from "@/app/(authenticated)/time-entries/actions";

interface ClockButtonProps {
  nextType: "CLOCK_IN" | "CLOCK_OUT";
}

export function ClockButton({ nextType }: ClockButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  async function handleClick() {
    const requestId =
      requestIdRef.current ?? (requestIdRef.current = crypto.randomUUID());
    setIsLoading(true);
    try {
      const result = await clockIn(requestId);

      if (!result.success) {
        console.error("clock-button:20", result.error);
      }

      // Uma resposta do servidor confirma que a chave foi processada. Em caso
      // de exceção de rede, preservamos a chave para uma nova tentativa segura.
      requestIdRef.current = null;
    } catch (error) {
      console.error("clock-button:20", error);
    } finally {
      setIsLoading(false);
    }
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
