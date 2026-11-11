"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloudUpload, RotateCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { syncOfflineSessionAction } from "@/features/sessions/actions";
import { savePushSubscriptionAction } from "@/features/notifications/actions";
import { syncOfflineFinishAction } from "@/features/timer/actions";
import { syncOfflineLibraryAction } from "@/features/library/actions";
import { syncOfflineMemoryAction } from "@/features/memory/actions";
import { useStudy } from "@/features/timer/study-provider";
import {
  currentUserId,
  readOutbox,
  removeFromOutbox,
  setCurrentUserId,
  subscribeOutbox,
  type OutboxItem,
} from "./outbox";
import { postToServiceWorker } from "./sw-manager";

const WARM_KEY = "alpha:warmed-at";
const WARM_EVERY = 10 * 60 * 1000;

function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}
const getOnline = () => navigator.onLine;
const noopSubscribe = () => () => {};
const getOnlineServer = () => true;

function useOutboxCount() {
  return useSyncExternalStore(
    subscribeOutbox,
    () => readOutbox().length,
    () => 0,
  );
}

/** Lê a marca colocada pelo service worker quando a página veio da cópia salva no aparelho. */
function readCachedAt() {
  const v = document.querySelector('meta[name="alpha-cached-at"]')?.getAttribute("content");
  return v ? Date.parse(v) || null : null;
}

function savedLabel(ts: number) {
  const d = new Date(ts);
  const sameDay = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay
    ? `às ${time}`
    : `em ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")}, ${time}`;
}

function base64ToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Tudo o que faz o app funcionar como app instalado, dentro das telas logadas:
 * indicador de conexão, envio da fila offline, cópia das telas para uso sem internet
 * e reativação do push neste aparelho.
 */
export function OfflineRuntime() {
  const router = useRouter();
  const { sync } = useStudy();
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
  const pending = useOutboxCount();
  const cachedAt = useSyncExternalStore(noopSubscribe, readCachedAt, () => null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);

  // Conta conectada neste aparelho: troca de conta apaga as telas salvas da anterior.
  useEffect(() => {
    let alive = true;
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        const uid = data.session?.user.id;
        if (!alive || !uid) return;
        const previous = currentUserId();
        if (previous && previous !== uid) postToServiceWorker({ type: "CLEAR_USER_DATA" });
        setCurrentUserId(uid);
        window.dispatchEvent(new Event("alpha-outbox"));
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Envia a fila, um item por vez. Falha de rede: para e tenta depois. */
  const flush = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    const items = readOutbox();
    if (!items.length) return;
    busy.current = true;
    setSending(true);
    let sent = 0;
    try {
      for (const item of items) {
        let res: Awaited<ReturnType<typeof syncOfflineSessionAction>>;
        try {
          res = await send(item);
        } catch {
          break; // sem rede de verdade: tenta de novo mais tarde
        }
        if (res.ok) {
          removeFromOutbox(item.id);
          sent++;
        } else if (res.permanent) {
          removeFromOutbox(item.id);
          toast.error(`Um registro feito sem internet não pôde ser salvo: ${res.message}`, {
            duration: 10000,
          });
        } else break;
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
    if (sent) {
      toast.success(
        sent === 1 ? "Registro feito sem internet enviado" : `${sent} registros feitos sem internet enviados`,
      );
      sync();
      router.refresh();
    }
  }, [router, sync]);

  useEffect(() => {
    if (!online) return;
    const first = setTimeout(() => void flush(), 0);
    const t = setInterval(() => void flush(), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [online, pending, flush]);

  // Guarda cópias das telas principais para abrir sem internet (no máximo a cada 10 min).
  useEffect(() => {
    if (!online || !("serviceWorker" in navigator)) return;
    const warm = () => {
      try {
        const last = Number(localStorage.getItem(WARM_KEY) ?? 0);
        if (Date.now() - last < WARM_EVERY) return;
        localStorage.setItem(WARM_KEY, String(Date.now()));
      } catch {}
      postToServiceWorker({ type: "WARM" });
    };
    const t = setTimeout(warm, 4000);
    const onChange = () => {
      try {
        localStorage.removeItem(WARM_KEY);
      } catch {}
      setTimeout(warm, 2000);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => {
      clearTimeout(t);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
  }, [online]);

  // Push ativado na conta e permitido neste aparelho, mas sem inscrição (ex.: depois de sair e entrar): reativa.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!online || !key || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      if (localStorage.getItem("alpha:push-off")) return;
    } catch {}
    let alive = true;
    void (async () => {
      const { data } = await createClient().from("notification_prefs").select("push_enabled").maybeSingle();
      if (!alive || !data?.push_enabled) return;
      const reg = await navigator.serviceWorker.ready;
      if (await reg.pushManager.getSubscription()) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(key),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [online]);

  const show = !online || cachedAt !== null || pending > 0;
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(64px+env(safe-area-inset-top))] z-40 flex justify-center px-4 lg:top-4 lg:left-[264px]">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-2xl border border-border bg-surface-3/95 py-1.5 pr-1.5 pl-3.5 text-[12.5px] leading-snug text-fg shadow-pop backdrop-blur-md"
      >
        {!online ? (
          <WifiOff className="size-3.5 shrink-0 text-warning" aria-hidden />
        ) : (
          <CloudUpload className="size-3.5 shrink-0 text-accent" aria-hidden />
        )}
        <span className="min-w-0 py-0.5">
          {!online
            ? "Sem conexão"
            : cachedAt
              ? "Conexão de volta"
              : sending
                ? "Enviando"
                : "Aguardando envio"}
          {cachedAt && <span className="text-fg-2"> · dados salvos {savedLabel(cachedAt)}</span>}
          {pending > 0 && (
            <span className="text-fg-2">
              {" "}
              · {pending} {pending === 1 ? "registro" : "registros"} {online ? "na fila" : "para enviar"}
            </span>
          )}
        </span>
        {online && cachedAt ? (
          <button
            type="button"
            onClick={() => location.reload()}
            className="flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-accent px-2.5 text-[12px] font-medium text-accent-fg"
          >
            <RotateCw className="size-3" />
            Atualizar
          </button>
        ) : (
          <span className="w-1.5" />
        )}
      </div>
    </div>
  );
}

function send(item: OutboxItem) {
  if (item.kind === "session") return syncOfflineSessionAction(item);
  if (item.kind === "library") return syncOfflineLibraryAction(item.payload);
  if (item.kind === "memory") return syncOfflineMemoryAction(item.payload);
  return syncOfflineFinishAction(item.payload);
}
