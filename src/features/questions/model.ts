import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Rótulos                                                             */
/* ------------------------------------------------------------------ */

const AREA_LABELS: Record<string, string> = {
  policial: "Policial",
  farmacia: "Farmácia",
  fiscal: "Fiscal",
  tribunais: "Tribunais",
  saude: "Saúde",
  bancaria: "Bancária",
  educacao: "Educação",
  administrativa: "Administrativa",
  juridica: "Jurídica",
};

/** "farmacia" → "Farmácia"; áreas novas viram "Primeira maiúscula". */
export function areaLabel(area: string) {
  return AREA_LABELS[area] ?? area.charAt(0).toUpperCase() + area.slice(1).replace(/[_-]/g, " ");
}

export const DIFICULDADES = ["facil", "intermediaria", "dificil"] as const;
export type Dificuldade = (typeof DIFICULDADES)[number];
export const DIFICULDADE_LABELS: Record<string, string> = {
  facil: "Fácil",
  intermediaria: "Média",
  dificil: "Difícil",
};

export const TIPOS = ["certo_errado", "multipla_escolha"] as const;
export const TIPO_LABELS: Record<string, string> = {
  certo_errado: "Certo ou errado",
  multipla_escolha: "Múltipla escolha",
};

export const STATUS = ["all", "unanswered", "answered", "correct", "wrong", "favorite", "noted"] as const;
export type Status = (typeof STATUS)[number];
export const STATUS_LABELS: Record<Status, string> = {
  all: "Todas",
  unanswered: "Não resolvidas",
  answered: "Resolvidas",
  correct: "Acertei",
  wrong: "Errei",
  favorite: "Favoritas",
  noted: "Com anotação",
};

export const REPORT_CATEGORIES = {
  gabarito: "Gabarito errado",
  enunciado: "Erro no enunciado",
  comentario: "Comentário errado ou confuso",
  classificacao: "Disciplina ou assunto trocado",
  outro: "Outro problema",
} as const;
export type ReportCategory = keyof typeof REPORT_CATEGORIES;

/* ------------------------------------------------------------------ */
/* Filtros (vivem na URL)                                              */
/* ------------------------------------------------------------------ */

export const LIST_FILTERS = ["concurso", "disciplina", "assunto", "banca", "dificuldade", "tipo"] as const;
export type ListFilter = (typeof LIST_FILTERS)[number];

export const LIST_FILTER_LABELS: Record<ListFilter, string> = {
  concurso: "Concurso",
  disciplina: "Disciplina",
  assunto: "Assunto",
  banca: "Banca",
  dificuldade: "Dificuldade",
  tipo: "Tipo",
};

/** "todas" na URL = todas as áreas; null = ainda não escolheu. */
export type Filters = {
  area: string | null;
  lists: Record<ListFilter, string[]>;
  status: Status;
  text: string;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 200)
    .slice(0, 100);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseFilters(sp: SearchParams, fallbackArea: string | null): Filters {
  const rawArea = one(sp.area);
  const area = /^[a-z0-9_-]{1,40}$/.test(rawArea) ? rawArea : fallbackArea;
  const status = one(sp.status) as Status;
  return {
    area,
    lists: Object.fromEntries(LIST_FILTERS.map((k) => [k, many(sp[k])])) as Filters["lists"],
    status: STATUS.includes(status) ? status : "all",
    text: one(sp.q).slice(0, 120),
  };
}

/** Formato aceito pelas funções do banco (question_search / question_facets). */
export function toQuery(f: Filters) {
  return {
    area: f.area && f.area !== "todas" ? f.area : null,
    ...f.lists,
    status: f.status === "all" ? null : f.status,
    text: f.text || null,
  };
}

/** Filtros → query string, sem os vazios. */
export function filtersToParams(f: Filters, extra?: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams();
  if (f.area) p.set("area", f.area);
  for (const k of LIST_FILTERS) for (const v of f.lists[k]) p.append(k, v);
  if (f.status !== "all") p.set("status", f.status);
  if (f.text) p.set("q", f.text);
  for (const [k, v] of Object.entries(extra ?? {}))
    if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  return p;
}

export function emptyLists(): Filters["lists"] {
  return { concurso: [], disciplina: [], assunto: [], banca: [], dificuldade: [], tipo: [] };
}

export function activeFilterCount(f: Filters) {
  return (
    LIST_FILTERS.reduce((n, k) => n + f.lists[k].length, 0) + (f.status !== "all" ? 1 : 0) + (f.text ? 1 : 0)
  );
}

/** Rótulo de um valor de filtro (dificuldade e tipo têm nomes próprios). */
export function valueLabel(key: ListFilter, value: string) {
  if (key === "dificuldade") return DIFICULDADE_LABELS[value] ?? value;
  if (key === "tipo") return TIPO_LABELS[value] ?? value;
  return value;
}

/* ------------------------------------------------------------------ */
/* Arquivo de importação                                               */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));
const letterMap = z.partialRecord(z.enum(["A", "B", "C", "D", "E"]), z.string().trim().min(1).max(5000));

