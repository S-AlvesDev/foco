"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { BannerSettings } from "../model";
import { DefaultBannerArt } from "./default-art";

const CACHE_KEY = "foco:banner-url";
const TTL = 20 * 60 * 60 * 1000; // o link assinado vale 24 h

/**
 * Cada carregamento do painel gera um link assinado novo, o que impediria o cache do navegador.
 * Reaproveitamos o link anterior da mesma imagem enquanto ele vale; a imagem vem do cache.
 */
function resolveSrc(path: string, fresh: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      path: string;
      url: string;
      at: number;
    } | null;
    if (saved && saved.path === path && Date.now() - saved.at < TTL) return saved.url;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ path, url: fresh, at: Date.now() }));
  } catch {
    // Sem armazenamento local: usa o link novo.
  }
  return fresh;
}

const noop = () => () => {};

function useStableSrc(path: string | null, fresh: string | null) {
  return useSyncExternalStore(
    noop,
    () => (path && fresh ? resolveSrc(path, fresh) : fresh),
    () => null, // no servidor não há cache local; a imagem entra após a hidratação
  );
}

export type BackdropProps = Pick<BannerSettings, "style" | "focusX" | "focusY" | "zoom" | "overlay"> & {
  /** Caminho no Storage (chave do cache) e link assinado; ou um link local, na prévia. */
  path?: string | null;
  src: string | null;
  className?: string;
};

/** Fundo do banner: arte padrão ou imagem enquadrada, com camadas de legibilidade. */
export function BannerBackdrop({
  style,
  focusX,
  focusY,
  zoom,
  overlay,
  path = null,
  src,
  className,
}: BackdropProps) {
  const stable = useStableSrc(path, src);
  const shown = path ? stable : src;
  const [loaded, setLoaded] = useState<string | null>(null);

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-[#0b0c12]", className)}
      aria-hidden
    >
      {style === "default" && <DefaultBannerArt className="absolute inset-0 size-full" />}
      {style === "custom" && shown && (
        // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage
        <img
          key={shown}
          src={shown}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(shown)}
          ref={(el) => {
            if (el?.complete && el.naturalWidth) setLoaded(shown);
          }}
          className={cn(
            "absolute inset-0 size-full max-w-none object-cover transition-opacity duration-500",
            loaded === shown ? "opacity-100" : "opacity-0",
          )}
          style={{
            objectPosition: `${focusX}% ${focusY}%`,
            transform: zoom > 1 ? `scale(${zoom})` : undefined,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      )}
      {/* Escurecimento escolhido pela pessoa */}
      <div className="absolute inset-0" style={{ background: `rgb(5 6 10 / ${overlay / 100})` }} />
      {/* Legibilidade: base mais escura (onde ficam os textos e botões) e lateral esquerda no desktop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(5_6_10/0.78),rgb(5_6_10/0.25)_50%,transparent_75%)]" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgb(5_6_10/0.5),transparent_60%)] md:block" />
    </div>
  );
}
