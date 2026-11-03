import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const BANNER_BUCKET = "banners";

/** Link temporário (24 h) da imagem do banner. O RLS só assina a do próprio dono. */
export const bannerUrl = cache(async (path: string | null) => {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BANNER_BUCKET).createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
});
