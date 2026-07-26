"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  workScheduleSchema,
  type WorkScheduleFormData,
} from "@/schemas/settings.schema";
import { updateWorkSchedule } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkScheduleFormProps {
  defaultValues: WorkScheduleFormData;
}

export function WorkScheduleForm({ defaultValues }: WorkScheduleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkScheduleFormData>({
    resolver: zodResolver(workScheduleSchema),
    defaultValues,
  });

  async function onSubmit(data: WorkScheduleFormData) {
    setIsLoading(true);
    setMessage(null);

    const result = await updateWorkSchedule(data);

    if (result.success) {
      setMessage({ type: "success", text: "Jornada atualizada com sucesso!" });
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao salvar" });
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workStartHour">Início (hora)</Label>
          <Input
            id="workStartHour"
            type="number"
            min={0}
            max={23}
            {...register("workStartHour", { valueAsNumber: true })}
          />
          {errors.workStartHour && (
            <p className="text-sm text-destructive">
              {errors.workStartHour.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="workStartMinute">Início (minuto)</Label>
          <Input
            id="workStartMinute"
            type="number"
            min={0}
            max={59}
            {...register("workStartMinute", { valueAsNumber: true })}
          />
          {errors.workStartMinute && (
            <p className="text-sm text-destructive">
              {errors.workStartMinute.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workEndHour">Fim (hora)</Label>
          <Input
            id="workEndHour"
            type="number"
            min={0}
            max={23}
            {...register("workEndHour", { valueAsNumber: true })}
          />
          {errors.workEndHour && (
            <p className="text-sm text-destructive">
              {errors.workEndHour.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workEndMinute">Fim (minuto)</Label>
          <Input
            id="workEndMinute"
            type="number"
            min={0}
            max={59}
            {...register("workEndMinute", { valueAsNumber: true })}
          />
          {errors.workEndMinute && (
            <p className="text-sm text-destructive">
              {errors.workEndMinute.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dailyHours">Horas por dia</Label>
          <Input
            id="dailyHours"
            type="number"
            min={1}
            max={24}
            {...register("dailyHours", { valueAsNumber: true })}
          />
          {errors.dailyHours && (
            <p className="text-sm text-destructive">
              {errors.dailyHours.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="weeklyHours">Horas por Semana</Label>
          <Input
            id="weeklyHours"
            type="number"
            min={1}
            max={168}
            {...register("weeklyHours", { valueAsNumber: true })}
          />
          {errors.weeklyHours && (
            <p className="text-sm text-destructive">
              {errors.weeklyHours.message}
            </p>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-500" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar Jornada"}
      </Button>
    </form>
  );
}
