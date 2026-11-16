import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da Polícia Penal Federal (Agente Federal de Execução Penal).
 * Montado a partir do edital nº 1 – DEPEN, de 4/5/2020 (Cebraspe), o último publicado para o cargo.
 * Ainda não há apostila própria da PPF: o plano reaproveita as apostilas da PRF, da PCRN e da PMPE
 * que cobrem os mesmos assuntos. O que nenhuma apostila cobre aparece com aviso, para estudar por fora.
 */

const D = {
  lp: { id: "pmpe-lingua-portuguesa", name: "Português (PMPE)" },
  rlm: { id: "pcrn-raciocinio-logico", name: "Racioc. Lógico (PCRN)" },
  rlmMat: { id: "prf-raciocinio-logico", name: "Matemática (PRF)" },
  info: { id: "pmpe-informatica", name: "Informática (PMPE)" },
  infoOffice: { id: "pcrn-informatica", name: "Informática (PCRN)" },
  etica: { id: "prf-etica-cidadania", name: "Ética (PRF)" },
  const: { id: "prf-direito-constitucional", name: "Constitucional (PRF)" },
  adm: { id: "prf-direito-administrativo", name: "Direito Adm. (PRF)" },
  admPc: { id: "pcrn-direito-administrativo", name: "Direito Adm. (PCRN)" },
  penal: { id: "prf-direito-penal", name: "Direito Penal (PRF)" },
  penalPc: { id: "pcrn-direito-penal", name: "Direito Penal (PCRN)" },
  pp: { id: "prf-processo-penal", name: "Proc. Penal (PRF)" },
  ppPc: { id: "pcrn-processo-penal", name: "Proc. Penal (PCRN)" },
  dh: { id: "prf-direitos-humanos", name: "Dir. Humanos (PRF)" },
  dhPe: { id: "pmpe-direitos-humanos-legislacao", name: "DH e Leis (PMPE)" },
  lex: { id: "prf-legislacao-extravagante", name: "Leis Especiais (PRF)" },
  lexPc: { id: "pcrn-legislacao-extravagante", name: "Leis Especiais (PCRN)" },
  red: { id: "prf-redacao", name: "Redação (PRF)" },
} as const;

type Key = keyof typeof D;

const read = (k: Key, title: string, topics: string[], note?: string): PlanItem => ({
  kind: "read",
  disciplineId: D[k].id,
  discipline: D[k].name,
  title,
  topics,
  ...(note ? { note } : {}),
});

/** Assunto do edital sem apostila na Biblioteca: estudar por fora e concluir pelo botão. */
const fora = (k: Key, title: string, note: string): PlanItem => ({
  kind: "read",
  disciplineId: D[k].id,
  discipline: D[k].name,
  title,
  topics: [],
  note: `Sem apostila na Biblioteca. ${note}`,
  manual: true,
});

const r = (prefix: string, ch: string, a: number, b = a) =>
  Array.from({ length: b - a + 1 }, (_, i) => `${prefix}.${ch}.t${String(a + i).padStart(2, "0")}`);

