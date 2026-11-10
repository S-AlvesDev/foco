import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Rótulos                                                             */
/* ------------------------------------------------------------------ */

export const MARK_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];
export const MARK_COLOR_LABELS: Record<MarkColor, string> = {
  yellow: "Amarelo",
  green: "Verde",
  blue: "Azul",
  pink: "Rosa",
};

export const READ_STATUS = ["not_started", "in_progress", "done"] as const;
export type ReadStatus = (typeof READ_STATUS)[number];
export const READ_STATUS_LABELS: Record<ReadStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  done: "Leitura concluída",
};

export const CALLOUT_VARIANTS = ["atencao", "observacao", "dica", "importante", "exemplo", "lembre"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];
export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  atencao: "Atenção",
  observacao: "Observação",
  dica: "Dica",
  importante: "Importante",
  exemplo: "Exemplo",
  lembre: "Lembre-se",
};

/* ------------------------------------------------------------------ */
/* Formato de importação (documentado em docs/BIBLIOTECA.md)           */
/* ------------------------------------------------------------------ */

const ID = /^[a-z0-9][a-z0-9_.-]{0,119}$/;
const idField = (what: string) =>
  z
    .string({ error: `${what}: falta o "id"` })
    .regex(ID, `${what}: id inválido (use letras minúsculas, números, ponto, hífen ou _)`);
const text = (what: string, max: number) =>
  z
    .string({ error: `${what} é obrigatório` })
    .trim()
    .min(1, `${what} está vazio`)
    .max(max, `${what} passa de ${max} caracteres`);

const sourceRef = z.object({
  fonte: z.string().regex(ID, "fonte: id inválido"),
  pagina: z.union([z.number().int().positive(), z.string().trim().min(1).max(20)]).optional(),
  secao: z.string().trim().max(300).optional(),
});

type ListItem = string | { texto: string; itens?: ListItem[] };
const listItem: z.ZodType<ListItem> = z.lazy(() =>
  z.union([
    text("item da lista", 5000),
    z.object({ texto: text("item da lista", 5000), itens: z.array(listItem).max(200).optional() }),
  ]),
);

const cell = z.string().max(5000);

export const blockDataSchemas = {
  titulo: z.object({
    texto: text("título", 300),
    nivel: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2),
  }),
  paragrafo: z.object({ texto: text("parágrafo", 20000) }),
  lista: z.object({
    ordenada: z.boolean().default(false),
    itens: z.array(listItem).min(1, "lista vazia").max(500),
  }),
  tabela: z.object({
    titulo: z.string().trim().max(300).optional(),
    cabecalho: z.array(cell).max(20).optional(),
    linhas: z.array(z.array(cell).max(20)).min(1, "tabela sem linhas").max(500),
    legenda: z.string().trim().max(1000).optional(),
  }),
  comparativo: z.object({
    titulo: z.string().trim().max(300).optional(),
    colunas: z
      .array(
        z.object({
          titulo: text("título da coluna", 300),
          itens: z.array(text("item", 3000)).min(1).max(100),
        }),
      )
      .min(2, "o quadro comparativo precisa de ao menos 2 colunas")
      .max(5),
  }),
  destaque: z.object({
    variante: z.enum(CALLOUT_VARIANTS, { error: `variante deve ser uma de: ${CALLOUT_VARIANTS.join(", ")}` }),
    titulo: z.string().trim().max(300).optional(),
    texto: text("texto do destaque", 10000),
  }),
  citacao: z.object({ texto: text("citação", 20000), referencia: z.string().trim().max(300).optional() }),
  formula: z.object({ latex: text("fórmula", 2000), legenda: z.string().trim().max(1000).optional() }),
  imagem: z
    .object({
      arquivo: z.string().trim().max(300).optional(),
      url: z.url().startsWith("https://").optional(),
      alt: text("descrição da imagem (alt)", 500),
      legenda: z.string().trim().max(1000).optional(),
    })
    .refine((d) => Boolean(d.arquivo) !== Boolean(d.url), 'imagem: informe "arquivo" ou "url" (um dos dois)'),
} as const;

