import { describe, expect, it } from "vitest";
import {
  buildSnippet,
  checkLibraryImport,
  layoutBlock,
  rangeMatches,
  splitByRanges,
  tokenize,
  type Block,
} from "./model";

const base = {
  formato: "alpha-biblioteca",
  versao: 1,
  concurso: { id: "prf", nome: "PRF" },
  disciplina: { id: "prf-adm", nome: "Direito Administrativo" },
  fontes: [{ id: "adm.pdf", arquivo: "Apostila.pdf" }],
  capitulos: [
    {
      id: "adm.c1",
      numero: "1",
      titulo: "Introdução",
      topicos: [
        {
          id: "adm.c1.t1",
          numero: "1.1",
          titulo: "Conceito",
          blocos: [
            {
              id: "adm.c1.t1.b1",
              tipo: "paragrafo",
              dados: { texto: "O **Direito** é *público*." },
              fontes: [{ fonte: "adm.pdf", pagina: 3 }],
            },
            {
              id: "adm.c1.t1.b2",
              tipo: "lista",
              dados: { itens: ["um", { texto: "dois", itens: ["dois.a"] }] },
            },
          ],
          subtopicos: [
            {
              id: "adm.c1.t1.s1",
              titulo: "Critérios",
              blocos: [{ id: "adm.c1.t1.s1.b1", tipo: "titulo", dados: { texto: "Critérios" } }],
            },
          ],
        },
      ],
    },
  ],
};

describe("tokenize", () => {
  it("tira os marcadores e numera as posições do texto visível", () => {
    const { tokens, end } = tokenize("O **Direito** é $x^2$ *público*.", 0);
    const visible = tokens.flatMap((t) => (t.type === "text" ? [t.text] : []));
    expect(visible.join("")).toBe("O Direito é  público.");
    expect(end).toBe("O Direito é  público.".length);
    expect(tokens.find((t) => t.type === "math")).toEqual({ type: "math", latex: "x^2" });
    expect(tokens.find((t) => t.type === "text" && t.bold)).toMatchObject({ text: "Direito", start: 2 });
  });
  it("aceita escapes", () => {
    const { tokens } = tokenize("custa \\$5 e 2\\*3", 0);
    expect(tokens.map((t) => (t.type === "text" ? t.text : "")).join("")).toBe("custa $5 e 2*3");
  });
});

describe("layoutBlock", () => {
  it("o texto-âncora é a soma dos pedaços na ordem de leitura", () => {
    const b: Block = {
      id: "x",
      kind: "tabela",
      data: { titulo: "Quadro", cabecalho: ["A", "B"], linhas: [["1", "**2**"]], legenda: "fim" },
    };
    const { anchor, search } = layoutBlock(b);
    expect(anchor).toBe("QuadroAB12fim");
    expect(search).toBe("Quadro A B 1 2 fim");
  });
  it("destaque divide parágrafos por linha em branco", () => {
    const { layout, anchor } = layoutBlock({
      id: "x",
      kind: "destaque",
      data: { variante: "atencao", texto: "um\n\ndois" },
    });
    expect(layout.kind === "destaque" && layout.paragraphs.length).toBe(2);
    expect(anchor).toBe("umdois");
  });
});

describe("splitByRanges", () => {
  it("corta nas fronteiras e lista quem cobre cada pedaço", () => {
    const parts = splitByRanges("abcdefgh", 10, [
      { id: "1", start: 12, end: 15, color: "yellow" },
      { id: "2", start: 14, end: 30, color: "blue" },
    ]);
    expect(parts.map((p) => [p.text, p.ranges.map((r) => r.id).join()])).toEqual([
      ["ab", ""],
      ["cd", "1"],
      ["e", "1,2"],
      ["fgh", "2"],
    ]);
  });
  it("confere se o trecho ainda bate", () => {
    expect(rangeMatches("O Direito é público", { start: 2, end: 9, quote: "Direito" })).toBe(true);
    expect(rangeMatches("O Direito é público", { start: 3, end: 9, quote: "Direito" })).toBe(false);
  });
});

describe("checkLibraryImport", () => {
  it("aceita o formato e prepara texto-âncora", () => {
    const r = checkLibraryImport(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats).toMatchObject({ chapters: 1, topics: 2, blocks: 3 });
    expect(r.topics[0].blocks[0].anchor_text).toBe("O Direito é público.");
    expect(r.topics[1]).toMatchObject({ id: "adm.c1.t1.s1", depth: 1 });
  });
  it("aponta ids repetidos, fonte desconhecida e campo ausente", () => {
    const bad = structuredClone(base);
    bad.capitulos[0].topicos[0].blocos[1].id = "adm.c1.t1.b1";
    bad.capitulos[0].topicos[0].blocos[0].fontes = [{ fonte: "outra", pagina: 1 }];
    const r = checkLibraryImport(bad);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.message).join("\n")).toMatch(/repetido/);
    expect(r.issues.map((i) => i.message).join("\n")).toMatch(/fonte "outra"/);
    const r2 = checkLibraryImport({ ...base, disciplina: { id: "prf-adm" } });
    expect(r2.ok).toBe(false);
  });
  it("valida os dados de cada tipo de bloco", () => {
    const bad = structuredClone(base) as typeof base & { capitulos: { topicos: { blocos: unknown[] }[] }[] };
    bad.capitulos[0].topicos[0].blocos.push({
      id: "z",
      tipo: "comparativo",
      dados: { colunas: [{ titulo: "só uma", itens: ["x"] }] },
    });
    const r = checkLibraryImport(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].message).toMatch(/ao menos 2 colunas/);
  });
});

describe("buildSnippet", () => {
  it("acha o termo sem acento e marca a palavra inteira", () => {
    const s = buildSnippet("Na fase interna, a licitação começa pelo planejamento.", "licitacao");
    expect(s.parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["licitação"]);
  });
  it("acha o plural pelo radical", () => {
    const s = buildSnippet("As licitações seguem a Lei 14.133.", "licitação");
    expect(s.parts.find((p) => p.hit)?.text).toBe("licitações");
  });
});
