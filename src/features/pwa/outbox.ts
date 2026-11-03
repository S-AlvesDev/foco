"use client";

/**
 * Fila de registros feitos sem internet, guardada neste aparelho e separada por conta.
 * Cada item tem um id único (UUID): reenviar o mesmo item nunca cria um registro duplicado.
 */

export type SessionPayload = Record<string, string>;
export type FinishPayload = {
  timerId: string;
  studyType: "theory" | "questions" | "review" | "mock_exam" | "reading";
  startedAt: string;
  /** Momento em que a pessoa finalizou, no relógio do servidor. */
  endedAt: string;
  topic: string;
  notes: string;
  questionsAnswered: number | null;
  questionsCorrect: number | null;
  /** Tempo cronometrado no momento em que a pessoa finalizou (o servidor só aceita reduzir). */
  durationSeconds: number;
  subjectId: string;
};

export type OutboxItem =
  | { id: string; kind: "session"; createdAt: number; payload: SessionPayload }
  | { id: string; kind: "finish"; createdAt: number; payload: FinishPayload };

const USER_KEY = "alpha:uid";
const EVENT = "alpha-outbox";
const key = (uid: string) => `alpha:outbox:${uid}`;

export function currentUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUserId(uid: string) {
  try {
    localStorage.setItem(USER_KEY, uid);
  } catch {}
}

export function readOutbox(uid = currentUserId()): OutboxItem[] {
  if (!uid) return [];
  try {
    const list = JSON.parse(localStorage.getItem(key(uid)) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(uid: string, items: OutboxItem[]) {
  try {
    if (items.length) localStorage.setItem(key(uid), JSON.stringify(items));
    else localStorage.removeItem(key(uid));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Adiciona à fila. Devolve false se não houver como guardar (sem conta conhecida ou armazenamento bloqueado). */
export function enqueue(item: Omit<OutboxItem, "id" | "createdAt"> & { id?: string }): boolean {
  const uid = currentUserId();
  if (!uid) return false;
  const full = { id: item.id ?? crypto.randomUUID(), createdAt: Date.now(), ...item } as OutboxItem;
  const list = readOutbox(uid);
  if (item.kind === "finish" && list.some((i) => i.kind === "finish")) return true; // um cronômetro por vez
  write(uid, [...list, full]);
  try {
    return readOutbox(uid).some((i) => i.id === full.id);
  } catch {
    return false;
  }
}

export function removeFromOutbox(id: string) {
  const uid = currentUserId();
  if (!uid) return;
  write(
    uid,
    readOutbox(uid).filter((i) => i.id !== id),
  );
}

export function hasPendingFinish() {
  return readOutbox().some((i) => i.kind === "finish");
}

export function subscribeOutbox(fn: () => void) {
  window.addEventListener(EVENT, fn);
  const onStorage = (e: StorageEvent) => e.key?.startsWith("alpha:outbox:") && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sem internet agora? (o navegador às vezes diz "online" sem conexão real; a falha do envio cobre esse caso). */
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
