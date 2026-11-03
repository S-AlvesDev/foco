"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Mountain, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { saveBannerAction } from "../actions";
import { BANNER_DEFAULTS, type BannerSettings, type BannerStyle } from "../model";
import { BannerBackdrop } from "./banner-backdrop";

const MAX_SIDE = 2000; // px no lado maior: nítido em telas grandes, leve para carregar
const MAX_FILE = 25 * 1024 * 1024;

type Pending = { blob: Blob; url: string; ext: "webp" | "jpg"; type: string };

/** Reduz e converte a imagem no próprio aparelho antes do envio. */
async function optimize(file: File): Promise<Pending> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    const webp = await toBlob("image/webp", 0.82);
    // Navegadores sem WebP devolvem PNG; nesse caso usamos JPEG.
    const out =
      webp && webp.type === "image/webp"
        ? { blob: webp, ext: "webp" as const, type: "image/webp" }
        : { blob: await toBlob("image/jpeg", 0.85), ext: "jpg" as const, type: "image/jpeg" };
    if (!out.blob) throw new Error("blob");
    return { blob: out.blob, ext: out.ext, type: out.type, url: URL.createObjectURL(out.blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BannerEditor({
  userId,
  firstName,
  initial,
  initialSrc,
}: {
  userId: string;
  firstName: string;
  initial: BannerSettings;
  initialSrc: string | null;
}) {
  const [style, setStyle] = useState<BannerStyle>(initial.style);
  const [pending, setPending] = useState<Pending | null>(null);
  const [focusX, setFocusX] = useState(initial.focusX);
  const [focusY, setFocusY] = useState(initial.focusY);
  const [zoom, setZoom] = useState(initial.zoom);
  const [overlay, setOverlay] = useState(initial.overlay);
  const [reading, setReading] = useState(false);
  const [saving, startSave] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (pending && URL.revokeObjectURL(pending.url)), [pending]);

  const src = pending?.url ?? (style === "custom" ? initialSrc : null);
  const custom = style === "custom" && Boolean(src);
  const dirty =
    style !== initial.style ||
    pending !== null ||
    overlay !== initial.overlay ||
    (style === "custom" && (focusX !== initial.focusX || focusY !== initial.focusY || zoom !== initial.zoom));

  const resetFrame = () => {
    setFocusX(BANNER_DEFAULTS.focusX);
    setFocusY(BANNER_DEFAULTS.focusY);
    setZoom(BANNER_DEFAULTS.zoom);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE) return void toast.error("Imagem grande demais. Use uma com até 25 MB.");
    setReading(true);
    try {
      const next = await optimize(file);
      setPending(next);
      setStyle("custom");
      resetFrame();
    } catch {
      toast.error("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    } finally {
      setReading(false);
    }
  };

  const discard = () => {
    setPending(null);
    setStyle(initial.style);
    setFocusX(initial.focusX);
    setFocusY(initial.focusY);
    setZoom(initial.zoom);
    setOverlay(initial.overlay);
  };

  const save = () =>
    startSave(async () => {
      let path = style === "custom" ? initial.path : null;
      const supabase = createClient();
      if (pending) {
        path = `${userId}/${crypto.randomUUID()}.${pending.ext}`;
        const up = await supabase.storage
          .from("banners")
          .upload(path, pending.blob, { contentType: pending.type, upsert: false, cacheControl: "31536000" });
        if (up.error)
          return void toast.error("Não foi possível enviar a imagem. Verifique a conexão e tente de novo.");
      }
      const res = await saveBannerAction({ style, path, focusX, focusY, zoom, overlay });
      if (!res.ok) {
        if (pending && path) await supabase.storage.from("banners").remove([path]);
        return void toast.error(res.message);
      }
      setPending(null);
      toast.success("Banner salvo");
    });

  const preview = { style, src, focusX, focusY, zoom, overlay };
  const drag = custom
    ? {
        onMove: (dx: number, dy: number, w: number, h: number, start: { x: number; y: number }) => {
          // Arrastar a imagem para a direita mostra mais do lado esquerdo.
          const k = 140 / zoom;
          setFocusX(Math.min(100, Math.max(0, start.x - (dx / w) * k)));
          setFocusY(Math.min(100, Math.max(0, start.y - (dy / h) * k)));
        },
        start: () => ({ x: focusX, y: focusY }),
      }
    : null;

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Frame
          label="Computador"
          className="min-w-0 flex-1 basis-[300px]"
          aspect="aspect-[36/10]"
          firstName={firstName}
          drag={drag}
          preview={preview}
        />
        <Frame
          label="Celular"
          className="w-[112px] shrink-0"
          aspect="aspect-[39/40]"
          firstName={firstName}
          drag={drag}
          preview={preview}
          small
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={reading} onClick={() => input.current?.click()}>
          {!reading && <ImagePlus />}
          {style === "custom" ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {style !== "default" && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPending(null);
              setStyle("default");
              resetFrame();
              setOverlay(BANNER_DEFAULTS.overlay);
            }}
          >
            <Mountain />
            Restaurar imagem padrão
          </Button>
        )}
        {style !== "none" && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPending(null);
              setStyle("none");
            }}
          >
            <Trash2 />
            Remover imagem
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          aria-label="Escolher imagem do banner"
          tabIndex={-1}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {style === "none" ? (
        <p className="text-[13px] text-fg-3">Sem imagem: o painel mostra a saudação sobre o fundo do app.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {custom && (
            <Slider
              label="Zoom"
              value={zoom}
              min={1}
              max={3}
              step={0.01}
              display={`${Math.round(zoom * 100)}%`}
              onChange={setZoom}
            />
          )}
          <Slider
            label="Escurecimento"
            value={overlay}
            min={0}
            max={85}
            step={1}
            display={`${overlay}%`}
            onChange={(v) => setOverlay(Math.round(v))}
          />
          {custom && (
            <p className="text-[12.5px] leading-relaxed text-fg-3 sm:col-span-2">
              Arraste a prévia para posicionar. O ponto central escolhido continua visível no celular, que
              mostra um recorte vertical.{" "}
              {(focusX !== 50 || focusY !== 50 || zoom !== 1) && (
                <button
                  type="button"
                  className="cursor-pointer text-fg-2 underline-offset-2 hover:underline"
                  onClick={resetFrame}
                >
                  <RotateCcw className="mr-1 inline size-3" />
                  Centralizar
                </button>
              )}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="button" variant="primary" loading={saving} disabled={!dirty || reading} onClick={save}>
          Salvar banner
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" disabled={saving} onClick={discard}>
            Descartar alterações
          </Button>
        )}
      </div>
    </div>
  );
}

