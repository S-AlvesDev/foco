import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] text-fg-3 tabular-nums">Erro 404</p>
      <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.015em]">Página não encontrada</h1>
      <p className="mt-1.5 max-w-[320px] text-[14px] text-fg-2">
        O endereço pode ter mudado ou não existir mais.
      </p>
      <Button asChild variant="secondary" className="mt-6">
        <Link href="/painel">Ir para o painel</Link>
      </Button>
    </div>
  );
}
