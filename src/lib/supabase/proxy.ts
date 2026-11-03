import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/** Rotas acessíveis sem sessão. */
const PUBLIC_PATHS = ["/entrar", "/cadastro", "/recuperar-senha", "/auth", "/offline", "/api/push/dispatch"];
/** Rotas de quem ainda não entrou; com sessão, redirecionam ao painel. */
const GUEST_ONLY = ["/entrar", "/cadastro", "/recuperar-senha"];

const matches = (pathname: string, list: string[]) =>
  list.some((p) => pathname === p || pathname.startsWith(p + "/"));

/**
 * Renova o token de sessão a cada requisição e faz o redirecionamento otimista.
 * A autorização de verdade acontece no banco (RLS) e em requireUser().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Não colocar código entre a criação do cliente e getClaims(): é aqui que o token é renovado.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (keepNext) url.searchParams.set("next", pathname + request.nextUrl.search);
    const res = NextResponse.redirect(url);
    // Preserva cookies renovados no redirecionamento.
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (pathname === "/") return redirectTo(signedIn ? "/painel" : "/entrar");
  if (!signedIn && !matches(pathname, PUBLIC_PATHS)) return redirectTo("/entrar", true);
  if (signedIn && matches(pathname, GUEST_ONLY)) return redirectTo("/painel");

  return response;
}
