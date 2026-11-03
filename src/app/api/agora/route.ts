import { connection } from "next/server";

/** Relógio do servidor, para o cronômetro corrigir a diferença com o aparelho. */
export async function GET() {
  await connection();
  return Response.json({ now: Date.now() }, { headers: { "cache-control": "no-store" } });
}
