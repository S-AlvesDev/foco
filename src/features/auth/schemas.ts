import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .email("Esse e-mail não parece válido.");

export const passwordRule = z
  .string()
  .min(8, "Use ao menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Como você quer ser chamado?").max(60, "Use até 60 caracteres."),
  email,
  password: passwordRule,
  timezone: z.string().trim().max(64).optional().default(""),
});

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não conferem.",
    path: ["confirm"],
  });
