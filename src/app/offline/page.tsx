import type { Metadata } from "next";
import { BrandEmblem } from "@/components/brand";
import { RetryButton } from "@/features/pwa/retry-button";

export const metadata: Metadata = { title: "Sem conexão" };

/** Mostrada pelo app instalado quando não há internet e a tela pedida não foi salva no aparelho. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <BrandEmblem className="w-[104px] opacity-90" />
      <h1 className="mt-8 text-[20px] font-semibold tracking-[-0.015em] text-fg">Sem conexão</h1>
      <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-fg-2">
        Esta tela ainda não foi salva no aparelho. As telas que você já abriu (painel, sessões, matérias,
        revisões e desempenho) funcionam sem internet.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <RetryButton />
        <a
          href="/painel"
          className="inline-flex h-10 items-center rounded-md border border-border bg-surface-2 px-4 text-[13.5px] font-medium text-fg"
        >
          Abrir o painel salvo
        </a>
      </div>
    </main>
  );
}