type DragSpec = {
  onMove: (dx: number, dy: number, w: number, h: number, start: { x: number; y: number }) => void;
  start: () => { x: number; y: number };
} | null;

function Frame({
  label,
  aspect,
  className,
  preview,
  firstName,
  drag,
  small = false,
}: {
  label: string;
  aspect: string;
  className?: string;
  preview: Omit<React.ComponentProps<typeof BannerBackdrop>, "path" | "className">;
  firstName: string;
  drag: DragSpec;
  small?: boolean;
}) {
  const state = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);
  return (
    <figure className={cn("m-0", className)}>
      <div
        role={drag ? "slider" : undefined}
        aria-label={
          drag ? `Posição da imagem, prévia ${label.toLowerCase()}. Use as setas para mover.` : undefined
        }
        aria-valuetext={
          drag
            ? `${Math.round(preview.focusX)}% horizontal, ${Math.round(preview.focusY)}% vertical`
            : undefined
        }
        tabIndex={drag ? 0 : undefined}
        className={cn(
          "dark relative overflow-hidden rounded-xl border border-border bg-[#0b0c12] select-none",
          aspect,
          drag &&
            "cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing",
        )}
        onPointerDown={(e) => {
          if (!drag) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          state.current = { x: e.clientX, y: e.clientY, start: drag.start() };
        }}
        onPointerMove={(e) => {
          const s = state.current;
          if (!drag || !s) return;
          const r = e.currentTarget.getBoundingClientRect();
          drag.onMove(e.clientX - s.x, e.clientY - s.y, r.width, r.height, s.start);
        }}
        onPointerUp={() => (state.current = null)}
        onPointerCancel={() => (state.current = null)}
        onKeyDown={(e) => {
          if (!drag) return;
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
          if (!d) return;
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const s = drag.start();
          // Setas movem o ponto de foco diretamente.
          drag.onMove(0, 0, 1, 1, { x: s.x + d[0] * step, y: s.y + d[1] * step });
        }}
      >
        <BannerBackdrop {...preview} />
        <div className={cn("absolute inset-x-0 bottom-0 text-fg", small ? "p-2" : "p-3.5")}>
          <p className={cn("font-semibold tracking-[-0.02em]", small ? "text-[10px]" : "text-[15px]")}>
            Bom dia, {firstName}.
          </p>
          <div className={cn("mt-1 rounded-full bg-white/15", small ? "h-1 w-10" : "h-1.5 w-24")} />
        </div>
      </div>
      <figcaption className="mt-1.5 text-[12px] text-fg-3">{label}</figcaption>
    </figure>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-[13px] text-fg-2">
      <span className="flex justify-between">
        {label}
        <span className="text-fg-3 tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}
