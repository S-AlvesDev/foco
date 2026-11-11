"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/features/questions/queries";
import { getPlan } from "./queries";

const schema = z.object({
  planId: z.string().max(60),
  meta: z.string().max(8),
  item: z.number().int().min(0).max(20),
  done: z.boolean(),
});

/** Marca (ou desmarca) um item do plano que conclui à mão: questões, revisão ou revisão geral. */
export async function setPlanMarkAction(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Item inválido." };
  const { planId, meta, item, done } = parsed.data;
  const plan = getPlan(planId);
  const m = plan?.metas.find((x) => x.id === meta);
  const exists = m && (m.review ? item === 0 : item < (m.items?.length ?? 0));
  if (!plan || !exists) return { ok: false, message: "Item inválido." };

  const supabase = await createClient();
  const { error } = done
    ? await supabase
        .from("study_plan_marks")
        .upsert(
          { plan_id: planId, meta, item },
          { onConflict: "user_id,plan_id,meta,item", ignoreDuplicates: true },
        )
    : await supabase.from("study_plan_marks").delete().match({ plan_id: planId, meta, item });
  if (error) {
    if (isMissingSchema(error))
      return { ok: false, message: "Falta criar a tabela do plano no Supabase (migração 0013)." };
    return { ok: false, message: dbErrorMessage(error) };
  }
  refresh();
  return { ok: true };
}
