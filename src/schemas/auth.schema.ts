import { TypeOf, z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email Obrigatorio").email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const registerSchema = z
  .object({
    name: z.string().min(4, "nome deve ter no minimo 4 caracteres"),
    email: z.string().min(1, "Email Obrigatorio").email("Email inválido"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
