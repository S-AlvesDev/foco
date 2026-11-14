"use client";

import { useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type OutlineItem = { id: string; level: number; text: string };
export type ArticleItem = { id: string; num: string; label: string };

/** Artigos de lei no texto: blocos que começam com "Art. 12", "Art. 12-A" etc. (o primeiro de cada número). */
export function findArticles(blocks: { id: string; text: string }[]): ArticleItem[] {
  const out: ArticleItem[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    const m = /^\s*(?:Comentário\s+)?Art\.?\s*(\d+)\s*[ºo°]?\s*(-\s*[A-Z])?/i.exec(b.text);
    if (!m) continue;
    const num = m[1] + (m[2] ? "-" + m[2].replace(/[\s-]/g, "").toUpperCase() : "");
    if (seen.has(num)) continue;
    seen.add(num);
    out.push({ id: b.id, num, label: `Art. ${num}` });
  }
  return out;
}

export function scrollToBlock(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("flash-target");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => el.classList.remove("flash-target"), 1600);
}

/** Navegação dentro do tópico: seções do texto e "ir para o artigo". */
export function InTopicNav({
  outline,
  articles,
  onNavigate,
  className,
}: {
  outline: OutlineItem[];
  articles: ArticleItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [miss, setMiss] = useState(false);
  const go = (id: string) => {
    onNavigate?.();
    window.setTimeout(() => scrollToBlock(id), onNavigate ? 120 : 0);
  };
  const submit = () => {
    const n = q
      .trim()
      .replace(/^art\.?\s*/i, "")
      .replace(/\s+/g, "")
      .toUpperCase();
    const hit = articles.find((a) => a.num === n) ?? articles.find((a) => a.num.split("-")[0] === n);
    if (!hit) return setMiss(true);
    setMiss(false);
    go(hit.id);
  };
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {articles.length > 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-1.5"
        >
          <label htmlFor="go-art" className="text-[12.5px] font-medium text-fg-2">
            Ir para o artigo
          </label>
          <div className="flex gap-2">
            <Input
              id="go-art"
              inputMode="numeric"
              autoComplete="off"
              placeholder={`Ex.: ${articles[Math.min(2, articles.length - 1)].num}`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setMiss(false);
              }}
              className="h-8"
            />
            <Button type="submit" size="md" aria-label="Ir para o artigo">
              <CornerDownLeft />
            </Button>
          </div>
          <p className={cn("text-[12px]", miss ? "text-danger" : "text-fg-3")}>
            {miss
              ? "Esse artigo não está neste tópico."
              : `Artigos ${articles[0].num} a ${articles[articles.length - 1].num} neste tópico.`}
          </p>
        </form>
      )}
      {outline.length > 1 && (
        <ul className="flex flex-col border-l border-border">
          {outline.map((o) => (
            <li key={o.id}>
              <a
                href={`#${o.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(o.id);
                }}
                className={cn(
                  "-ml-px block border-l border-transparent py-1 pr-2 text-[13px] leading-snug text-fg-3 transition-colors hover:border-accent hover:text-fg",
                  o.level > 2 ? "pl-6" : "pl-3",
                )}
              >
                {o.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