export type BlockKind = keyof typeof blockDataSchemas;
export const BLOCK_KINDS = Object.keys(blockDataSchemas) as BlockKind[];
export type BlockData = { [K in BlockKind]: z.output<(typeof blockDataSchemas)[K]> };
export type Block = { [K in BlockKind]: { id: string; kind: K; data: BlockData[K] } }[BlockKind];

const blockInput = z.object({
  id: idField("bloco"),
  tipo: z.enum(BLOCK_KINDS as [BlockKind, ...BlockKind[]], {
    error: `tipo de bloco deve ser um de: ${BLOCK_KINDS.join(", ")}`,
  }),
  dados: z.record(z.string(), z.unknown(), { error: 'bloco sem "dados"' }),
  fontes: z.array(sourceRef).max(20).optional(),
});

type TopicInput = {
  id: string;
  numero?: string;
  titulo: string;
  blocos?: z.input<typeof blockInput>[];
  subtopicos?: TopicInput[];
};
const topicInput: z.ZodType<TopicInput> = z.lazy(() =>
  z.object({
    id: idField("tópico"),
    numero: z.string().trim().max(20).optional(),
    titulo: text("título do tópico", 300),
    blocos: z.array(blockInput).max(2000).optional(),
    subtopicos: z.array(topicInput).max(200).optional(),
  }),
);

export const importSchema = z.object({
  formato: z.literal("alpha-biblioteca", { error: 'formato deve ser "alpha-biblioteca"' }),
  versao: z.literal(1, { error: "versao deve ser 1" }),
  concurso: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/, "concurso: id inválido"),
    nome: text("nome do concurso", 120),
    ordem: z.number().int().optional(),
  }),
  disciplina: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,99}$/, "disciplina: id inválido"),
    nome: text("nome da disciplina", 160),
    descricao: z.string().trim().max(2000).optional(),
    ordem: z.number().int().optional(),
  }),
  /** "disciplina": o arquivo é a disciplina inteira (o que não vier é arquivado). "capitulos": só os enviados. */
  modo: z.enum(["disciplina", "capitulos"]).default("disciplina"),
  fontes: z
    .array(
      z.object({
        id: idField("fonte"),
        arquivo: text("arquivo da fonte", 300),
        titulo: z.string().trim().max(300).optional(),
      }),
    )
    .max(200)
    .default([]),
  capitulos: z
    .array(
      z.object({
        id: idField("capítulo"),
        numero: z.string().trim().max(20).optional(),
        titulo: text("título do capítulo", 300),
        ordem: z.number().int().optional(),
        topicos: z.array(topicInput).min(1, "capítulo sem tópicos").max(500),
      }),
    )
    .min(1, "nenhum capítulo")
    .max(300),
});
export type LibraryImport = z.output<typeof importSchema>;

export type PreparedBlock = {
  id: string;
  tipo: BlockKind;
  dados: Record<string, unknown>;
  fontes: z.output<typeof sourceRef>[];
  anchor_text: string;
  search_text: string;
};
export type PreparedTopic = {
  id: string;
  numero?: string;
  titulo: string;
  depth: number;
  chapterId: string;
  blocks: PreparedBlock[];
};
export type ImportIssue = { path: string; message: string };
export type ImportCheck =
  | { ok: false; issues: ImportIssue[] }
  | {
      ok: true;
      data: LibraryImport;
      structure: unknown;
      topics: PreparedTopic[];
      stats: { chapters: number; topics: number; blocks: number; images: string[] };
      warnings: ImportIssue[];
    };

