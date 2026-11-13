import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da PC-RN (curso CT Concursos, "metas de aulas"): 52 dias, duas matérias por dia,
 * na ordem do PDF do curso. Os tópicos da Biblioteca são maiores que as aulas, então quando um tópico
 * se espalha por várias metas, as metas do meio concluem pelo botão ("manual") e a última conclui
 * sozinha quando o tópico é lido. Assuntos sem apostila (Lei Orgânica da PC, culpabilidade,
 * concurso de pessoas, poderes administrativos) vêm com aviso.
 */
const item = (
  disciplineId: string,
  discipline: string,
  title: string,
  topics: string[],
  opts: { note?: string; manual?: boolean } = {},
): PlanItem => ({ kind: "read", disciplineId, discipline, title, topics, ...opts });

export const PCRN_PLAN: Plan = {
  id: "pcrn-ctcon",
  name: "Plano de metas PC-RN",
  source: "Metas de aulas do curso (52 dias), ligadas às apostilas da PC-RN",
  note: "Segue as metas de aulas do curso. Quando a meta cobre só um pedaço de um tópico da apostila, leia a parte indicada e marque como feito; a última meta daquele tópico conclui sozinha quando você termina a leitura.",
  metas: [
    {
      id: "01",
      items: [
        item("pcrn-portugues", "Português", "Interpretação e acentuação", [
          "pcrn-port.c01.t01",
          "pcrn-port.c01.t02",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Proposição simples e composta", [
          "pcrn-rlm.c01.t01",
          "pcrn-rlm.c01.t02",
        ]),
      ],
    },
    {
      id: "02",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Noções de governo/Estado e conceito",
          ["pcrn-adm.c01.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-informatica", "Informática", "Hardware (aulas 01 a 03)", ["pcrn-info.c01.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "03",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Princípio da legalidade e lei penal no tempo",
          ["pcrn-penal.c01.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Princípios fundamentais", [
          "pcrn-const.c01.t01",
        ]),
      ],
    },
    {
      id: "04",
      items: [
        item("pcrn-portugues", "Português", "Morfologia (aulas 01 a 03)", ["pcrn-port.c02.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
        item(
          "pcrn-raciocinio-logico",
          "Raciocínio Lógico",
          "Sinônimos dos conectivos e tabela-verdade (01-02)",
          ["pcrn-rlm.c01.t03", "pcrn-rlm.c01.t04", "pcrn-rlm.c02.t01"],
        ),
      ],
    },
    {
      id: "05",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Princípios expressos e implícitos", [
          "pcrn-adm.c01.t01",
          "pcrn-adm.c01.t02",
        ]),
        item("pcrn-informatica", "Informática", "Hardware (aulas 04 a 06)", ["pcrn-info.c01.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "06",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Lei penal no espaço e teoria do crime", [
          "pcrn-penal.c01.t01",
        ]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos individuais (aulas 01 a 03)",
          ["pcrn-const.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "07",
      items: [
        item("pcrn-portugues", "Português", "Morfologia (aulas 04 a 06)", ["pcrn-port.c02.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tabela-verdade (aulas 03 a 05)", [
          "pcrn-rlm.c02.t02",
        ]),
      ],
    },
    {
      id: "08",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Administração Pública e administração direta/órgãos",
          ["pcrn-adm.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-informatica", "Informática", "Hardware (aulas 07 a 09)", ["pcrn-info.c01.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "09",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Infração penal (sujeitos) e conduta",
          ["pcrn-penal.c01.t02", "pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos individuais (aulas 04 a 06)",
          ["pcrn-const.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "10",
      items: [
        item(
          "pcrn-portugues",
          "Português",
          "Morfologia (07-08) e sintaxe simples",
          ["pcrn-port.c02.t01", "pcrn-port.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tabela-verdade (aulas 06 a 08)", [
          "pcrn-rlm.c02.t03",
        ]),
      ],
    },
    {
      id: "11",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Administração indireta e descentralização", [
          "pcrn-adm.c02.t01",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "Hardware (10-11) e software (01)",
          ["pcrn-info.c01.t01", "pcrn-info.c01.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "12",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Resultado, nexo causal e causa independente",
          ["pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos individuais (aulas 07 a 09)",
          ["pcrn-const.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "13",
      items: [
        item("pcrn-portugues", "Português", "Sintaxe composta e pontuação", [
          "pcrn-port.c03.t01",
          "pcrn-port.c03.t05",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tabela-verdade (09) e tautologia (01-02)", [
          "pcrn-rlm.c02.t04",
        ]),
      ],
    },
    {
      id: "14",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Atos administrativos (aulas 01 a 03)",
          ["pcrn-adm.c02.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-informatica",
          "Informática",
          "Software (02-03) e segurança da informação (01)",
          ["pcrn-info.c01.t02", "pcrn-info.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "15",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Omissão imprópria e tipicidade",
          ["pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos individuais (aulas 10 a 12)",
          ["pcrn-const.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "16",
      items: [
        item("pcrn-portugues", "Português", "Crase e concordância", [
          "pcrn-port.c03.t04",
          "pcrn-port.c03.t02",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tautologia (03) e negações lógicas (01-02)", [
          "pcrn-rlm.c02.t05",
          "pcrn-rlm.c03.t03",
        ]),
      ],
    },
    {
      id: "17",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Atos administrativos (aulas 04 a 06)", [
          "pcrn-adm.c02.t02",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "Segurança da informação (aulas 02 a 04)",
          ["pcrn-info.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "18",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Dolo, culpa, crime consumado e tentado",
          ["pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos individuais (13) e remédios (01-02)",
          ["pcrn-const.c02.t01", "pcrn-const.c02.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "19",
      items: [
        item("pcrn-portugues", "Português", "Colocação pronominal e formação de palavras", [
          "pcrn-port.c03.t03",
          "pcrn-port.c02.t02",
        ]),
        item(
          "pcrn-raciocinio-logico",
          "Raciocínio Lógico",
          "Negações lógicas (03-04) e negação dos quantificadores",
          ["pcrn-rlm.c03.t04", "pcrn-rlm.c03.t05", "pcrn-rlm.c03.t06"],
        ),
      ],
    },
    {
      id: "20",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Poderes administrativos (01-02) e responsabilidade civil (01)",
          ["pcrn-adm.c02.t04"],
          {
            note: "Os poderes administrativos não têm apostila no app: estude pela videoaula. Leia só a parte indicada no título e marque como feito.",
            manual: true,
          },
        ),
        item(
          "pcrn-informatica",
          "Informática",
          "Segurança da informação (aulas 05 a 07)",
          ["pcrn-info.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "21",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Desistência, arrependimento e crime impossível",
          ["pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Remédios constitucionais (aulas 03 a 05)",
          ["pcrn-const.c02.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "22",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Conceitos iniciais e princípios", [
          "pcrn-contab.c01.t01",
          "pcrn-contab.c01.t02",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Equivalências lógicas (aulas 01 a 03)", [
          "pcrn-rlm.c03.t01",
        ]),
      ],
    },
    {
      id: "23",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Responsabilidade civil do Estado (aulas 02 a 04)",
          ["pcrn-adm.c02.t04"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-informatica",
          "Informática",
          "Segurança da informação (aulas 08 a 10)",
          ["pcrn-info.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "24",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Excludentes de ilicitude (aulas 01 a 03)",
          ["pcrn-penal.c01.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Remédios (06) e direitos sociais (01-02)",
          ["pcrn-const.c02.t02", "pcrn-const.c02.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "25",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Características da informação e patrimônio", [
          "pcrn-contab.c01.t03",
          "pcrn-contab.c01.t04",
          "pcrn-contab.c01.t05",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Equivalências (04-05) e argumentação (01)", [
          "pcrn-rlm.c03.t02",
          "pcrn-rlm.c04.t01",
        ]),
      ],
    },
    {
      id: "26",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Responsabilidade civil (05) e controle (01-02)",
          ["pcrn-adm.c02.t04", "pcrn-adm.c02.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-informatica",
          "Informática",
          "Segurança da informação (aulas 11 a 13)",
          ["pcrn-info.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "27",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Excludente (04) e culpabilidade (01-02)",
          ["pcrn-penal.c01.t03"],
          {
            note: "A culpabilidade não tem apostila no app: estude pela videoaula. Leia só a parte indicada no título e marque como feito.",
            manual: true,
          },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos sociais (03-04) e nacionalidade (01)",
          ["pcrn-const.c02.t03", "pcrn-const.c02.t04"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "28",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Regimes contábeis e ato/fato contábil", [
          "pcrn-contab.c01.t06",
          "pcrn-contab.c01.t08",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Lógica de argumentação (aulas 02 a 04)", [
          "pcrn-rlm.c04.t02",
          "pcrn-rlm.c04.t03",
          "pcrn-rlm.c04.t04",
          "pcrn-rlm.c04.t05",
        ]),
      ],
    },
    {
      id: "29",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Controle (03) e improbidade (01-02)",
          ["pcrn-adm.c02.t03", "pcrn-adm.c03.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item(
          "pcrn-informatica",
          "Informática",
          "Segurança da informação (14-15) e Windows (01)",
          ["pcrn-info.c03.t01", "pcrn-info.c02.t01"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "30",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Culpabilidade (03) e erros (01 a 03)",
          ["pcrn-penal.c01.t03"],
          {
            note: "A culpabilidade não tem apostila no app: estude pela videoaula. Leia só a parte indicada no título e marque como feito.",
            manual: true,
          },
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Nacionalidade (aulas 02 a 04)", [
          "pcrn-const.c02.t04",
        ]),
      ],
    },
    {
      id: "31",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Exercício social e introdução às contas", [
          "pcrn-contab.c01.t07",
          "pcrn-contab.c02.t01",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Análise combinatória (aulas 01 a 03)", [
          "pcrn-rlm.c05.t01",
          "pcrn-rlm.c05.t02",
        ]),
      ],
    },
    {
      id: "32",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Improbidade (aulas 03 a 05)", [
          "pcrn-adm.c03.t01",
        ]),
        item("pcrn-informatica", "Informática", "Windows (aulas 02 a 04)", ["pcrn-info.c02.t01"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "33",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Erros (04) e concurso de pessoas (01 a 03)",
          ["pcrn-penal.c01.t03"],
          { note: "O concurso de pessoas não tem apostila no app: estude pela videoaula." },
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Direitos políticos (aulas 01 a 03)",
          ["pcrn-const.c02.t05"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "34",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Classificação das contas e contas patrimoniais", [
          "pcrn-contab.c02.t02",
          "pcrn-contab.c02.t03",
          "pcrn-contab.c02.t04",
          "pcrn-contab.c02.t05",
          "pcrn-contab.c02.t06",
          "pcrn-contab.c02.t07",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Análise combinatória (aulas 04 a 06)", [
          "pcrn-rlm.c05.t03",
          "pcrn-rlm.c05.t04",
        ]),
      ],
    },
    {
      id: "35",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Licitações (aulas 01 a 03)", [
          "pcrn-adm.c03.t02",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "Windows (05) e Word (01-02)",
          ["pcrn-info.c02.t01", "pcrn-info.c02.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "36",
      items: [
        item(
          "pcrn-direito-penal",
          "Direito Penal",
          "Concurso de pessoas (04-05) e homicídio",
          ["pcrn-penal.c02.t01"],
          { note: "O concurso de pessoas não tem apostila no app: estude essa parte pela videoaula." },
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Direitos políticos (04-05) e partidos", [
          "pcrn-const.c02.t05",
          "pcrn-const.c02.t06",
        ]),
      ],
    },
    {
      id: "37",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Contas retificadoras e de resultado", [
          "pcrn-contab.c02.t08",
          "pcrn-contab.c02.t09",
          "pcrn-contab.c02.t10",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Análise combinatória (aulas 07 a 09)", [
          "pcrn-rlm.c05.t05",
        ]),
      ],
    },
    {
      id: "38",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Licitações (aulas 04 a 06)", [
          "pcrn-adm.c03.t03",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "Word (03-04) e Excel (01)",
          ["pcrn-info.c02.t02", "pcrn-info.c02.t03"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "39",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Feminicídio, suicídio e infanticídio", [
          "pcrn-penal.c02.t02",
          "pcrn-penal.c02.t03",
          "pcrn-penal.c02.t04",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Organização do Estado e competências", [
          "pcrn-const.c03.t01",
        ]),
      ],
    },
    {
      id: "40",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Superveniências e contas de compensação", [
          "pcrn-contab.c02.t11",
          "pcrn-contab.c02.t12",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Análise combinatória (10-11)", [
          "pcrn-rlm.c05.t06",
        ]),
      ],
    },
    {
      id: "41",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Licitações (aulas 07 a 09)",
          ["pcrn-adm.c03.t04", "pcrn-adm.c03.t05"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-informatica", "Informática", "Excel (aulas 02 a 04)", ["pcrn-info.c02.t03"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "42",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Aborto, lesões e crimes contra a honra", [
          "pcrn-penal.c02.t05",
          "pcrn-penal.c02.t06",
          "pcrn-penal.c02.t07",
        ]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Administração Pública (aulas 01 a 03)",
          ["pcrn-const.c03.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "43",
      items: [
        item("pcrn-contabilidade", "Contabilidade", "Teoria das contas e plano de contas", [
          "pcrn-contab.c02.t13",
        ]),
        item("pcrn-medicina-legal", "Medicina Legal", "Aulas 01 a 03", [
          "pcrn-ml.c01.t01",
          "pcrn-ml.c01.t02",
          "pcrn-ml.c01.t03",
          "pcrn-ml.c01.t04",
        ]),
      ],
    },
    {
      id: "44",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "LGPD e contratos (01-02)",
          ["pcrn-adm.c03.t06", "pcrn-adm.c03.t04"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
        item("pcrn-informatica", "Informática", "Excel (aulas 05 a 07)", ["pcrn-info.c02.t03"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "45",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Furto, roubo e extorsão", [
          "pcrn-penal.c03.t01",
          "pcrn-penal.c03.t02",
          "pcrn-penal.c03.t03",
        ]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Administração Pública (04-05) e Poder Legislativo",
          ["pcrn-const.c03.t02", "pcrn-const.c04.t01", "pcrn-const.c04.t02"],
          {
            note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
            manual: true,
          },
        ),
      ],
    },
    {
      id: "46",
      items: [
        item("pcrn-processo-penal", "Proc. Penal", "Lei processual, fontes e princípios", [
          "pcrn-pp.c01.t01",
          "pcrn-pp.c01.t02",
          "pcrn-pp.c01.t03",
        ]),
        item("pcrn-medicina-legal", "Medicina Legal", "Aulas 04 a 06", [
          "pcrn-ml.c02.t01",
          "pcrn-ml.c02.t02",
          "pcrn-ml.c02.t03",
          "pcrn-ml.c02.t04",
        ]),
      ],
    },
    {
      id: "47",
      items: [
        item(
          "pcrn-direito-administrativo",
          "Direito Adm.",
          "Contratos (03-04) e Lei Orgânica da PC (01)",
          ["pcrn-adm.c03.t04"],
          { note: "A Lei Orgânica da PC-RN não tem apostila no app: estude essa parte pela videoaula." },
        ),
        item("pcrn-informatica", "Informática", "Excel (aulas 08 a 10)", ["pcrn-info.c02.t03"], {
          note: "Leia só a parte indicada no título; o tópico continua nas próximas metas. Marque como feito ao terminar.",
          manual: true,
        }),
      ],
    },
    {
      id: "48",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Extorsão mediante sequestro, dano e apropriação", [
          "pcrn-penal.c03.t04",
          "pcrn-penal.c03.t05",
          "pcrn-penal.c03.t06",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Congresso Nacional, Executivo e Judiciário", [
          "pcrn-const.c04.t02",
          "pcrn-const.c04.t03",
          "pcrn-const.c04.t04",
        ]),
      ],
    },
    {
      id: "49",
      items: [
        item("pcrn-processo-penal", "Proc. Penal", "Inquérito policial (aulas 01 a 03)", [
          "pcrn-pp.c02.t01",
          "pcrn-pp.c02.t02",
          "pcrn-pp.c02.t03",
        ]),
        item("pcrn-medicina-legal", "Medicina Legal", "Aulas 07 a 09", [
          "pcrn-ml.c02.t05",
          "pcrn-ml.c02.t06",
          "pcrn-ml.c02.t07",
        ]),
      ],
    },
    {
      id: "50",
      items: [
        item("pcrn-direito-administrativo", "Direito Adm.", "Lei Orgânica da PC (02-03)", [], {
          note: "Sem apostila no app ainda: estude pela videoaula e marque como feito.",
        }),
        item("pcrn-informatica", "Informática", "Excel (aulas 11 a 13)", ["pcrn-info.c02.t03"]),
      ],
    },
    {
      id: "51",
      items: [
        item("pcrn-direito-penal", "Direito Penal", "Estelionato, funcionário público e peculato", [
          "pcrn-penal.c03.t07",
          "pcrn-penal.c04.t01",
          "pcrn-penal.c04.t02",
          "pcrn-penal.c04.t03",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Funções essenciais à Justiça (01 a 03)", [
          "pcrn-const.c04.t05",
        ]),
      ],
    },
    {
      id: "52",
      items: [
        item("pcrn-processo-penal", "Proc. Penal", "Inquérito policial (aulas 04 a 06)", [
          "pcrn-pp.c02.t04",
          "pcrn-pp.c02.t05",
          "pcrn-pp.c02.t06",
        ]),
        item("pcrn-medicina-legal", "Medicina Legal", "Aulas 10 a 12", [
          "pcrn-ml.c03.t01",
          "pcrn-ml.c03.t02",
          "pcrn-ml.c03.t03",
          "pcrn-ml.c03.t04",
          "pcrn-ml.c03.t05",
          "pcrn-ml.c03.t06",
          "pcrn-ml.c03.t07",
        ]),
      ],
    },
  ],
};
