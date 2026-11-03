import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const AVATAR_BUCKET = "avatars";

/**
 * Links temporários das fotos (o bucket é privado).
 * O RLS do Storage só assina a própria foto e a da pessoa vinculada.
 */
export async function avatarUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (list.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(list, 60 * 60 * 24);
  const out = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

/** Memoizado por requisição (o layout mostra o avatar em dois lugares). */
export const avatarUrl = cache(async (path: string | null | undefined) => {
  if (!path) return null;
  return (await avatarUrls([path])).get(path) ?? null;
});
