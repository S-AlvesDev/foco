"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Avisa o service worker (se houver um controlando a página). */
export function postToServiceWorker(message: { type: string }) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage(message);
  void navigator.serviceWorker.getRegistration().then((reg) => reg?.active?.postMessage(message));
}

/**
 * Registra o service worker (só no build de produção) e cuida das atualizações:
 * quando um deploy novo chega, mostra um aviso discreto; ao tocar em "Atualizar",
 * a nova versão assume e a página recarrega. O cronômetro vive no servidor e não é afetado.
 */
export function ServiceWorkerManager() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reloading = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const offerUpdate = (worker: ServiceWorker) => {
      toast("Nova versão disponível", {
        id: "app-update",
        duration: Infinity,
        description: "Atualize para receber as melhorias. Seu cronômetro continua contando.",
        action: { label: "Atualizar", onClick: () => worker.postMessage({ type: "SKIP_WAITING" }) },
      });
    };

    const onControllerChange = () => {
      // Primeira instalação: nada a recarregar.
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let reg: ServiceWorkerRegistration | undefined;
    const check = () => void reg?.update().catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && check();

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => {
        reg = r;
        if (r.waiting && navigator.serviceWorker.controller) offerUpdate(r.waiting);
        r.addEventListener("updatefound", () => {
          const next = r.installing;
          next?.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) offerUpdate(next);
          });
        });
      })
      .catch(() => {});

    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 30 * 60 * 1000);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);
  return null;
}

/** Nas telas de entrada (sem sessão): apaga as telas salvas e desliga o push deste aparelho. */
export function ClearOfflineData() {
  useEffect(() => {
    postToServiceWorker({ type: "CLEAR_USER_DATA" });
    try {
      localStorage.removeItem("alpha:uid");
      for (const k of Object.keys(localStorage)) if (k.startsWith("alpha:study:")) localStorage.removeItem(k);
    } catch {}
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.pushManager?.getSubscription())
        .then((sub) => sub?.unsubscribe())
        .catch(() => {});
    }
  }, []);
  return null;
}
