"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { salarySchema, type SalaryFormData } from "@/schemas/settings.schema";
import { updateSalary } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SalaryFormProps {
  defaultValues: SalaryFormData;
}

export function SalaryForm({ defaultValues }: SalaryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SalaryFormData>({
    resolver: zodResolver(salarySchema),
    defaultValues,
  });

  async function onSubmit(data: SalaryFormData) {
    setIsLoading(true);
    setMessage(null);

    const result = await updateSalary(data);

    if (result.success) {
      setMessage({ type: "success", text: "Salário atualizado com sucesso!" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao salvar" });
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="baseSalary">Salário base (R$)</Label>
        <Input
          id="baseSalary"
          type="number"
          step="0.01"
          min={0}
          placeholder="5000.00"
          {...register("baseSalary", { valueAsNumber: true })}
        />
        {errors.baseSalary && (
          <p className="text-sm text-destructive">
            {errors.baseSalary.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="monthlyHours">Horas mensais</Label>
        <Input
          id="monthlyHours"
          type="number"
          step="0.01"
          min={0}
          placeholder="220"
          {...register("monthlyHours", { valueAsNumber: true })}
        />
        {errors.monthlyHours && (
          <p className="text-sm text-destructive">
            {errors.monthlyHours.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Padrão CLT: 220h (44h/semana) ou 200 (40h/semana)
        </p>
      </div>
      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-500" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar Salário"}
      </Button>
    </form>
  );
}