/** Valida o arquivo inteiro antes de enviar: campos, tipos, ids repetidos e fontes citadas. */
export function checkLibraryImport(raw: unknown): ImportCheck {
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.slice(0, 50).map((i) => ({ path: formatPath(i.path), message: i.message })),
    };
  }
  const data = parsed.data;
  const issues: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const seen = new Map<string, string>();
  const dup = (id: string, where: string) => {
    if (seen.has(id))
      issues.push({ path: where, message: `id "${id}" repetido (já usado em ${seen.get(id)})` });
    else seen.set(id, where);
  };
  const sourceIds = new Set(data.fontes.map((f) => f.id));
  for (const f of data.fontes) dup(f.id, `fontes › ${f.arquivo}`);
  const topics: PreparedTopic[] = [];
  const images: string[] = [];
  let blocks = 0;

  const walk = (t: TopicInput, chapterId: string, depth: number, where: string) => {
    const here = `${where} › ${t.numero ? t.numero + " " : ""}${t.titulo}`;
    dup(t.id, here);
    if (depth > 3) issues.push({ path: here, message: "subtópicos com mais de 3 níveis" });
    const prepared: PreparedBlock[] = [];
    (t.blocos ?? []).forEach((b, i) => {
      const bWhere = `${here} › bloco ${i + 1} (${b.tipo})`;
      dup(b.id, bWhere);
      const schema = blockDataSchemas[b.tipo];
      const d = schema.safeParse(b.dados);
      if (!d.success) {
        for (const iss of d.error.issues)
          issues.push({
            path: `${bWhere}${iss.path.length ? " › " + formatPath(iss.path) : ""}`,
            message: iss.message,
          });
        return;
      }
      for (const ref of b.fontes ?? [])
        if (!sourceIds.has(ref.fonte))
          issues.push({ path: bWhere, message: `fonte "${ref.fonte}" não está na lista de fontes` });
      const block = { id: b.id, kind: b.tipo, data: d.data } as Block;
      const lay = layoutBlock(block);
      if (b.tipo === "imagem" && (d.data as BlockData["imagem"]).arquivo)
        images.push((d.data as BlockData["imagem"]).arquivo!);
      if (!lay.anchor.trim() && b.tipo !== "imagem" && b.tipo !== "formula")
        warnings.push({ path: bWhere, message: "bloco sem texto visível" });
      prepared.push({
        id: b.id,
        tipo: b.tipo,
        dados: d.data as Record<string, unknown>,
        fontes: b.fontes ?? [],
        anchor_text: lay.anchor,
        search_text: lay.search,
      });
    });
    blocks += prepared.length;
    if (!prepared.length && !(t.subtopicos ?? []).length)
      warnings.push({ path: here, message: "tópico sem conteúdo" });
    topics.push({ id: t.id, numero: t.numero, titulo: t.titulo, depth, chapterId, blocks: prepared });
    for (const s of t.subtopicos ?? []) walk(s, chapterId, depth + 1, here);
  };
  for (const ch of data.capitulos) {
    const where = `${ch.numero ? ch.numero + ". " : ""}${ch.titulo}`;
    dup(ch.id, where);
    for (const t of ch.topicos) walk(t, ch.id, 0, where);
  }
  if (issues.length) return { ok: false, issues: issues.slice(0, 80) };

  // estrutura sem os blocos (vai num pedido só; os blocos vão tópico a tópico)
  const strip = (t: TopicInput): unknown => ({
    id: t.id,
    numero: t.numero,
    titulo: t.titulo,
    subtopicos: (t.subtopicos ?? []).map(strip),
  });
  const structure = {
    concurso: data.concurso,
    disciplina: data.disciplina,
    fontes: data.fontes,
    capitulos: data.capitulos.map((c) => ({
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      ordem: c.ordem,
      topicos: c.topicos.map(strip),
    })),
  };
  return {
    ok: true,
    data,
    structure,
    topics,
    stats: { chapters: data.capitulos.length, topics: topics.length, blocks, images: [...new Set(images)] },
    warnings,
  };
}

function formatPath(path: PropertyKey[]) {
  return path
    .map((p) => (typeof p === "number" ? `[${p + 1}]` : String(p)))
    .join(".")
    .replace(/\.\[/g, "[");
}

/* ------------------------------------------------------------------ */
/* Texto em linha: **negrito**, *itálico*, $fórmula$                   */
/* ------------------------------------------------------------------ */

export type Token =
  | { type: "text"; text: string; bold?: boolean; italic?: boolean; start: number }
  | { type: "math"; latex: string };

/** Quebra o texto em pedaços; cada pedaço de texto recebe sua posição no texto-âncora do bloco. */
export function tokenize(src: string, start: number): { tokens: Token[]; end: number } {
  const tokens: Token[] = [];
  let pos = start;
  let bold = false;
  let italic = false;
  let buf = "";
  const flush = () => {
    if (!buf) return;
    tokens.push({
      type: "text",
      text: buf,
      bold: bold || undefined,
      italic: italic || undefined,
      start: pos,
    });
    pos += buf.length;
    buf = "";
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length && "*$\\".includes(src[i + 1])) {
      buf += src[++i];
      continue;
    }
    if (c === "$") {
      const close = src.indexOf("$", i + 1);
      if (close > i + 1) {
        flush();
        tokens.push({ type: "math", latex: src.slice(i + 1, close) });
        i = close;
        continue;
      }
    }
    if (c === "*" && src[i + 1] === "*") {
      flush();
      bold = !bold;
      i++;
      continue;
    }
    if (c === "*") {
      flush();
      italic = !italic;
      continue;
    }
    buf += c;
  }
  flush();
  return { tokens, end: pos };
}

