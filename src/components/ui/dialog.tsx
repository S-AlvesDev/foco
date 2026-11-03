"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

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
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-fade" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface-1 shadow-pop outline-none",
          // celular: folha inferior
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-sheet",
          // tablet/desktop: centralizado
          "sm:inset-auto sm:top-[12vh] sm:left-1/2 sm:max-h-[76vh] sm:w-[min(460px,calc(100vw-32px))] sm:-translate-x-1/2 sm:rounded-xl sm:pb-0 sm:data-[state=open]:animate-pop",
          className,
        )}
        {...props}
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
