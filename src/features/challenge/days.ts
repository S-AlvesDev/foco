/**
 * Desafio 7 dias: uma semana de arrancada para a PMPE. Cada dia junta leitura de uma apostila,
 * questões da matéria, a dose do Café com Lei e uma tarefa de fixação. Os dias abrem em sequência:
 * o seguinte libera quando o anterior é concluído.
 */
export type ChallengeTask = {
  label: string;
  /** Onde fazer a tarefa. */
  href?: string;
  /** Concluída automaticamente quando a dose do Café com Lei com este id é concluída. */
  cafe?: string;
};
export type ChallengeDay = { id: string; title: string; focus: string; tasks: ChallengeTask[] };

const lib = (d: string, t: string) => `/biblioteca/${d}/${t}`;
const q = (disc: string) => `/questoes?concurso=PMPE&disciplina=${encodeURIComponent(disc)}`;

export const CHALLENGE_PLAN_ID = "desafio-7-dias";

export const CHALLENGE_DAYS: ChallengeDay[] = [
  {
    id: "d1",
    title: "Português em foco",
    focus: "Interpretação de texto, a base das 10 questões de Português.",
    tasks: [
      {
        label: "Ler: Compreensão e interpretação de textos",
        href: lib("pmpe-lingua-portuguesa", "pmpe-lp.c01.t01"),
      },
      { label: "Resolver 10 questões de Língua Portuguesa", href: q("Língua Portuguesa") },
      { label: "Café com Lei: princípios fundamentais", href: "/cafe-com-lei/01", cafe: "01" },
      { label: "Anotar no Diário os 3 erros que mais cometeu hoje", href: "/diario" },
    ],
  },
  {
    id: "d2",
    title: "Constituição na abordagem",
    focus: "Direitos individuais que o policial aplica no dia a dia.",
    tasks: [
      {
        label: "Ler: Teoria geral e direitos individuais (art. 5º)",
        href: lib("pmpe-direito-constitucional", "pmpe-const.c02.t01"),
      },
      { label: "Resolver 10 questões de Direito Constitucional", href: q("Direito Constitucional") },
      { label: "Café com Lei: direitos individuais na abordagem", href: "/cafe-com-lei/02", cafe: "02" },
      { label: "Revisar e marcar na apostila os incisos do art. 5º que errou" },
    ],
  },
  {
    id: "d3",
    title: "Lógica sem medo",
    focus: "Conectivos, tabela-verdade e negações: o que mais cai em Raciocínio Lógico.",
    tasks: [
      { label: "Ler: Proposições e conectivos", href: lib("pmpe-raciocinio-logico", "pmpe-rlm.c01.t01") },
      { label: "Ler: Equivalências e negações", href: lib("pmpe-raciocinio-logico", "pmpe-rlm.c01.t02") },
      { label: "Resolver 10 questões de Raciocínio Lógico", href: q("Raciocínio Lógico") },
      { label: "Café com Lei: remédios constitucionais", href: "/cafe-com-lei/03", cafe: "03" },
    ],
  },
  {
    id: "d4",
    title: "Informática segura",
    focus: "Segurança da informação e malwares, tema campeão em Informática.",
    tasks: [
      {
        label: "Ler: Princípios da segurança da informação",
        href: lib("pmpe-informatica", "pmpe-info.c02.t01"),
      },
      { label: "Ler: Malwares", href: lib("pmpe-informatica", "pmpe-info.c02.t02") },
      { label: "Resolver 10 questões de Informática", href: q("Informática") },
      { label: "Café com Lei: Administração Pública", href: "/cafe-com-lei/04", cafe: "04" },
    ],
  },
  {
    id: "d5",
    title: "Pernambuco holandês",
    focus: "A presença holandesa e Maurício de Nassau, assunto de alta incidência.",
    tasks: [
      {
        label: "Ler: A presença holandesa e o governo de Maurício de Nassau",
        href: lib("pmpe-historia-pe", "pmpe-hist.c01.t04"),
      },
      { label: "Resolver 10 questões de História de Pernambuco", href: q("História de Pernambuco") },
      { label: "Café com Lei: militares dos Estados", href: "/cafe-com-lei/05", cafe: "05" },
      { label: "Fazer um resumo de 5 linhas da Insurreição Pernambucana no Diário", href: "/diario" },
    ],
  },
  {
    id: "d6",
    title: "Leis que o policial aplica",
    focus: "Abuso de autoridade e tortura: limites da atuação policial.",
    tasks: [
      {
        label: "Ler: Lei de Abuso de Autoridade",
        href: lib("pmpe-direitos-humanos-legislacao", "pmpe-dh.c04.t01"),
      },
      { label: "Ler: Lei de Tortura", href: lib("pmpe-direitos-humanos-legislacao", "pmpe-dh.c04.t02") },
      { label: "Resolver 10 questões de Legislação Extravagante", href: q("Legislação Extravagante") },
      { label: "Café com Lei: segurança pública", href: "/cafe-com-lei/06", cafe: "06" },
    ],
  },
  {
    id: "d7",
    title: "Simulado da semana",
    focus: "Juntar tudo: questões misturadas e revisão dos erros.",
    tasks: [
      { label: "Resolver 30 questões misturadas da PMPE", href: "/questoes?concurso=PMPE" },
      { label: "Revisar os tópicos que venceram hoje", href: "/revisoes" },
      { label: "Café com Lei: ECA na atuação policial", href: "/cafe-com-lei/07", cafe: "07" },
      { label: "Escrever no Diário o balanço da semana e a meta da próxima", href: "/diario" },
    ],
  },
];
