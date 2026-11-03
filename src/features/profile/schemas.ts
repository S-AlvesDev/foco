import { z } from "zod";

export const THEMES = ["dark", "light", "system"] as const;
export type ThemePref = (typeof THEMES)[number];

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Informe um nome.").max(60, "Use até 60 caracteres."),
});

export const preferencesSchema = z
  .object({
    theme: z.enum(THEMES),
    timezone: z.string().min(1).max(64).refine(isValidTimeZone, "Fuso horário inválido."),
    week_starts_on: z.union([z.literal(0), z.literal(1)]),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nada para salvar.");

export type PreferencesInput = z.input<typeof preferencesSchema>;
