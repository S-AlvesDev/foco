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

/**
 * Assinatura da marca: escudo, filete vertical e o nome em duas linhas
 * ("MISSÃO" pequeno e espaçado, "ALPHA-01" grande, com o 01 em dourado).
 */
export function BrandWordmark({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span className={cn("inline-flex items-center", lg ? "gap-4 sm:gap-5" : "gap-2.5", className)}>
      <BrandMark className={lg ? "size-16 sm:size-[88px]" : "size-9"} />
      <span aria-hidden className={cn("w-px self-stretch bg-current opacity-20", lg ? "my-2" : "my-1.5")} />
      <span className="flex flex-col whitespace-nowrap uppercase">
        <span
          className={cn(
            "leading-none font-semibold text-fg-2",
            lg ? "text-[13px] tracking-[0.34em] sm:text-[15px]" : "text-[8.5px] tracking-[0.36em]",
          )}
        >
          Missão
        </span>
        <span
          className={cn(
            "leading-none font-extrabold tracking-[-0.01em]",
            lg ? "mt-1.5 text-[30px] sm:text-[38px]" : "mt-[3px] text-[17px]",
          )}
        >
          <span className="text-fg dark:bg-[linear-gradient(180deg,#ffffff_20%,#a7adbb)] dark:bg-clip-text dark:text-transparent">
            Alpha-
          </span>
          <span className="bg-[linear-gradient(180deg,#f6cf6e,#c58a22)] bg-clip-text text-transparent">
            01
          </span>
        </span>
      </span>
    </span>
  );
}
