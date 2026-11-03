import { z } from "zod";

export const subjectSchema = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Dê um nome à matéria.").max(80, "Use até 80 caracteres."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Escolha uma cor."),
  description: z
    .string()
    .trim()
    .max(500, "Use até 500 caracteres.")
    .transform((v) => (v === "" ? null : v)),
});

export const uuid = z.string().uuid();
