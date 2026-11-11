import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da PRF (curso CT Concursos), só com as matérias que têm apostila na Biblioteca.
 * Português, Matemática, Informática e Redação ficam de fora (são estudadas por videoaula).
 * As metas que tinham só essas matérias (15, 23, 24 e 53 a 60) não aparecem.
 * A numeração é a do curso, para bater com o PDF. As "Extras" cobrem o que a Biblioteca tem e o plano não.
 */

const D = {
  const: { id: "prf-direito-constitucional", name: "Constitucional" },
  adm: { id: "prf-direito-administrativo", name: "Direito Adm." },
  penal: { id: "prf-direito-penal", name: "Direito Penal" },
  pp: { id: "prf-processo-penal", name: "Proc. Penal" },
  dh: { id: "prf-direitos-humanos", name: "Dir. Humanos" },
  lex: { id: "prf-legislacao-extravagante", name: "Leis Especiais" },
  ctb: { id: "prf-ctb", name: "Trânsito" },
} as const;

type Key = keyof typeof D;
const PREFIX: Record<Key, string> = {
  const: "prf-const",
  adm: "prf-adm",
  penal: "prf-penal",
  pp: "prf-pp",
  dh: "prf-dh",
  lex: "prf-lex",
  ctb: "prf-ctb",
};

/** "c02:1-8" -> prf-const.c02.t01 … t08; "c03" -> o capítulo inteiro (até `n` tópicos, padrão 20). */
function t(key: Key, ...specs: string[]): string[] {
  const out: string[] = [];
  for (const spec of specs) {
    const [ch, range] = spec.split(":");
    const [a, b] = range ? range.split("-").map(Number) : [1, 20];
    for (let i = a; i <= (b ?? a); i++) out.push(`${PREFIX[key]}.${ch}.t${String(i).padStart(2, "0")}`);
  }
  return out;
}

const read = (key: Key, title: string, topics: string[]): PlanItem => ({
  kind: "read",
  disciplineId: D[key].id,
  discipline: D[key].name,
  title,
  topics,
});
const practice = (key: Key, title: string, topics: string[]): PlanItem => ({
  ...read(key, title, topics),
  kind: "practice",
});
const revise = (key: Key, title: string, topics: string[]): PlanItem => ({
  ...read(key, title, topics),
  kind: "review",
});

