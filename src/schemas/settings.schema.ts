import { z } from "zod";

export const workScheduleSchema = z.object({
  workStartHour: z
    .number()
    .min(0, "Hora deve ser entre 0 e 23")
    .max(23, "Hora deve ser entre 0 e 23"),
  workStartMinute: z
    .number()
    .min(0, "Minuto deve ser entre 0 e 59")
    .max(59, "Minuto deve ser entre 0 e 59"),
  workEndHour: z
    .number()
    .min(0, "Hora deve ser entre 0 e 23")
    .max(23, "Hora deve ser entre 0 e 23"),
  workEndMinute: z
    .number()
    .min(0, "Minuto deve ser entre 0 e 59")
    .max(59, "Minuto deve ser entre 0 e 59"),
  dailyHours: z
    .number()
    .min(1, "Mínimo de 1 hora diária")
    .max(24, "Máximo de 24 horas hora diárias"),
  weeklyHours: z
    .number()
    .min(1, "Mínimo de 1 hora semanal")
    .max(168, "Máximo de 168 horas semanais"),
});

export const salarySchema = z.object({
  baseSalary: z.number().min(0, "Salário deve ser positivo"),
  monthlyHours: z.number().min(1, "Mínimo de 1 hora").max(744, "Máximo de 744 horas"),
});

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(120, "O nome deve ter no máximo 120 caracteres"),
  phone: z
    .string()
    .trim()
    .max(30, "O telefone deve ter no máximo 30 caracteres")
    .regex(/^[0-9+().\s-]*$/, "Use apenas números e os símbolos + ( ) . -")
    .optional()
    .or(z.literal("")),
});

export type WorkScheduleFormData = z.infer<typeof workScheduleSchema>;
export type SalaryFormData = z.infer<typeof salarySchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
