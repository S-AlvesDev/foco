"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Switch } from "@/components/ui/switch";
import {
  removePushSubscriptionAction,
  savePrefsAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "../actions";
import { KIND_META, NOTIFICATION_KINDS, type Prefs } from "../kinds";

type Device =
  | { state: "checking" }
  | { state: "unsupported"; reason: string }
  | { state: "ios-install" }
  | { state: "denied" }
  | { state: "off" }
  | { state: "on"; endpoint: string };

function base64ToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function readDevice(): Promise<Device> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    if (isIOS() && !isStandalone()) return { state: "ios-install" };
    return { state: "unsupported", reason: "Este navegador não recebe notificações push." };
  }
  if (Notification.permission === "denied") return { state: "denied" };
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? { state: "on", endpoint: sub.endpoint } : { state: "off" };
}

/** Configura o push deste aparelho, categorias e horários. */
export function NotificationSettings({
  initial,
  available,
  vapidKey,
  pushReady,
}: {
  initial: Prefs;
  available: boolean;
  vapidKey: string | null;
  pushReady: boolean;
}) {
  const [device, setDevice] = useState<Device>({ state: "checking" });
  const [busy, startBusy] = useTransition();
  const [, startSave] = useTransition();
  const [prefs, setOptimistic] = useOptimistic(initial, (cur, patch: Partial<Prefs>) => ({
    ...cur,
    ...patch,
  }));

  useEffect(() => {
    let alive = true;
    void readDevice().then((d) => alive && setDevice(d));
    return () => {
      alive = false;
    };
  }, []);

  const save = (patch: Partial<Prefs>, ok?: string) =>
    startSave(async () => {
      setOptimistic(patch);
      const res = await savePrefsAction(patch);
      if (!res.ok) toast.error(res.message);
      else if (ok) toast.success(ok);
    });

  const enable = () =>
    startBusy(async () => {
      if (!vapidKey)
        return void toast.error("O envio de notificações ainda não foi configurado no servidor.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDevice(permission === "denied" ? { state: "denied" } : { state: "off" });
        return void toast.error("Permissão não concedida.");
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToBytes(vapidKey),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const res = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent.slice(0, 300),
        });
        if (!res.ok) {
          await sub.unsubscribe();
          return void toast.error(res.message);
        }
        if (!prefs.push_enabled) {
          setOptimistic({ push_enabled: true });
          const saved = await savePrefsAction({ push_enabled: true });
          if (!saved.ok) return void toast.error(saved.message);
        }
        try {
          localStorage.removeItem("alpha:push-off");
        } catch {}
        setDevice({ state: "on", endpoint: json.endpoint });
        toast.success("Notificações ativadas neste aparelho");
      } catch {
        toast.error("Não foi possível ativar. Verifique a conexão e tente de novo.");
      }
    });

  const disable = () =>
    startBusy(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      try {
        localStorage.setItem("alpha:push-off", "1");
      } catch {}
      setDevice({ state: "off" });
      toast.success("Notificações desativadas neste aparelho");
    });

  const test = () =>
    startBusy(async () => {
      const res = await sendTestNotificationAction();
      if (res.ok) toast.success("Notificação de teste enviada");
      else toast.error(res.message);
    });

  if (!available) {
    return (
      <Notice tone="error">
        Falta aplicar a atualização 0008 do banco no Supabase para usar as notificações.
      </Notice>
    );
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="push-device" className="flex items-center gap-2 text-[14px] font-medium text-fg">
              <BellRing className="size-4 text-accent" />
              Notificações neste aparelho
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-3">
              {device.state === "on" && "Ativadas. Os avisos chegam mesmo com o app fechado."}
              {device.state === "off" && "Desativadas. A central (o sino) continua funcionando."}
              {device.state === "checking" && "Verificando…"}
              {device.state === "denied" &&
                "Bloqueadas nas configurações do navegador ou do sistema. Libere as notificações para este site e volte aqui."}
              {device.state === "ios-install" &&
                "No iPhone, adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá para ativar."}
              {device.state === "unsupported" && device.reason}
            </p>
          </div>
          {(device.state === "on" || device.state === "off") && (
            <Switch
              checked={device.state === "on"}
              labelledBy="push-device"
              disabled={busy || (!pushReady && device.state === "off")}
              onChange={(next) => (next ? enable() : disable())}
            />
          )}
        </div>
        {!pushReady && (device.state === "off" || device.state === "on") && (
          <p className="mt-3 text-[12.5px] text-warning">
            O envio ainda não foi configurado no servidor (variáveis VAPID na Vercel).
          </p>
        )}
        {device.state === "on" && pushReady && (
          <Button variant="secondary" size="sm" className="mt-3" loading={busy} onClick={test}>
            {!busy && <Send />}
            Enviar notificação de teste
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-[13.5px] font-medium text-fg">O que avisar</h3>
        <p className="mt-0.5 text-[12.5px] text-fg-3">Vale para o sino e para os aparelhos ativados.</p>
        <ul className="mt-2 divide-y divide-border">
          {NOTIFICATION_KINDS.map((kind) => {
            const meta = KIND_META[kind];
            const key = meta.pref as keyof Prefs;
            const on = Boolean(prefs[key]);
            return (
              <li key={kind} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p id={`cat-${kind}`} className="text-[13.5px] text-fg">
                    {meta.label}
                  </p>
                  <p className="text-[12.5px] text-fg-3">{meta.hint}</p>
                </div>
                <Switch checked={on} labelledBy={`cat-${kind}`} onChange={(next) => save({ [key]: next })} />
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-[13.5px] font-medium text-fg">Horários</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TimeField
            label="Revisões do dia"
            value={prefs.reviews_time}
            onSave={(v) => save({ reviews_time: v }, "Horário salvo")}
          />
          <TimeField
            label="Lembrete de estudo"
            value={prefs.study_reminder_time}
            onSave={(v) => save({ study_reminder_time: v }, "Horário salvo")}
          />
          <TimeField
            label="Meta e sequência"
            value={prefs.evening_check_time}
            onSave={(v) => save({ evening_check_time: v }, "Horário salvo")}
          />
        </div>
        <p className="mt-2 text-[12.5px] text-fg-3">
          No seu fuso horário. Cada aviso sai no máximo uma vez por dia.
        </p>
      </div>
    </div>
  );
}

function TimeField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] text-fg-2">
      {label}
      <input
        type="time"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft && draft !== value && onSave(draft)}
        className="h-10 rounded-md border border-border bg-surface-2 px-3 text-[14px] text-fg tabular-nums outline-none focus-visible:border-accent"
      />
    </label>
  );
}