/* ------------------------------------------------------------------ */
/* Layout: o que o leitor desenha e, na mesma ordem, o texto-âncora    */
/* ------------------------------------------------------------------ */

export type Field = { tokens: Token[]; start: number; end: number };
export type LaidItem = { field: Field; items: LaidItem[] };
export type Layout =
  | { kind: "titulo"; level: 2 | 3 | 4; text: Field }
  | { kind: "paragrafo"; text: Field }
  | { kind: "lista"; ordered: boolean; items: LaidItem[] }
  | { kind: "tabela"; title?: Field; head?: Field[]; rows: Field[][]; caption?: Field }
  | { kind: "comparativo"; title?: Field; columns: { title: Field; items: Field[] }[] }
  | { kind: "destaque"; variant: CalloutVariant; title?: Field; paragraphs: Field[] }
  | { kind: "citacao"; paragraphs: Field[]; reference?: Field }
  | { kind: "formula"; latex: string; caption?: Field }
  | { kind: "imagem"; file?: string; url?: string; alt: string; caption?: Field };

/**
 * Monta o bloco para a tela e devolve o texto-âncora (exatamente o texto visível, na ordem do DOM,
 * sem as fórmulas) e o texto de busca (as mesmas partes separadas por espaço).
 */
export function layoutBlock(block: Block): { layout: Layout; anchor: string; search: string } {
  let pos = 0;
  const parts: string[] = [];
  const field = (src: string): Field => {
    const start = pos;
    const { tokens, end } = tokenize(src, pos);
    pos = end;
    const visible = tokens.map((t) => (t.type === "text" ? t.text : "")).join("");
    if (visible) parts.push(visible);
    return { tokens, start, end };
  };
  const opt = (src?: string) => (src ? field(src) : undefined);
  const paragraphs = (src: string) =>
    src
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => field(p));
  const items = (list: ListItem[]): LaidItem[] =>
    list.map((it) =>
      typeof it === "string"
        ? { field: field(it), items: [] }
        : { field: field(it.texto), items: items(it.itens ?? []) },
    );

  let layout: Layout;
  switch (block.kind) {
    case "titulo":
      layout = { kind: "titulo", level: block.data.nivel ?? 2, text: field(block.data.texto) };
      break;
    case "paragrafo":
      layout = { kind: "paragrafo", text: field(block.data.texto) };
      break;
    case "lista":
      layout = { kind: "lista", ordered: Boolean(block.data.ordenada), items: items(block.data.itens) };
      break;
    case "tabela": {
      const title = opt(block.data.titulo);
      const head = block.data.cabecalho?.map((c) => field(c));
      const rows = block.data.linhas.map((r) => r.map((c) => field(c)));
      layout = { kind: "tabela", title, head, rows, caption: opt(block.data.legenda) };
      break;
    }
    case "comparativo": {
      const title = opt(block.data.titulo);
      const columns = block.data.colunas.map((c) => ({
        title: field(c.titulo),
        items: c.itens.map((i) => field(i)),
      }));
      layout = { kind: "comparativo", title, columns };
      break;
    }
    case "destaque": {
      const title = opt(block.data.titulo);
      layout = {
        kind: "destaque",
        variant: block.data.variante,
        title,
        paragraphs: paragraphs(block.data.texto),
      };
      break;
    }
    case "citacao": {
      const ps = paragraphs(block.data.texto);
      layout = { kind: "citacao", paragraphs: ps, reference: opt(block.data.referencia) };
      break;
    }
    case "formula":
      layout = { kind: "formula", latex: block.data.latex, caption: opt(block.data.legenda) };
      break;
    case "imagem":
      layout = {
        kind: "imagem",
        file: block.data.arquivo,
        url: block.data.url,
        alt: block.data.alt,
        caption: opt(block.data.legenda),
      };
      break;
  }
  return { layout, anchor: parts.join(""), search: parts.join(" ") };
}

