"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";

export function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-start px-4 pt-16 sm:px-8">
      <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-fg">
        Não foi possível carregar esta página
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">
        Verifique sua conexão e tente de novo. Se continuar, saia e entre novamente.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={() => reset()}>
          <RotateCw />
          Tentar de novo
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
