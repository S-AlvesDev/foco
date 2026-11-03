"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { removeAvatarAction, setAvatarAction } from "../actions";

const VIEW = 260; // área de recorte na tela (px)
const OUT = 320; // lado da imagem salva (px)
const MAX_FILE = 15 * 1024 * 1024;

/** Foto atual + trocar (com recorte quadrado) e remover. */
export function AvatarEditor({ userId, name, src }: { userId: string; name: string; src: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [removing, startRemove] = useTransition();

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE) return void toast.error("Imagem grande demais. Use uma com até 15 MB.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    };
    img.src = url;
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} size={56} src={src} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
          <ImagePlus />
          {src ? "Trocar foto" : "Adicionar foto"}
        </Button>
        {src && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={removing}
            onClick={() =>
              startRemove(async () => {
                const res = await removeAvatarAction();
                if (!res.ok) return void toast.error(res.message);
                toast.success("Foto removida");
              })
            }
          >
            {!removing && <Trash2 />}
            Remover
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          aria-label="Escolher foto de perfil"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <CropDialog
        image={image}
        userId={userId}
        onClose={() => {
          if (image) URL.revokeObjectURL(image.src);
          setImage(null);
        }}
      />
    </div>
  );
}

function CropDialog({
  image,
  userId,
  onClose,
}: {
  image: HTMLImageElement | null;
  userId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={image !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Ajustar foto"
        description="Arraste para posicionar e use o controle para aproximar."
      >
        {image && <Cropper key={image.src} image={image} userId={userId} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Cropper({ image, userId, onDone }: { image: HTMLImageElement; userId: string; onDone: () => void }) {
  const base = Math.max(VIEW / image.naturalWidth, VIEW / image.naturalHeight);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, startSave] = useTransition();
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const scale = base * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const clamp = (o: { x: number; y: number }, s = scale) => {
    const mx = (image.naturalWidth * s - VIEW) / 2;
    const my = (image.naturalHeight * s - VIEW) / 2;
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) };
  };
  // O deslocamento é limitado a cada render: ao diminuir o zoom, a imagem continua cobrindo o recorte.
  const pos = clamp(offset);
  const left = VIEW / 2 - dw / 2 + pos.x;
  const top = VIEW / 2 - dh / 2 + pos.y;

  const save = () =>
    startSave(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return void toast.error("Seu navegador não conseguiu preparar a imagem.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, -left / scale, -top / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
      // Navegadores sem WebP devolvem PNG; nesse caso usamos JPEG, que é menor.
      const file =
        blob && blob.type === "image/webp"
          ? { blob, ext: "webp", type: "image/webp" }
          : await new Promise<{ blob: Blob | null; ext: string; type: string }>((r) =>
              canvas.toBlob((b) => r({ blob: b, ext: "jpg", type: "image/jpeg" }), "image/jpeg", 0.88),
            );
      if (!file.blob) return void toast.error("Não foi possível gerar a imagem. Tente outra foto.");
      const path = `${userId}/${crypto.randomUUID()}.${file.ext}`;
      const supabase = createClient();
      const up = await supabase.storage
        .from("avatars")
        .upload(path, file.blob, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (up.error)
        return void toast.error("Não foi possível enviar a foto. Verifique a conexão e tente de novo.");
      const res = await setAvatarAction(path);
      if (!res.ok) {
        await supabase.storage.from("avatars").remove([path]);
        return void toast.error(res.message);
      }
      toast.success("Foto atualizada");
      onDone();
    });

  return (
    <>
      <DialogBody className="flex flex-col items-center gap-5">
        <div
          role="img"
          aria-label="Prévia do recorte. Use as setas para mover."
          tabIndex={0}
          className="relative cursor-grab touch-none overflow-hidden rounded-lg bg-surface-2 outline-none select-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) setOffset(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 20 : 6;
            const delta = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            }[e.key];
            if (!delta) return;
            e.preventDefault();
            setOffset(clamp({ x: pos.x + delta[0], y: pos.y + delta[1] }));
          }}
          onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local, só para prévia */}
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ left, top, width: dw, height: dh }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.55)" }}
            aria-hidden
          />
        </div>
        <label className="flex w-full max-w-[260px] items-center gap-3 text-[12.5px] text-fg-2">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
        </label>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="button" variant="primary" loading={saving} onClick={save}>
          Salvar foto
        </Button>
      </DialogFooter>
    </>
  );
}