/* ------------------------------------------------------------------ */
/* Trechos marcados                                                    */
/* ------------------------------------------------------------------ */

export type Range = {
  id: string;
  start: number;
  end: number;
  color?: MarkColor;
  note?: boolean;
  favorite?: boolean;
};

/** Divide um pedaço de texto nas fronteiras das marcações que o cobrem. */
export function splitByRanges(text: string, start: number, ranges: Range[]) {
  const end = start + text.length;
  const cuts = new Set([start, end]);
  for (const r of ranges) {
    if (r.end <= start || r.start >= end) continue;
    cuts.add(Math.max(r.start, start));
    cuts.add(Math.min(r.end, end));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: { text: string; start: number; ranges: Range[] }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a === b) continue;
    out.push({
      text: text.slice(a - start, b - start),
      start: a,
      ranges: ranges.filter((r) => r.start <= a && r.end >= b),
    });
  }
  return out;
}

/** A marcação ainda bate com o texto do bloco? (proteção extra além da revisão feita na importação) */
export function rangeMatches(anchor: string, r: { start: number; end: number; quote: string }) {
  return anchor.slice(r.start, r.end) === r.quote;
}

/* ------------------------------------------------------------------ */
/* Busca: trecho com o termo destacado (sem diferenciar acentos)       */
/* ------------------------------------------------------------------ */

/** Remove acentos mantendo o mesmo tamanho (um caractere por caractere). */
export function foldChars(s: string) {
  let out = "";
  for (const ch of s) {
    const f = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    out += f.length === ch.length ? f : ch.toLowerCase().slice(0, ch.length).padEnd(ch.length, " ");
  }
  return out;
}

/** Recorta ~max caracteres em volta da primeira ocorrência de algum termo da busca e marca as ocorrências. */
export function buildSnippet(
  text: string,
  query: string,
  max = 220,
): { before: string; parts: { text: string; hit: boolean }[]; after: string } {
  const folded = foldChars(text);
  const terms = foldChars(query)
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((t) => t.length >= 2)
    .map((t) => (t.length > 5 ? t.slice(0, t.length - 2) : t)); // radical aproximado
  const hits: [number, number][] = [];
  for (const t of terms) {
    let i = folded.indexOf(t);
    while (i !== -1 && hits.length < 40) {
      // estende até o fim da palavra
      let j = i + t.length;
      while (j < folded.length && /[\p{L}\p{N}]/u.test(folded[j])) j++;
      let k = i;
      while (k > 0 && /[\p{L}\p{N}]/u.test(folded[k - 1])) k--;
      hits.push([k, j]);
      i = folded.indexOf(t, j);
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const h of hits) {
    const last = merged[merged.length - 1];
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
    else merged.push([...h]);
  }
  const first = merged[0]?.[0] ?? 0;
  let from = Math.max(0, first - Math.floor(max / 3));
  if (from > 0) {
    const sp = text.indexOf(" ", from);
    if (sp !== -1 && sp < first) from = sp + 1;
  }
  let to = Math.min(text.length, from + max);
  if (to < text.length) {
    const sp = text.lastIndexOf(" ", to);
    if (sp > first) to = sp;
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cur = from;
  for (const [a, b] of merged) {
    if (b <= from || a >= to) continue;
    const s = Math.max(a, from);
    const e = Math.min(b, to);
    if (s > cur) parts.push({ text: text.slice(cur, s), hit: false });
    parts.push({ text: text.slice(s, e), hit: true });
    cur = e;
  }
  if (cur < to) parts.push({ text: text.slice(cur, to), hit: false });
  return { before: from > 0 ? "…" : "", parts, after: to < text.length ? "…" : "" };
}

/** Rótulo "1.2 Conceito". */
export function topicLabel(t: { number?: string | null; title: string }) {
  return t.number ? `${t.number} ${t.title}` : t.title;
}