export const PRF_PLAN: Plan = {
  id: "prf-ctcon",
  name: "Plano de metas PRF",
  source: "Plano de metas do curso (60 metas), só com as matérias da Biblioteca",
  metas: [
    { id: "01", items: [read("const", "Direitos individuais e coletivos (parte 1)", t("const", "c02:1-8"))] },
    { id: "02", items: [read("penal", "Aplicação da lei penal no tempo", t("penal", "c01:1-3"))] },
    { id: "03", items: [read("adm", "Noções introdutórias", t("adm", "c01:1-1"))] },
    {
      id: "04",
      items: [read("const", "Direitos individuais e coletivos (parte 2)", t("const", "c02:9-16"))],
    },
    { id: "05", items: [read("penal", "Aplicação da lei penal no espaço", t("penal", "c01:4-6"))] },
    { id: "06", items: [read("adm", "Princípios", t("adm", "c02:1-1"))] },
    { id: "07", review: ["01", "06"] },
    { id: "08", items: [read("const", "Remédios constitucionais", t("const", "c03:1-6"))] },
    { id: "09", items: [read("penal", "Fato típico (parte 1)", t("penal", "c02:1-3"))] },
    { id: "10", items: [read("adm", "Organização da Administração Pública", t("adm", "c03:1-1"))] },
    { id: "11", items: [read("const", "Direitos sociais", t("const", "c04:1-5"))] },
    { id: "12", items: [read("penal", "Fato típico (parte 2)", t("penal", "c02:4-5"))] },
    {
      id: "13",
      items: [
        practice("adm", "Organização da Administração Pública: questões e revisão", t("adm", "c03:1-1")),
      ],
    },
    { id: "14", review: ["08", "13"] },
    { id: "16", items: [read("penal", "Excludentes de ilicitude", t("penal", "c03:1-4"))] },
    { id: "17", items: [read("adm", "Centralização e descentralização", t("adm", "c04:1-1"))] },
    { id: "18", items: [read("lex", "Crimes hediondos", t("lex", "c04:1-2"))] },
    { id: "19", items: [read("penal", "Culpabilidade", t("penal", "c04:1-5"))] },
    { id: "20", items: [read("adm", "Poderes administrativos", t("adm", "c07:1-4"))] },
    { id: "21", items: [read("lex", "Lei de Tortura", t("lex", "c02:1-3"))] },
    { id: "22", review: ["16", "21"] },
    {
      id: "25",
      items: [
        revise(
          "const",
          "Revisão: direitos individuais, remédios e direitos sociais",
          t("const", "c02:1-16", "c03:1-6", "c04:1-5"),
        ),
      ],
    },
    {
      id: "26",
      items: [
        revise(
          "penal",
          "Revisão: aplicação da lei penal, fato típico, excludentes e culpabilidade",
          t("penal", "c01:1-6", "c02:1-5", "c03:1-4", "c04:1-5"),
        ),
      ],
    },
    {
      id: "27",
      items: [
        revise(
          "adm",
          "Revisão: princípios, organização, centralização e poderes",
          t("adm", "c02:1-1", "c03:1-1", "c04:1-1", "c07:1-4"),
        ),
      ],
    },
    { id: "28", items: [read("pp", "Inquérito policial", t("pp", "c01:1-5"))] },
    { id: "29", items: [read("const", "Nacionalidade", t("const", "c05:1-7"))] },
    { id: "30", review: ["25", "29"] },
    { id: "31", items: [read("adm", "Responsabilidade civil do Estado", t("adm", "c12:1-1"))] },
    { id: "32", items: [read("pp", "Ação penal", t("pp", "c02:1-6"))] },
    { id: "33", items: [read("ctb", "Disposições preliminares", t("ctb", "c01:1-1"))] },
    { id: "34", items: [read("lex", "Lei Maria da Penha", t("lex", "c01:1-5"))] },
    { id: "35", items: [read("pp", "Provas (parte 1)", t("pp", "c04:1-4"))] },
    { id: "36", items: [read("ctb", "Sistema Nacional de Trânsito", t("ctb", "c02:1-3"))] },
    { id: "37", items: [read("const", "Direitos políticos", t("const", "c06:1-7"))] },
    { id: "38", items: [read("pp", "Provas (parte 2)", t("pp", "c04:5-7"))] },
    { id: "39", items: [read("ctb", "Normas de circulação e conduta (parte 1)", t("ctb", "c03:1-5"))] },
    { id: "40", items: [read("dh", "Gerações dos direitos humanos", t("dh", "c01:1-6"))] },
    { id: "41", items: [read("dh", "Características dos direitos humanos", t("dh", "c02:1-3"))] },
    { id: "42", items: [read("ctb", "Normas de circulação e conduta (parte 2)", t("ctb", "c03:6-9"))] },
    { id: "43", review: ["01", "10"] },
    { id: "44", review: ["11", "20"] },
    { id: "45", review: ["21", "30"] },
    { id: "46", items: [read("dh", "Declaração Universal dos Direitos Humanos", t("dh", "c04:1-7"))] },
    {
      id: "47",
      items: [
        read("pp", "Prisões (parte 1)", t("pp", "c03:1-4")),
        read("ctb", "Processo administrativo", t("ctb", "c07:1-2")),
      ],
    },
    { id: "48", items: [read("dh", "Direitos humanos na Constituição Federal", t("dh", "c03:1-5"))] },
    {
      id: "49",
      items: [
        read("pp", "Prisões (aspectos específicos)", t("pp", "c03:5-8")),
        read("ctb", "Penalidades", t("ctb", "c06:1-3")),
      ],
    },
    { id: "50", items: [read("lex", "Abuso de autoridade", t("lex", "c03:1-6"))] },
    { id: "51", items: [read("ctb", "Medidas administrativas", t("ctb", "c05:1-2"))] },
    {
      id: "52",
      items: [
        read("ctb", "Infrações", t("ctb", "c05:3-4")),
        read("ctb", "Crimes de trânsito", t("ctb", "c08:1-3")),
      ],
    },
    // Extras: o que a Biblioteca tem e o plano do curso não cobre.
    { id: "E1", extra: true, items: [read("ctb", "Habilitação", t("ctb", "c04:1-3"))] },
    { id: "E2", extra: true, items: [read("const", "Segurança pública", t("const", "c10:1-6"))] },
    { id: "E3", extra: true, items: [read("penal", "Concurso de pessoas", t("penal", "c05:1-5"))] },
    {
      id: "E4",
      extra: true,
      items: [read("penal", "Homicídio e feminicídio", t("penal", "c06:1-2", "c07:1-2"))],
    },
    { id: "E5", extra: true, items: [read("const", "Poder constituinte", t("const", "c01:1-10"))] },
    {
      id: "E6",
      extra: true,
      items: [read("const", "Organização político-administrativa", t("const", "c07:1-9"))],
    },
    {
      id: "E7",
      extra: true,
      items: [read("const", "Poder Executivo e Forças Armadas", t("const", "c08:1-8", "c09:1-5"))],
    },
    { id: "E8", extra: true, items: [read("const", "Ordem social", t("const", "c11:1-5"))] },
    { id: "E9", extra: true, items: [read("dh", "Pacto de São José da Costa Rica", t("dh", "c05:1-18"))] },
    {
      id: "E10",
      extra: true,
      items: [read("adm", "Agentes públicos e atos administrativos", t("adm", "c05:1-1", "c08:1-7"))],
    },
    { id: "E11", extra: true, items: [read("adm", "Lei 8.112/1990", t("adm", "c06:1-14"))] },
    { id: "E12", extra: true, items: [read("adm", "Licitações (Lei 14.133/2021)", t("adm", "c09:1-13"))] },
    {
      id: "E13",
      extra: true,
      items: [
        read("adm", "Contratos administrativos e controle da Administração", t("adm", "c10:1-18", "c11:1-3")),
      ],
    },
    { id: "E14", extra: true, review: ["E1", "E13"] },
  ],
};
