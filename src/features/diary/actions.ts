"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { localDateISO } from "@/lib/format";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studied: z.string().max(10000),
  learned: z.string().max(10000),
  difficulties: z.string().max(10000),
});

/** Salva a entrada do dia (cria, atualiza ou apaga se ficou vazia). */
export async function saveDiaryAction(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const profile = await getProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Texto longo demais (máximo de 10.000 caracteres)." };
  const { date, ...fields } = parsed.data;
  if (date > localDateISO(profile.timezone, new Date()))
    return { ok: false, message: "A data não pode estar no futuro." };

  const supabase = await createClient();
  const clean = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.trim() ? v : null]));
  const empty = Object.values(clean).every((v) => v === null);
  const { error } = empty
    ? await supabase.from("study_diaries").delete().eq("entry_date", date)
    : await supabase
        .from("study_diaries")
        .upsert({ user_id: profile.id, entry_date: date, ...clean }, { onConflict: "user_id,entry_date" });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh(); // atualiza "Entradas recentes"; o editor mantém o texto em estado local
  return { ok: true };
}
