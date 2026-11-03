import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Sempre age como o usuário do cookie: o RLS do banco decide o que ele vê.
 */
export async function createClient() {
  // Marca o trabalho como de requisição: o cliente lê o relógio ao validar a sessão.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Em Server Components não dá para gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
