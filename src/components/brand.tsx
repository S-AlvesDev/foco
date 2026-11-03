/* eslint-disable @next/next/no-img-element -- imagens estáticas pequenas e já otimizadas em /public/brand */
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Missão Alpha-01";

/** Marca reduzida (o escudo com a caveira), para tamanhos pequenos: menu, topo do celular. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/marca.webp"
      alt=""
      aria-hidden
      width={80}
      height={80}
      decoding="async"
      className={cn("size-9 shrink-0 object-contain", className)}
    />
  );
}

/** Emblema completo, com o nome. Para telas de entrada e espaços grandes. */
export function BrandEmblem({ className }: { className?: string }) {
  return (
    <img
      src="/brand/emblema.webp"
      alt={BRAND_NAME}
      width={366}
      height={400}
      decoding="async"
      className={cn("h-auto w-[132px] object-contain drop-shadow-[0_12px_32px_rgb(0_0_0/0.45)]", className)}
    />
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[14px] leading-none font-bold tracking-[0.08em] whitespace-nowrap text-fg uppercase">
        Missão Alpha-<span className="text-[#d9a640]">01</span>
      </span>
    </span>
  );
}
