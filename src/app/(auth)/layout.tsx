import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BRAND_NAME, BrandWordmark } from "@/components/brand";
import { ClearOfflineData } from "@/features/pwa/sw-manager";
import { CurvedSeam, LightBands, OrbitArcs, StudyStack } from "@/features/auth/components/auth-showcase";

/**
 * Entrada em duas metades: à esquerda o painel escuro da marca, à direita o formulário
 * num cartão claro. No celular o painel vira um topo compacto e o cartão sobe por cima dele.
 * As duas metades fixam o próprio tema (escuro e claro), independente da preferência salva.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-(--auth-light) [--auth-light:#f1f1f7] lg:flex-row">
      <ClearOfflineData />

      <aside className="dark relative isolate flex shrink-0 flex-col overflow-hidden bg-[linear-gradient(170deg,#0b0b1a_0%,#0e0c25_55%,#151038_100%)] text-fg lg:min-h-dvh lg:w-[54%]">
        <OrbitArcs className="pointer-events-none absolute -top-2 -left-2 -z-10 w-[300px] opacity-90 lg:w-[560px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(109_75_255/0.28),transparent)]"
        />

        <div className="px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-14 sm:px-10 lg:max-w-[860px] lg:pt-[10vh] lg:pr-40 lg:pb-8 lg:pl-[clamp(3rem,8vw,8rem)]">
          <Link href="/entrar" aria-label={`${BRAND_NAME}, início`} className="inline-flex rounded-md">
            <BrandWordmark size="lg" />
          </Link>

          <p className="font-display mt-8 text-[32px] leading-[1.04] font-semibold tracking-[-0.02em] text-balance text-white sm:text-[40px] lg:mt-[7vh] lg:text-[clamp(42px,4vw,62px)]">
            Sua próxima conquista começa com disciplina.
          </p>
          <span
            aria-hidden
            className="mt-5 block h-[3px] w-16 rounded-full bg-[linear-gradient(90deg,#7b6cf6,#e9b949)] lg:mt-7 lg:w-[88px]"
          />
          <p className="mt-4 hidden max-w-[440px] text-[15px] leading-relaxed text-fg-2 sm:block lg:mt-6 lg:text-[18px]">
            Estude com estratégia. Evolua com consistência. Chegue mais preparado.
          </p>
        </div>

        <StudyStack className="pointer-events-none mt-auto hidden h-[clamp(170px,30vh,380px)] w-auto max-w-[calc(100%-120px)] shrink-0 lg:block" />
        <CurvedSeam className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[150px] lg:block" />
      </aside>

      <main className="theme-light relative isolate -mt-7 flex flex-1 items-start justify-center rounded-t-[28px] bg-(--auth-light) px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:items-center lg:rounded-none lg:py-12">
        <LightBands className="pointer-events-none absolute inset-0 -z-10 hidden size-full [mask-image:linear-gradient(90deg,transparent,#000_30%)] lg:block" />
        <div className="w-full max-w-[500px] rounded-[22px] border border-[#e6e6ef] bg-white p-6 shadow-[0_24px_60px_-28px_rgb(40_30_90/0.35),0_2px_6px_rgb(40_30_90/0.05)] sm:p-10 lg:p-12 [&_input]:h-12 [&_input]:rounded-[10px] [&_input]:border-[#dcdce6] [&_input]:bg-white [&_input]:px-4 [&_input]:text-[15px] [&_input~button]:w-12 [&_label]:text-[14.5px] [&_label]:text-fg">
          {children}
          <p className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-fg-3">
            <ShieldCheck className="size-4" aria-hidden />
            Acesso seguro
          </p>
        </div>
      </main>
    </div>
  );
}
