"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile, requireUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { BANNER_DEFAULTS, readBanner } from "./model";

type Result = { ok: true } | { ok: false; message: string };

const schema = z.object({
  style: z.enum(["default", "custom", "none"]),
  path: z.string().max(200).nullable(),
  focusX: z.number().min(0).max(100),
  focusY: z.number().min(0).max(100),
  zoom: z.number().min(1).max(3),
  overlay: z.number().int().min(0).max(85),
});

export type SaveBannerInput = z.input<typeof schema>;

const MISSING = "Falta aplicar a atualização 0007 do banco no Supabase para salvar o banner.";

/**
 * Salva o banner. Arte padrão e "sem imagem" não guardam arquivo;
 * o arquivo anterior é apagado quando é trocado ou deixa de ser usado.
 */
export async function saveBannerAction(input: SaveBannerInput): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Ajustes inválidos. Recarregue a página e tente de novo." };
  const v = parsed.data;
  const pathRe = new RegExp(`^${user.id}/[A-Za-z0-9-]+\\.(webp|jpg)$`);
  if (v.style === "custom" && (!v.path || !pathRe.test(v.path))) {
    return { ok: false, message: "Envie uma imagem antes de salvar." };
  }

  const previous = readBanner(await getProfile()).path;
  const custom = v.style === "custom";
  const frame = v.style === "default" ? { ...BANNER_DEFAULTS, overlay: v.overlay } : v;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      banner_style: v.style,
      banner_path: custom ? v.path : null,
      banner_focus_x: Math.round(frame.focusX * 10) / 10,
      banner_focus_y: Math.round(frame.focusY * 10) / 10,
      banner_zoom: Math.round(frame.zoom * 100) / 100,
      banner_overlay: frame.overlay,
    })
    .eq("id", user.id);
  if (error) {
    const missing = error.code === "42703" || error.code === "PGRST204";
    return { ok: false, message: missing ? MISSING : dbErrorMessage(error) };
  }

  const next = custom ? v.path : null;
  if (previous && previous !== next) await supabase.storage.from("banners").remove([previous]);
  refresh();
  return { ok: true };
}
