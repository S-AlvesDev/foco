"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * No iPhone o teclado não encolhe a página: uma folha presa à base fica escondida atrás dele.
 * Mede a área visível (visualViewport) e expõe --kb (altura coberta pelo teclado) e --vvh
 * (altura visível) para a folha subir junto com o teclado; também traz o campo focado para a vista.
 */
function useKeyboardInset() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const mobile = window.matchMedia("(max-width: 639px)");
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (!mobile.matches) {
        el.style.removeProperty("--kb");
        el.style.removeProperty("--vvh");
        return;
      }
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      el.style.setProperty("--kb", `${kb}px`);
      el.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      el.toggleAttribute("data-keyboard", kb > 80);
    };
    const reveal = () => {
      const a = document.activeElement;
      if (
        a instanceof HTMLElement &&
        el.contains(a) &&
        a.matches("input, textarea, select, [contenteditable]")
      )
        a.scrollIntoView({ block: "nearest" });
    };
    const onResize = () => {
      update();
      clearTimeout(focusTimer);
      focusTimer = setTimeout(reveal, 60);
    };
    const onFocus = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        update();
        reveal();
      }, 320);
    };
    update();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", update);
    mobile.addEventListener("change", update);
    el.addEventListener("focusin", onFocus);
    return () => {
      clearTimeout(focusTimer);
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", update);
      mobile.removeEventListener("change", update);
      el.removeEventListener("focusin", onFocus);
    };
  }, [el]);
  return useCallback((node: HTMLElement | null) => setEl(node), []);
}

/**
 * Diálogo centralizado no desktop; folha que sobe da base no celular.
 * O conteúdo rola por dentro, e o rodapé fica fixo.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof D.Content>, "title"> & {
  title: string;
  description?: React.ReactNode;
}) {
  const keyboardRef = useKeyboardInset();
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-fade" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface-1 shadow-pop outline-none",
          // celular: folha inferior
          // (sobe junto com o teclado do iPhone: ver useKeyboardInset)
          "inset-x-0 bottom-[var(--kb,0px)] max-h-[min(92dvh,calc(var(--vvh,100dvh)-16px))] rounded-t-xl pb-[env(safe-area-inset-bottom)] data-[keyboard]:pb-0 data-[state=open]:animate-sheet",
          // tablet/desktop: centralizado
          "sm:inset-auto sm:top-[12vh] sm:left-1/2 sm:max-h-[76vh] sm:w-[min(460px,calc(100vw-32px))] sm:-translate-x-1/2 sm:rounded-xl sm:pb-0 sm:data-[state=open]:animate-pop",
          className,
        )}
        {...props}
        ref={keyboardRef}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-1 sm:pt-5">
          <div className="min-w-0">
            <D.Title className="text-[16px] font-semibold tracking-[-0.01em] text-fg">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-[13px] leading-relaxed text-fg-2">
                {description}
              </D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="-mt-1 -mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-end",
        "[&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