export const importItemSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/, "id inválido"),
    area: z
      .string()
      .trim()
      .transform((s) => s.toLowerCase())
      .pipe(z.string().regex(/^[a-z0-9_-]{1,40}$/, "área inválida")),
    concurso: text(120),
    cargo: optText(160),
    curso_referencia: optText(200),
    especialidade_referencia: optText(200),
    disciplina: text(120),
    assunto: text(200),
    subassunto: optText(200),
    banca_referencia: optText(80),
    tipo: z.enum(TIPOS, "tipo deve ser certo_errado ou multipla_escolha"),
    dificuldade: z.enum(DIFICULDADES, "dificuldade deve ser facil, intermediaria ou dificil"),
    enunciado: text(10000),
    alternativas: letterMap.nullish(),
    gabarito: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase()),
    comentario: optText(20000),
    justificativa: optText(5000),
    explicacoes_incorretas: letterMap.nullish(),
    origem: optText(60),
    fonte: optText(500),
    referencias: z
      .array(
        z.object({
          titulo: z.string().max(300).optional(),
          url: z.string().max(1000).optional(),
          localizador: z.string().max(300).nullish(),
          data_consulta: z.string().max(40).nullish(),
        }),
      )
      .nullish()
      .transform((v) => v ?? []),
    licenca: optText(500),
    lote_producao: z.number().int().nullish(),
    versao_schema: optText(20),
    data_producao: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullish(),
    status_revisao: optText(40),
  })
  .superRefine((q, ctx) => {
    if (q.tipo === "certo_errado") {
      if (q.gabarito !== "C" && q.gabarito !== "E")
        ctx.addIssue({
          code: "custom",
          path: ["gabarito"],
          message: "gabarito de certo/errado deve ser C ou E",
        });
      if (q.alternativas)
        ctx.addIssue({
          code: "custom",
          path: ["alternativas"],
          message: "certo/errado não tem alternativas",
        });
    } else {
      const keys = Object.keys(q.alternativas ?? {});
      if (keys.length < 2)
        ctx.addIssue({
          code: "custom",
          path: ["alternativas"],
          message: "precisa de ao menos 2 alternativas",
        });
      if (!keys.includes(q.gabarito))
        ctx.addIssue({
          code: "custom",
          path: ["gabarito"],
          message: `gabarito ${q.gabarito} não está nas alternativas`,
        });
    }
  });

export type ImportItem = z.output<typeof importItemSchema>;

export type ImportCheck = {
  valid: ImportItem[];
  invalid: { index: number; id: string; message: string }[];
  duplicates: string[];
};

/** Confere um arquivo já lido como JSON: aceita uma lista ou { "questoes": [...] }. */
export function checkImport(data: unknown): ImportCheck {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { questoes?: unknown }).questoes)
      ? (data as { questoes: unknown[] }).questoes
      : null;
  if (!list)
    return {
      valid: [],
      invalid: [{ index: -1, id: "", message: "O arquivo não contém uma lista de questões." }],
      duplicates: [],
    };

  const valid: ImportItem[] = [];
  const invalid: ImportCheck["invalid"] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  list.forEach((raw, index) => {
    const id =
      raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string"
        ? (raw as { id: string }).id
        : "";
    const r = importItemSchema.safeParse(raw);
    if (!r.success) {
      const issue = r.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
      invalid.push({ index, id, message: `${where}${issue?.message ?? "inválida"}` });
      return;
    }
    if (seen.has(r.data.id)) {
      duplicates.push(r.data.id);
      return;
    }
    seen.add(r.data.id);
    valid.push(r.data);
  });
  return { valid, invalid, duplicates };
}

/** Letras das alternativas em ordem. */
export function letters(alternativas: Record<string, string> | null | undefined) {
  return Object.keys(alternativas ?? {}).sort();
}

/* ------------------------------------------------------------------ */
/* Justificativa e comentário                                          */
/* ------------------------------------------------------------------ */

/** Abreviações comuns em textos jurídicos e técnicos; um ponto depois delas não encerra a frase. */
const ABBR =
  /(?:^|[\s(])(?:art|arts|inc|incs|al|par|parág|n|nº|núm|p|pp|cf|ex|ed|fl|fls|séc|sr|sra|dr|dra|prof|etc|obs|aprox|máx|mín|vol|cap|res|dec|mg|ml|kg|km|min)\.$/i;

/**
 * Completa uma justificativa cortada numa abreviação ("O art.") usando o comentário,
 * do qual ela é o começo. Se não for o caso, devolve como veio.
 */
export function completeJustificativa(
  justificativa: string | null,
  comentario: string | null,
): string | null {
  const j = justificativa?.trim() || null;
  const c = comentario?.trim() || null;
  if (!j || !c || !c.startsWith(j) || !(ABBR.test(j) || /§\s*\.?$/.test(j))) return j;
  let i = j.length;
  while (i < c.length) {
    const m = /[.!?](?=\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(]|\s*$)/g;
    m.lastIndex = i;
    const hit = m.exec(c);
    if (!hit) return c;
    const end = hit.index + 1;
    if (!ABBR.test(c.slice(0, end))) return c.slice(0, end);
    i = end;
  }
  return c;
}

/** A justificativa só repete o começo do comentário? Então o comentário basta. */
export function justificativaIsLead(justificativa: string | null, comentario: string | null) {
  const j = justificativa?.trim();
  const c = comentario?.trim();
  return Boolean(j && c && c.startsWith(j));
}
