"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { profileSchema, type ProfileFormData } from "@/schemas/settings.schema";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  defaultValues: ProfileFormData;
  email: string;
}

export function ProfileForm({ defaultValues, email }: ProfileFormProps) {
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
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true);
    setMessage(null);

    const result = await updateProfile(data);

    if (result.success) {
      setMessage({ type: "success", text: "Dados pessoais atualizados com sucesso!" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao salvar" });
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">E-mail</Label>
        <Input id="profile-email" value={email} readOnly disabled />
        <p className="text-xs text-muted-foreground">
          O e-mail é usado para acesso e só pode ser alterado no provedor de
          autenticação.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-xl border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar dados pessoais"}
      </Button>
    </form>
  );
}
