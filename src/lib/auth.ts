import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SessionUser = { id: string; email: string };
export type Profile = Tables<"profiles"> & { email: string };

/** Usuário da sessão, com o JWT verificado. Memoizado por requisição. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  return user;
}

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) {
    // Mostrado pela tela de erro do app (error.tsx), com opção de tentar de novo ou sair.
    throw new Error("PROFILE_UNAVAILABLE");
  }
  return { ...data, email: user.email };
});
