import type { Profile } from "@/lib/auth";

export type BannerStyle = "default" | "custom" | "none";

export type BannerSettings = {
  style: BannerStyle;
  path: string | null;
  /** Ponto de foco em % (0–100): fica visível em qualquer formato de tela. */
  focusX: number;
  focusY: number;
  /** Aproximação, de 1 a 3, em volta do ponto de foco. */
  zoom: number;
  /** Escurecimento em % (0–85). */
  overlay: number;
};

export const BANNER_DEFAULTS: Omit<BannerSettings, "style" | "path"> = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
  overlay: 35,
};

export const BANNER_LIMITS = { zoom: [1, 3], overlay: [0, 85] } as const;

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};

/** Lê as colunas do perfil; antes da migração 0007 elas não existem e valem os padrões. */
export function readBanner(profile: Profile): BannerSettings {
  const p = profile as Partial<Record<string, unknown>>;
  const style = p.banner_style === "custom" || p.banner_style === "none" ? p.banner_style : "default";
  const path = typeof p.banner_path === "string" ? p.banner_path : null;
  return {
    style: style === "custom" && !path ? "default" : (style as BannerStyle),
    path: style === "custom" ? path : null,
    focusX: clamp(p.banner_focus_x, 0, 100, BANNER_DEFAULTS.focusX),
    focusY: clamp(p.banner_focus_y, 0, 100, BANNER_DEFAULTS.focusY),
    zoom: clamp(p.banner_zoom, 1, 3, BANNER_DEFAULTS.zoom),
    overlay: clamp(p.banner_overlay, 0, 85, BANNER_DEFAULTS.overlay),
  };
}
