"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { isMissingSchema } from "@/features/questions/queries";
import { CAFE_DAYS, CAFE_PLAN_ID } from "@/features/cafe/days";
import { CHALLENGE_DAYS, CHALLENGE_PLAN_ID } from "@/features/challenge/days";

type Result = { ok: true } | { ok: false; message: string };

const schema = z.object({
  track: z.enum([CAFE_PLAN_ID, CHALLENGE_PLAN_ID]),
  day: z.string().regex(/^[A-Za-z0-9]{1,8}$/),
  item: z.number().int().min(0).max(20),
  done: z.boolean(),
});

function exists(track: string, day: string, item: number) {
  if (track === CAFE_PLAN_ID) return item === 0 && CAFE_DAYS.some((d) => d.id === day);
  const d = CHALLENGE_DAYS.find((x) => x.id === day);
  return !!d && item < d.tasks.length;
}

/** Marca ou desmarca um dia do Café com Lei ou uma tarefa do Desafio 7 dias. */
export async function setTrackMarkAction(input: z.input<typeof schema>): Promise<Result> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !exists(parsed.data.track, parsed.data.day, parsed.data.item))
    return { ok: false, message: "Item inválido." };
  const { track, day, item, done } = parsed.data;
  const supabase = await createClient();
  const { error } = done
    ? await supabase
        .from("study_plan_marks")
        .upsert(
          { plan_id: track, meta: day, item },
          { onConflict: "user_id,plan_id,meta,item", ignoreDuplicates: true },
        )
    : await supabase.from("study_plan_marks").delete().match({ plan_id: track, meta: day, item });
  if (error)
    return {
      ok: false,
      message: isMissingSchema(error)
        ? "Falta criar a tabela do plano no Supabase (migração 0013)."
        : dbErrorMessage(error),
    };
  refresh();
  return { ok: true };
}

/** Recomeça o Desafio 7 dias (apaga as marcas dele). */
export async function restartChallengeAction(): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("study_plan_marks").delete().eq("plan_id", CHALLENGE_PLAN_ID);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}
