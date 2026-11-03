"use client";

import { useSyncExternalStore } from "react";

/**
 * Tema sem contexto do React: um script inline aplica a classe antes da primeira pintura
 * e este store avisa só os componentes que leem o tema. Mudar o tema não re-renderiza
 * a página inteira (o que, com conteúdo ainda chegando do servidor, forçava o React a
 * recriar trechos no navegador).
 */
export type ThemePref = "dark" | "light" | "system";

const KEY = "theme";
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "system" || v === "dark" ? v : "dark";
  } catch {
    return "dark";
  }
}

function apply(pref: ThemePref) {
  const dark =
    pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.classList.toggle("light", !dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => read() === "system" && apply("system");
  mq.addEventListener("change", onSystem);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      apply(read());
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Sem armazenamento (modo privado): aplica só nesta página.
  }
  apply(pref);
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as ThemePref);
  return { theme, setTheme };
}
