import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da PMPE (Soldado), montado a partir do edital verticalizado.
 * Usa só apostilas da PMPE: Português, Raciocínio Lógico, Informática, História de PE, Direito Constitucional,
 * Direitos Humanos e Legislação Extravagante, Estatuto da PMPE e Crimes Ambientais.
 * Cada meta junta duas matérias diferentes; a cada seis metas há uma revisão geral.
 */
const item = (
  disciplineId: string,
  discipline: string,
  title: string,
  topics: string[],
  note?: string,
): PlanItem => ({ kind: "read", disciplineId, discipline, title, topics, ...(note ? { note } : {}) });

export const PMPE_PLAN: Plan = {
  id: "pmpe-soldado",
  name: "Plano de metas PMPE",
  contestId: "pmpe",
  source: "Edital verticalizado PMPE (Soldado), com as apostilas da Biblioteca",
  note: "Plano montado a partir do edital da PMPE, só com apostilas da própria PMPE na Biblioteca. Todos os itens do edital têm apostila.",
  metas: [
    {
      id: "01",
      items: [
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Teoria geral dos direitos humanos", [
          "pmpe-dh.c01.t01",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Compreensão e interpretação de textos", [
          "pmpe-lp.c01.t01",
        ]),
      ],
    },
    {
      id: "02",
      items: [
        item("pmpe-direito-constitucional", "Constitucional", "Princípios fundamentais", [
          "pmpe-const.c01.t01",
          "pmpe-const.c01.t02",
          "pmpe-const.c01.t03",
          "pmpe-const.c01.t04",
        ]),
        item("pmpe-informatica", "Informática", "Internet, intranet e navegadores", [
          "pmpe-info.c01.t01",
          "pmpe-info.c01.t02",
        ]),
      ],
    },
    {
      id: "03",
      items: [
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Evolução histórica e gerações de direitos",
          ["pmpe-dh.c01.t02"],
        ),
        item("pmpe-historia-pe", "História de PE", "Ocupação, colonização, Capitanias e Duarte Coelho", [
          "pmpe-hist.c01.t01",
        ]),
      ],
    },
    {
      id: "04",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Tipologias e gêneros textuais", ["pmpe-lp.c01.t02"]),
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Proposições, conectivos e tabela-verdade", [
          "pmpe-rlm.c01.t01",
        ]),
      ],
    },
    {
      id: "05",
      items: [
        item("pmpe-direito-constitucional", "Constitucional", "Direitos e deveres individuais e coletivos", [
          "pmpe-const.c02.t01",
        ]),
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Incorporação dos tratados (art. 5º, §§ 2º e 3º)",
          ["pmpe-dh.c01.t03"],
        ),
      ],
    },
    {
      id: "06",
      items: [
        item("pmpe-informatica", "Informática", "Computação em nuvem e e-mail", ["pmpe-info.c05.t01"]),
        item("pmpe-lingua-portuguesa", "Português", "Figuras de linguagem", ["pmpe-lp.c01.t03"]),
      ],
    },
    { id: "07", review: ["01", "06"] },
    {
      id: "08",
      items: [
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Declaração Universal dos Direitos Humanos",
          ["pmpe-dh.c02.t01"],
        ),
        item("pmpe-direito-constitucional", "Constitucional", "Remédios constitucionais", [
          "pmpe-const.c02.t02",
        ]),
      ],
    },
    {
      id: "09",
      items: [
        item("pmpe-historia-pe", "História de PE", "A importância do açúcar para a economia local", [
          "pmpe-hist.c01.t02",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Significação das palavras e variação linguística", [
          "pmpe-lp.c01.t04",
          "pmpe-lp.c01.t05",
        ]),
      ],
    },
    {
      id: "10",
      items: [
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Equivalências e negações", ["pmpe-rlm.c01.t02"]),
        item("pmpe-informatica", "Informática", "Segurança da informação e malwares", [
          "pmpe-info.c02.t01",
          "pmpe-info.c02.t02",
          "pmpe-info.c02.t03",
          "pmpe-info.c02.t04",
        ]),
      ],
    },
    {
      id: "11",
      items: [
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Pacto de San José da Costa Rica", [
          "pmpe-dh.c02.t02",
        ]),
        item("pmpe-direito-constitucional", "Constitucional", "Direitos sociais", ["pmpe-const.c02.t03"]),
      ],
    },
    {
      id: "12",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Ortografia oficial", ["pmpe-lp.c02.t01"]),
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "ECA: direitos, ato infracional e atuação policial",
          ["pmpe-dh.c03.t01", "pmpe-dh.c03.t02"],
        ),
      ],
    },
    {
      id: "13",
      items: [
        item("pmpe-informatica", "Informática", "Backup: tipos de cópia e restauração", [
          "pmpe-info.c02.t05",
        ]),
        item("pmpe-historia-pe", "História de PE", "Formação de Olinda e Recife", ["pmpe-hist.c01.t03"]),
      ],
    },
    { id: "14", review: ["08", "13"] },
    {
      id: "15",
      items: [
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "ECA: Conselho Tutelar e crimes", [
          "pmpe-dh.c03.t03",
          "pmpe-dh.c03.t04",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Acentuação gráfica", ["pmpe-lp.c02.t02"]),
      ],
    },
    {
      id: "16",
      items: [
        item("pmpe-direito-constitucional", "Constitucional", "Nacionalidade e direitos políticos", [
          "pmpe-const.c02.t04",
          "pmpe-const.c02.t05",
        ]),
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Quantificadores e falácias", [
          "pmpe-rlm.c01.t03",
        ]),
      ],
    },
    {
      id: "17",
      items: [
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Abuso de autoridade (Lei 13.869/2019)",
          ["pmpe-dh.c04.t01"],
        ),
        item("pmpe-lingua-portuguesa", "Português", "Emprego das classes de palavras", ["pmpe-lp.c02.t03"]),
      ],
    },
    {
      id: "18",
      items: [
        item("pmpe-informatica", "Informática", "Hardware e dispositivos", [
          "pmpe-info.c03.t01",
          "pmpe-info.c03.t02",
        ]),
        item(
          "pmpe-direito-constitucional",
          "Constitucional",
          "Organização político-administrativa e competências",
          ["pmpe-const.c03.t01", "pmpe-const.c03.t02"],
        ),
      ],
    },
    {
      id: "19",
      items: [
        item("pmpe-historia-pe", "História de PE", "A presença holandesa e o governo de Maurício de Nassau", [
          "pmpe-hist.c01.t04",
        ]),
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Tortura (Lei 9.455/1997)", [
          "pmpe-dh.c04.t02",
        ]),
      ],
    },
    {
      id: "20",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Processos de formação de palavras", ["pmpe-lp.c02.t04"]),
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Argumentos válidos", ["pmpe-rlm.c02.t01"]),
      ],
    },
    { id: "21", review: ["15", "20"] },
    {
      id: "22",
      items: [
        item("pmpe-informatica", "Informática", "Arquivos, pastas e programas", ["pmpe-info.c05.t02"]),
        item("pmpe-direito-constitucional", "Constitucional", "Administração Pública (art. 37)", [
          "pmpe-const.c03.t03",
        ]),
      ],
    },
    {
      id: "23",
      items: [
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Maria da Penha (Lei 11.340/2006)", [
          "pmpe-dh.c05.t01",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Sintaxe da oração e do período", [
          "pmpe-lp.c03.t01",
          "pmpe-lp.c03.t02",
        ]),
      ],
    },
    {
      id: "24",
      items: [
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Crimes de preconceito (Lei 7.716/1989)",
          ["pmpe-dh.c05.t02"],
        ),
        item("pmpe-historia-pe", "História de PE", "Resistência: quilombos e Insurreição Pernambucana", [
          "pmpe-hist.c01.t05",
        ]),
      ],
    },
    {
      id: "25",
      items: [
        item(
          "pmpe-direito-constitucional",
          "Constitucional",
          "Servidores e militares dos Estados (art. 42)",
          ["pmpe-const.c03.t04"],
        ),
        item("pmpe-informatica", "Informática", "Windows 11", ["pmpe-info.c03.t03", "pmpe-info.c03.t04"]),
      ],
    },
    {
      id: "26",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Relações semânticas entre orações", ["pmpe-lp.c03.t03"]),
        item("pmpe-crimes-ambientais", "Crimes Ambientais", "Crimes ambientais: parte geral, fauna e flora", [
          "pmpe-leis.c01.t01",
          "pmpe-leis.c01.t02",
          "pmpe-leis.c01.t03",
        ]),
      ],
    },
    {
      id: "27",
      items: [
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Inferências, deduções e sequências", [
          "pmpe-rlm.c02.t02",
          "pmpe-rlm.c02.t03",
        ]),
        item("pmpe-direito-constitucional", "Constitucional", "Poder Legislativo", ["pmpe-const.c04.t01"]),
      ],
    },
    { id: "28", review: ["22", "27"] },
    {
      id: "29",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Funções do “que” e do “se”", ["pmpe-lp.c03.t04"]),
        item(
          "pmpe-crimes-ambientais",
          "Crimes Ambientais",
          "Crimes ambientais: poluição, patrimônio e infrações",
          ["pmpe-leis.c01.t04", "pmpe-leis.c01.t05", "pmpe-leis.c01.t06"],
        ),
      ],
    },
    {
      id: "30",
      items: [
        item("pmpe-informatica", "Informática", "Configurações, atalhos e Prompt de Comando", [
          "pmpe-info.c05.t03",
        ]),
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Movimentos emancipacionistas: Mascates, 1817, 1824, Cabanos e Praieira",
          ["pmpe-hist.c01.t06"],
        ),
      ],
    },
    {
      id: "31",
      items: [
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Crimes hediondos (Lei 8.072/1990)", [
          "pmpe-dh.c06.t01",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Concordância nominal e verbal", ["pmpe-lp.c03.t05"]),
      ],
    },
    {
      id: "32",
      items: [
        item("pmpe-direito-constitucional", "Constitucional", "Poder Executivo", ["pmpe-const.c04.t02"]),
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Diagramas lógicos e conjuntos", [
          "pmpe-rlm.c03.t01",
          "pmpe-rlm.c03.t02",
        ]),
      ],
    },
    {
      id: "33",
      items: [
        item("pmpe-informatica", "Informática", "Word", ["pmpe-info.c04.t01"]),
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Lei de Drogas (Lei 11.343/2006)", [
          "pmpe-dh.c06.t02",
        ]),
      ],
    },
    {
      id: "34",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Regência nominal e verbal", ["pmpe-lp.c04.t01"]),
        item("pmpe-historia-pe", "História de PE", "Pernambuco no período republicano", [
          "pmpe-hist.c02.t01",
          "pmpe-hist.c02.t02",
          "pmpe-hist.c02.t03",
        ]),
      ],
    },
    { id: "35", review: ["29", "34"] },
    {
      id: "36",
      items: [
        item("pmpe-direito-constitucional", "Constitucional", "Poder Judiciário", ["pmpe-const.c04.t03"]),
        item("pmpe-estatuto", "Estatuto da PMPE", "Estatuto da PMPE: generalidades, deveres e violações", [
          "pmpe-est.c01.t01",
          "pmpe-est.c01.t02",
          "pmpe-est.c01.t03",
        ]),
      ],
    },
    {
      id: "37",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Crase", ["pmpe-lp.c04.t02"]),
        item("pmpe-informatica", "Informática", "Excel", ["pmpe-info.c04.t02"]),
      ],
    },
    {
      id: "38",
      items: [
        item("pmpe-estatuto", "Estatuto da PMPE", "Estatuto da PMPE: direitos e prerrogativas", [
          "pmpe-est.c01.t04",
          "pmpe-est.c01.t05",
        ]),
        item("pmpe-direito-constitucional", "Constitucional", "Funções essenciais à Justiça", [
          "pmpe-const.c04.t04",
        ]),
      ],
    },
    {
      id: "39",
      items: [
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Princípio da contagem e análise combinatória", [
          "pmpe-rlm.c04.t01",
          "pmpe-rlm.c04.t02",
        ]),
        item("pmpe-lingua-portuguesa", "Português", "Colocação pronominal", ["pmpe-lp.c04.t03"]),
      ],
    },
    {
      id: "40",
      items: [
        item("pmpe-historia-pe", "História de PE", "Cultura popular: frevo, maracatu, culinária e festas", [
          "pmpe-hist.c01.t07",
        ]),
        item(
          "pmpe-estatuto",
          "Estatuto da PMPE",
          "Estatuto da PMPE: situações especiais, desligamento e tempo de serviço",
          ["pmpe-est.c01.t06", "pmpe-est.c01.t07", "pmpe-est.c01.t08"],
        ),
      ],
    },
    {
      id: "41",
      items: [
        item("pmpe-informatica", "Informática", "PowerPoint e Impress", ["pmpe-info.c05.t04"]),
        item(
          "pmpe-direito-constitucional",
          "Constitucional",
          "Estados de defesa e de sítio e Forças Armadas",
          ["pmpe-const.c05.t01", "pmpe-const.c05.t02"],
        ),
      ],
    },
    { id: "42", review: ["36", "41"] },
    {
      id: "43",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Pontuação", ["pmpe-lp.c04.t04"]),
        item("pmpe-direitos-humanos-legislacao", "Dir. Humanos e Leis", "Estatuto da Pessoa Idosa", [
          "pmpe-dh.c07.t01",
        ]),
      ],
    },
    {
      id: "44",
      items: [
        item("pmpe-lingua-portuguesa", "Português", "Mecanismos de coesão textual", ["pmpe-lp.c04.t05"]),
        item("pmpe-raciocinio-logico", "Raciocínio Lógico", "Probabilidade", ["pmpe-rlm.c04.t03"]),
      ],
    },
    {
      id: "45",
      items: [
        item("pmpe-informatica", "Informática", "LibreOffice Writer, Calc e Impress", [
          "pmpe-info.c04.t03",
          "pmpe-info.c04.t04",
          "pmpe-info.c04.t05",
        ]),
        item("pmpe-direito-constitucional", "Constitucional", "Segurança pública (art. 144)", [
          "pmpe-const.c05.t03",
        ]),
      ],
    },
    {
      id: "46",
      items: [
        item(
          "pmpe-direitos-humanos-legislacao",
          "Dir. Humanos e Leis",
          "Estatuto da Juventude (Lei 12.852/2013)",
          ["pmpe-dh.c07.t02"],
        ),
        item("pmpe-historia-pe", "História de PE", "Aspectos afro-brasileiros em Pernambuco", [
          "pmpe-hist.c01.t08",
        ]),
      ],
    },
    { id: "47", review: ["43", "46"] },
  ],
};
