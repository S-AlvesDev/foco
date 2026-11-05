import { describe, expect, it } from "vitest";
import {
  checkImport,
  completeJustificativa,
  filtersToParams,
  justificativaIsLead,
  parseFilters,
  toQuery,
} from "./model";

describe("completeJustificativa", () => {
  it("completa frase cortada em 'art.'", () => {
    expect(
      completeJustificativa(
        "O art.",
        "O art. 5º, IV, protege a manifestação, mas veda o anonimato. A liberdade convive com a posterior responsabilização.",
      ),
    ).toBe("O art. 5º, IV, protege a manifestação, mas veda o anonimato.");
  });
  it("atravessa várias abreviações e §", () => {
    expect(
      completeJustificativa(
        "Essa atribuição consta do art.",
        "Essa atribuição consta do art. 144, § 2º. A definição constitucional identifica a função.",
      ),
    ).toBe("Essa atribuição consta do art. 144, § 2º.");
  });
  it("mantém justificativa completa", () => {
    expect(
      completeJustificativa("A vírgula encerra a oração.", "A vírgula encerra a oração. Outra frase."),
    ).toBe("A vírgula encerra a oração.");
  });
  it("comentário de uma frase só", () => {
    expect(completeJustificativa("Conforme o art.", "Conforme o art. 312 do CP")).toBe(
      "Conforme o art. 312 do CP",
    );
  });
  it("não mexe quando não é o começo do comentário", () => {
    expect(completeJustificativa("O art.", "Outro texto.")).toBe("O art.");
    expect(justificativaIsLead("O art.", "Outro texto.")).toBe(false);
    expect(justificativaIsLead("O art.", "O art. 5º.")).toBe(true);
  });
});

describe("filtros na URL", () => {
  it("ida e volta", () => {
    const f = parseFilters(
      { area: "policial", disciplina: ["Direito Penal", "Ética"], status: "wrong", q: " crase " },
      null,
    );
    expect(f.lists.disciplina).toEqual(["Direito Penal", "Ética"]);
    expect(f.text).toBe("crase");
    const again = parseFilters(
      Object.fromEntries(
        [...new Set(filtersToParams(f).keys())].map((k) => [k, filtersToParams(f).getAll(k)]),
      ),
      null,
    );
    expect(again).toEqual(f);
  });
  it("área preferida e 'todas'", () => {
    expect(parseFilters({}, "farmacia").area).toBe("farmacia");
    expect(toQuery(parseFilters({ area: "todas" }, "farmacia")).area).toBeNull();
    expect(parseFilters({ area: "X Y" }, "policial").area).toBe("policial");
    expect(parseFilters({ status: "nada" }, null).status).toBe("all");
  });
});

describe("checkImport", () => {
  const ce = {
    id: "A-1",
    area: "Policial",
    concurso: "PRF",
    disciplina: "Ética",
    assunto: "X",
    tipo: "certo_errado",
    dificuldade: "facil",
    enunciado: "E",
    gabarito: "c",
    alternativas: null,
  };
  it("normaliza área e gabarito", () => {
    const r = checkImport([ce]);
    expect(r.valid[0].area).toBe("policial");
    expect(r.valid[0].gabarito).toBe("C");
  });
  it("aponta inválidas e repetidas", () => {
    const r = checkImport([
      ce,
      ce,
      { ...ce, id: "A-2", gabarito: "X" },
      { ...ce, id: "A-3", tipo: "multipla_escolha", alternativas: { A: "a", B: "b" }, gabarito: "D" },
    ]);
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toEqual(["A-1"]);
    expect(r.invalid.map((i) => i.id)).toEqual(["A-2", "A-3"]);
  });
  it("aceita { questoes: [...] } e recusa outra coisa", () => {
    expect(checkImport({ questoes: [ce] }).valid).toHaveLength(1);
    expect(checkImport({ a: 1 }).invalid[0].message).toMatch(/lista/);
  });
});