export const PPF_PLAN: Plan = {
  id: "ppf-agente",
  name: "Plano de metas Polícia Penal Federal",
  source: "Edital nº 1 – DEPEN, de 4/5/2020 (Cebraspe), com apostilas da PRF, PCRN e PMPE",
  note:
    "Plano montado sobre o último edital (DEPEN 2020), reaproveitando apostilas de outros concursos da Biblioteca. " +
    "O novo edital pode mudar o conteúdo. Execução Penal e as normas do sistema penitenciário federal ainda não têm apostila: " +
    "esses itens aparecem com aviso para estudar pela lei seca.",
  metas: [
    { id: "01", items: [read("const", "Direitos e garantias fundamentais (art. 5º)", [...r("prf-const", "c02", 1, 8)]), read("lp", "Compreensão e interpretação de textos", ["pmpe-lp.c01.t01", "pmpe-lp.c01.t02"])] },
    { id: "02", items: [read("const", "Art. 5º: propriedade, domicílio, garantias penais e processuais", [...r("prf-const", "c02", 9, 16)]), read("rlm", "Proposições e conectivos", [...r("pcrn-rlm", "c01", 1, 4)])] },
    { id: "03", items: [read("dh", "Teoria geral: gerações e características dos direitos humanos", [...r("prf-dh", "c01", 1, 6), ...r("prf-dh", "c02", 1, 3)]), read("info", "Internet, intranet e navegadores", ["pmpe-info.c01.t01", "pmpe-info.c01.t02"])] },
    { id: "04", items: [read("penal", "Aplicação da lei penal no tempo e no espaço", [...r("prf-penal", "c01", 1, 6)]), read("lp", "Semântica e figuras de linguagem", ["pmpe-lp.c01.t03", "pmpe-lp.c01.t04"])] },
    { id: "05", items: [read("pp", "Inquérito policial", [...r("prf-pp", "c01", 1, 5)]), read("rlm", "Tabela-verdade, tautologia e contradição", [...r("pcrn-rlm", "c02", 1, 5)])] },
    { id: "06", items: [read("const", "Remédios constitucionais (habeas corpus e outros)", [...r("prf-const", "c03", 1, 6)]), read("etica", "Ética, moral e função pública", [...r("prf-etica", "c01", 1, 5)], "Apostila curta: complemente com a lei seca da Lei 8.112/1990 (regime disciplinar e PAD) e da Lei 12.846/2013.")] },
    { id: "07", review: ["01", "06"] },
    { id: "08", items: [read("penal", "Fato típico, tentativa e ilicitude", [...r("prf-penal", "c02", 1, 5), ...r("prf-penal", "c03", 1, 4)], "A tentativa (art. 14 do CP) não tem tópico próprio: leia os arts. 14 a 17 do Código Penal."), read("lp", "Acentuação, classes e formação de palavras", ["pmpe-lp.c02.t02", "pmpe-lp.c02.t03", "pmpe-lp.c02.t04"])] },
    { id: "09", items: [read("adm", "Lei 8.112/1990: cargos, provimento, direitos e vantagens", [...r("prf-adm", "c06", 1, 12)]), read("info", "Segurança da informação, malwares e backup", [...r("pmpe-info", "c02", 1, 5)])] },
    { id: "10", items: [read("adm", "Lei 8.112/1990: regime disciplinar e PAD", ["prf-adm.c06.t13", "prf-adm.c06.t14"]), read("rlm", "Equivalências e negações", [...r("pcrn-rlm", "c03", 1, 6)])] },
    { id: "11", items: [read("pp", "Ação penal", [...r("prf-pp", "c02", 1, 6)]), read("lp", "Sintaxe e funções do “que” e do “se”", ["pmpe-lp.c03.t01", "pmpe-lp.c03.t02", "pmpe-lp.c03.t04"])] },
    { id: "12", items: [read("const", "Direitos sociais", [...r("prf-const", "c04", 1, 5)]), read("dh", "Declaração Universal dos Direitos Humanos", [...r("prf-dh", "c04", 1, 7)])] },
    { id: "13", items: [read("adm", "Poderes administrativos, uso e abuso de poder", [...r("prf-adm", "c07", 1, 4)]), read("info", "Hardware, Windows e arquivos", ["pmpe-info.c03.t01", "pmpe-info.c03.t02", "pmpe-info.c03.t03", "pmpe-info.c05.t02"])] },
    { id: "14", review: ["08", "13"] },
    { id: "15", items: [read("penalPc", "Crimes contra a pessoa", [...r("pcrn-penal", "c02", 1, 7)]), read("lp", "Concordância, regência e crase", ["pmpe-lp.c03.t05", "pmpe-lp.c04.t01", "pmpe-lp.c04.t02"])] },
    { id: "16", items: [read("pp", "Prisões, liberdade provisória e fiança", [...r("prf-pp", "c03", 1, 8)]), read("rlm", "Argumentação e diagramas lógicos", [...r("pcrn-rlm", "c04", 1, 5)])] },
    { id: "17", items: [read("const", "Nacionalidade", [...r("prf-const", "c05", 1, 7)]), read("dhPe", "Direitos humanos e tratamento penal (LEP, Regras de Mandela)", ["pmpe-dh.c01.t04"])] },
    { id: "18", items: [read("penalPc", "Crimes contra o patrimônio", [...r("pcrn-penal", "c03", 1, 7)]), fora("penalPc", "Crimes contra a fé pública", "Leia os arts. 289 a 311-A do Código Penal (moeda falsa, falsidade documental e ideológica, uso de documento falso).")] },
    { id: "19", items: [read("adm", "Licitações (Lei 14.133/2021)", [...r("prf-adm", "c09", 1, 13)], "O edital de 2020 citava a Lei 8.666/1993, hoje revogada; estude a 14.133/2021."), fora("adm", "Convênios e transferências (Decreto 6.170/2007 e Portaria 424/2016)", "Leia a lei seca no Planalto; costuma cair pouco.")] },
    { id: "20", items: [read("const", "Direitos políticos e partidos", [...r("prf-const", "c06", 1, 7), "pcrn-const.c02.t06"]), read("lp", "Colocação pronominal e pontuação", ["pmpe-lp.c04.t03", "pmpe-lp.c04.t04"])] },
    { id: "21", review: ["15", "20"] },
    { id: "22", items: [read("penalPc", "Crimes contra a administração pública", [...r("pcrn-penal", "c04", 1, 12)]), read("rlm", "Contagem, combinatória e probabilidade", [...r("pcrn-rlm", "c05", 1, 6), ...r("pcrn-rlm", "c06", 1, 3)])] },
    { id: "23", items: [read("adm", "Responsabilidade civil do Estado", ["prf-adm.c12.t01"]), fora("adm", "Processo administrativo federal (Lei 9.784/1999)", "Leia a lei seca no Planalto, com atenção a prazos, recursos e impedimentos.")] },
    { id: "24", items: [read("lexPc", "Organizações criminosas e lavagem de dinheiro", ["pcrn-lex.c02.t03", "pcrn-lex.c02.t04"]), read("rlmMat", "Razão, proporção e porcentagem", [...r("prf-rlm", "c01", 1, 2)])] },
    { id: "25", items: [read("lex", "Tortura e abuso de autoridade", [...r("prf-lex", "c02", 1, 3), ...r("prf-lex", "c03", 1, 6)]), read("const", "Segurança pública e polícia penal (art. 144)", [...r("prf-const", "c10", 1, 6)])] },
    { id: "26", items: [read("lexPc", "Lei de Drogas e Estatuto do Desarmamento", ["pcrn-lex.c02.t01", "pcrn-lex.c02.t02"]), read("admPc", "Improbidade administrativa (Lei 8.429/1992)", ["pcrn-adm.c03.t01"])] },
    { id: "27", items: [read("const", "Formas e sistemas de governo; Poder Executivo", [...r("prf-const", "c08", 1, 8)]), read("pp", "Provas", [...r("prf-pp", "c04", 1, 7)])] },
    { id: "28", review: ["22", "27"] },
    { id: "29", items: [read("dh", "Pacto de San José da Costa Rica", [...r("prf-dh", "c05", 1, 18)]), fora("lex", "Lei Anticorrupção (Lei 12.846/2013)", "Leia a lei seca no Planalto: responsabilidade objetiva da pessoa jurídica, acordo de leniência e sanções.")] },
    { id: "30", items: [read("ppPc", "Aplicação da lei processual penal", ["pcrn-pp.c01.t03"]), fora("pp", "Crimes de responsabilidade dos funcionários públicos e habeas corpus no CPP", "Leia os arts. 513 a 518 e 647 a 667 do CPP. O HC na Constituição está na meta 06.")] },
    { id: "31", items: [read("lex", "Crimes hediondos e Pacote Anticrime", [...r("prf-lex", "c04", 1, 2), "pcrn-lex.c01.t01"], "O Pacote Anticrime (Lei 13.964/2019) aparece espalhado pelas apostilas de Penal e Processo Penal; revise as mudanças dele no CP, CPP e LEP."), read("infoOffice", "Word, Excel e PowerPoint", ["pcrn-info.c02.t02", "pcrn-info.c02.t03", "pcrn-info.c02.t04"])] },
    { id: "32", items: [fora("dhPe", "Execução Penal: Lei 7.210/1984 (LEP) completa", "É a matéria de maior peso (Conhecimentos Complementares). Leia a LEP inteira no Planalto, com foco em direitos e deveres do preso, disciplina, regimes, remição e RDD."), fora("dhPe", "Sistema penitenciário federal", "Leia o Decreto 6.049/2007, a Lei 11.671/2008 e o Decreto 6.877/2008 (presídios federais), as Leis 10.693/2003 e 11.907/2009 (carreira) e a Lei 13.675/2018 (SUSP).")] },
    { id: "33", items: [read("red", "Redação Cebraspe e modelo pronto DEPEN", ["prf-red.c02.t02", ...r("prf-red", "c01", 1, 5)], "A discursiva do DEPEN 2020 foi um texto de até 30 linhas sobre sistema prisional, segurança pública e justiça criminal.")] },
    { id: "34", review: ["29", "33"] },
  ],
};
