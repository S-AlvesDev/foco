"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  KeyRound,
  LogOut,
  Palette,
  SlidersHorizontal,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "objetivo", label: "Objetivo atual", icon: Target },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "avisos", label: "Notificações", icon: Bell },
  { id: "preferencias", label: "Preferências", icon: SlidersHorizontal },
  { id: "senha", label: "Senha", icon: KeyRound },
  { id: "sessao", label: "Sessão", icon: LogOut },
];

/** Índice das seções de ajustes: fixo ao lado no computador, faixa rolável no celular. Destaca a seção visível. */
export function SettingsNav() {
  const [active, setActive] = useState(SETTINGS_SECTIONS[0].id);
  useEffect(() => {
    const els = SETTINGS_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (e): e is HTMLElement => !!e,
    );
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <nav
      aria-label="Seções das configurações"
      className="-mx-4 mb-5 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:sticky lg:top-8 lg:mx-0 lg:mb-0 lg:flex-col lg:self-start lg:px-0"
    >
      {SETTINGS_SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={on ? "location" : undefined}
            onClick={() => setActive(s.id)}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[13.5px] whitespace-nowrap transition-colors",
              on ? "bg-accent-subtle font-medium text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <s.icon className={cn("size-4 shrink-0", on ? "text-accent" : "text-fg-3")} strokeWidth={1.9} />
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}
