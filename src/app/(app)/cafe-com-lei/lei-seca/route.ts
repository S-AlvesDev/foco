import { NextResponse, type NextRequest } from "next/server";
import { pickLeiSeca } from "@/features/cafe/lei-seca";

/** Dose surpresa: abre um trecho aleatório de lei seca na Biblioteca. */
export async function GET(request: NextRequest) {
  const pick = await pickLeiSeca().catch(() => null);
  const to = pick ? `/biblioteca/${pick.disciplineId}/${pick.topicId}` : "/cafe-com-lei?surpresa=vazia";
  return NextResponse.redirect(new URL(to, request.url));
}
