import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da PMPE (Soldado), montado a partir do edital verticalizado.
 * Usa as apostilas da PMPE (História de PE, Estatuto, Informática, Português e Crimes Ambientais, tiradas
 * dos PDFs do curso) e as da PC-RN e da PRF. Os poucos assuntos sem PDF no curso entram como itens de
 * "marcar como feito", com aviso.
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
  note: "Plano montado a partir do edital da PMPE, com as apostilas da PMPE, da PC-RN e da PRF. Onde o curso não tem PDF (alguns assuntos de Português, Pernambuco republicano, Estatuto da Juventude), o item pede para estudar pela videoaula e marcar como feito.",
  metas: [
    {
      id: "01",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Teoria geral e características dos direitos humanos",
          ["prf-dh.c02.t01", "prf-dh.c02.t02", "prf-dh.c02.t03"],
        ),
        item("pcrn-portugues", "Português", "Compreensão e interpretação de textos", ["pcrn-port.c01.t01"]),
      ],
    },
    {
      id: "02",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Princípios fundamentais", [
          "pcrn-const.c01.t01",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Proposições e conectivos", [
          "pcrn-rlm.c01.t01",
          "pcrn-rlm.c01.t02",
          "pcrn-rlm.c01.t03",
          "pcrn-rlm.c01.t04",
        ]),
      ],
    },
    {
      id: "03",
      items: [
        item(
          "pcrn-informatica",
          "Informática",
          "Internet, intranet e navegadores",
          ["pmpe-info.c01.t01", "pmpe-info.c01.t02"],
          "Computação em nuvem não tem PDF no curso: complete pela videoaula.",
        ),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Evolução histórica e gerações de direitos", [
          "prf-dh.c01.t01",
          "prf-dh.c01.t02",
          "prf-dh.c01.t03",
          "prf-dh.c01.t04",
          "prf-dh.c01.t05",
          "prf-dh.c01.t06",
        ]),
      ],
    },
    {
      id: "04",
      items: [
        item("pmpe-historia-pe", "História de PE", "Ocupação, colonização, Capitanias e Duarte Coelho", [
          "pmpe-hist.c01.t01",
        ]),
        item(
          "pcrn-portugues",
          "Português",
          "Tipologias e gêneros textuais",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "05",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Direitos e deveres individuais e coletivos", [
          "pcrn-const.c02.t01",
        ]),
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Direitos humanos na CF e incorporação dos tratados",
          ["prf-dh.c03.t01", "prf-dh.c03.t02", "prf-dh.c03.t03", "prf-dh.c03.t04", "prf-dh.c03.t05"],
        ),
      ],
    },
    {
      id: "06",
      items: [
        item(
          "pcrn-portugues",
          "Português",
          "Figuras de linguagem",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tabela-verdade", [
          "pcrn-rlm.c02.t01",
          "pcrn-rlm.c02.t02",
          "pcrn-rlm.c02.t03",
        ]),
      ],
    },
    { id: "07", review: ["01", "06"] },
    {
      id: "08",
      items: [
        item("pcrn-informatica", "Informática", "Segurança da informação e malwares", [
          "pmpe-info.c02.t01",
          "pmpe-info.c02.t02",
          "pmpe-info.c02.t03",
          "pmpe-info.c02.t04",
        ]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Declaração Universal dos Direitos Humanos", [
          "prf-dh.c04.t01",
          "prf-dh.c04.t02",
          "prf-dh.c04.t03",
          "prf-dh.c04.t04",
          "prf-dh.c04.t05",
          "prf-dh.c04.t06",
          "prf-dh.c04.t07",
        ]),
      ],
    },
    {
      id: "09",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Remédios constitucionais", [
          "pcrn-const.c02.t02",
        ]),
        item("pmpe-historia-pe", "História de PE", "A importância do açúcar para a economia local", [
          "pmpe-hist.c01.t02",
        ]),
      ],
    },
    {
      id: "10",
      items: [
        item("pcrn-portugues", "Português", "Acentuação gráfica", ["pcrn-port.c01.t02"]),
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Pacto de São José: direitos e deveres (arts. 1 a 32)",
          [
            "prf-dh.c05.t01",
            "prf-dh.c05.t02",
            "prf-dh.c05.t03",
            "prf-dh.c05.t04",
            "prf-dh.c05.t05",
            "prf-dh.c05.t06",
            "prf-dh.c05.t07",
            "prf-dh.c05.t08",
            "prf-dh.c05.t09",
            "prf-dh.c05.t10",
          ],
        ),
      ],
    },
    {
      id: "11",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Direitos sociais", ["pcrn-const.c02.t03"]),
        item(
          "pcrn-portugues",
          "Português",
          "Ortografia oficial",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "12",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tautologia, contradição e contingência", [
          "pcrn-rlm.c02.t04",
          "pcrn-rlm.c02.t05",
        ]),
        item("pcrn-informatica", "Informática", "Hardware e dispositivos", [
          "pmpe-info.c03.t01",
          "pmpe-info.c03.t02",
        ]),
      ],
    },
    {
      id: "13",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Pacto de São José: Comissão e Corte (arts. 33 a 82)",
          [
            "prf-dh.c05.t11",
            "prf-dh.c05.t12",
            "prf-dh.c05.t13",
            "prf-dh.c05.t14",
            "prf-dh.c05.t15",
            "prf-dh.c05.t16",
            "prf-dh.c05.t17",
            "prf-dh.c05.t18",
          ],
        ),
        item("pmpe-historia-pe", "História de PE", "Formação de Olinda e Recife", ["pmpe-hist.c01.t03"]),
      ],
    },
    { id: "14", review: ["08", "13"] },
    {
      id: "15",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Estatuto da Criança e do Adolescente", [
          "pcrn-lex.c03.t02",
        ]),
        item("pcrn-portugues", "Português", "Classes de palavras", ["pcrn-port.c02.t01"]),
      ],
    },
    {
      id: "16",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Nacionalidade e direitos políticos", [
          "pcrn-const.c02.t04",
          "pcrn-const.c02.t05",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Equivalências lógicas", [
          "pcrn-rlm.c03.t01",
          "pcrn-rlm.c03.t02",
        ]),
      ],
    },
    {
      id: "17",
      items: [
        item("pcrn-informatica", "Informática", "Software, arquivos e pastas", ["pcrn-info.c01.t02"]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Abuso de autoridade (Lei 13.869/2019)", [
          "pcrn-lex.c04.t01",
        ]),
      ],
    },
    {
      id: "18",
      items: [
        item("pcrn-portugues", "Português", "Processos de formação de palavras", ["pcrn-port.c02.t02"]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Organização político-administrativa e competências",
          ["pcrn-const.c03.t01"],
        ),
      ],
    },
    {
      id: "19",
      items: [
        item("pmpe-historia-pe", "História de PE", "A presença holandesa e o governo de Maurício de Nassau", [
          "pmpe-hist.c01.t04",
        ]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Tortura (Lei 9.455/1997)", ["pcrn-lex.c01.t02"]),
      ],
    },
    {
      id: "20",
      items: [
        item(
          "pcrn-portugues",
          "Português",
          "Significação das palavras e variação linguística",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Negações dos conectivos", [
          "pcrn-rlm.c03.t03",
          "pcrn-rlm.c03.t04",
        ]),
      ],
    },
    { id: "21", review: ["15", "20"] },
    {
      id: "22",
      items: [
        item(
          "pcrn-informatica",
          "Informática",
          "Windows 11",
          ["pmpe-info.c03.t03", "pmpe-info.c03.t04"],
          "O Prompt de Comando não está no PDF do curso: complete pela videoaula.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Administração Pública e servidores", [
          "pcrn-const.c03.t02",
        ]),
      ],
    },
    {
      id: "23",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Maria da Penha (Lei 11.340/2006)", [
          "pcrn-lex.c03.t01",
        ]),
        item("pcrn-portugues", "Português", "Sintaxe da oração e do período", ["pcrn-port.c03.t01"]),
      ],
    },
    {
      id: "24",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Racismo (Lei 7.716/1989)", ["pcrn-lex.c03.t05"]),
        item("pmpe-historia-pe", "História de PE", "Resistência: quilombos e Insurreição Pernambucana", [
          "pmpe-hist.c01.t05",
        ]),
      ],
    },
    {
      id: "25",
      items: [
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Militares dos Estados (art. 42) e polícias estaduais",
          ["prf-const.c10.t04"],
        ),
        item("pcrn-portugues", "Português", "Funções do “que”", ["pmpe-port.c01.t03", "pmpe-port.c01.t04"]),
      ],
    },
    {
      id: "26",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Quantificadores e suas negações", [
          "pcrn-rlm.c03.t05",
          "pcrn-rlm.c03.t06",
        ]),
        item("pcrn-informatica", "Informática", "Word", ["pcrn-info.c02.t02", "pmpe-info.c04.t01"]),
      ],
    },
    {
      id: "27",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Crimes ambientais: parte geral, fauna e flora", [
          "pmpe-leis.c01.t01",
          "pmpe-leis.c01.t02",
          "pmpe-leis.c01.t03",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Legislativo", [
          "pcrn-const.c04.t01",
          "pcrn-const.c04.t02",
        ]),
      ],
    },
    { id: "28", review: ["22", "27"] },
    {
      id: "29",
      items: [
        item("pcrn-portugues", "Português", "Funções do “se”", ["pmpe-port.c01.t05", "pmpe-port.c01.t06"]),
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Crimes ambientais: poluição, patrimônio e infrações",
          ["pmpe-leis.c01.t04", "pmpe-leis.c01.t05", "pmpe-leis.c01.t06"],
        ),
      ],
    },
    {
      id: "30",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Movimentos emancipacionistas: Mascates, 1817, 1824, Cabanos e Praieira",
          ["pmpe-hist.c01.t06"],
        ),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Argumentação e diagramas lógicos", [
          "pcrn-rlm.c04.t01",
          "pcrn-rlm.c04.t02",
          "pcrn-rlm.c04.t03",
          "pcrn-rlm.c04.t04",
          "pcrn-rlm.c04.t05",
        ]),
      ],
    },
    {
      id: "31",
      items: [
        item("pcrn-informatica", "Informática", "Excel", ["pmpe-info.c04.t02", "pcrn-info.c02.t03"]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Crimes hediondos (Lei 8.072/1990)", [
          "pcrn-lex.c01.t01",
        ]),
      ],
    },
    {
      id: "32",
      items: [
        item(
          "pcrn-portugues",
          "Português",
          "Relações semânticas e mecanismos de coesão",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Executivo", ["pcrn-const.c04.t03"]),
      ],
    },
    {
      id: "33",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Lei de Drogas (Lei 11.343/2006)", [
          "pcrn-lex.c02.t01",
        ]),
        item("pcrn-portugues", "Português", "Pontuação", ["pcrn-port.c03.t05"]),
      ],
    },
    {
      id: "34",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Pernambuco no período republicano",
          [],
          "O PDF do curso não traz esse assunto: estude pelas aulas 14 e 15 do módulo de História de PE e marque como feito.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Judiciário", ["pcrn-const.c04.t04"]),
      ],
    },
    { id: "35", review: ["29", "34"] },
    {
      id: "36",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Princípio da contagem, fatorial e arranjo", [
          "pcrn-rlm.c05.t01",
          "pcrn-rlm.c05.t02",
          "pcrn-rlm.c05.t03",
        ]),
        item("pcrn-informatica", "Informática", "PowerPoint", ["pcrn-info.c02.t04"]),
      ],
    },
    {
      id: "37",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Estatuto da PMPE: generalidades, deveres e violações",
          ["pmpe-est.c01.t01", "pmpe-est.c01.t02", "pmpe-est.c01.t03"],
        ),
        item("pcrn-portugues", "Português", "Concordância nominal e verbal", ["pcrn-port.c03.t02"]),
      ],
    },
    {
      id: "38",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Estatuto da PMPE: direitos e prerrogativas", [
          "pmpe-est.c01.t04",
          "pmpe-est.c01.t05",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Funções essenciais à Justiça", [
          "pcrn-const.c04.t05",
        ]),
      ],
    },
    {
      id: "39",
      items: [
        item("pcrn-portugues", "Português", "Regência nominal e verbal", [
          "pmpe-port.c01.t01",
          "pmpe-port.c01.t02",
        ]),
        item("pmpe-historia-pe", "História de PE", "Cultura popular: frevo, maracatu, culinária e festas", [
          "pmpe-hist.c01.t07",
        ]),
      ],
    },
    {
      id: "40",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Combinação e permutação", [
          "pcrn-rlm.c05.t04",
          "pcrn-rlm.c05.t05",
          "pcrn-rlm.c05.t06",
        ]),
        item("pcrn-informatica", "Informática", "Backup: tipos de cópia e restauração", [
          "pmpe-info.c02.t05",
        ]),
      ],
    },
    {
      id: "41",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Estatuto da PMPE: situações especiais, desligamento e tempo de serviço",
          ["pmpe-est.c01.t06", "pmpe-est.c01.t07", "pmpe-est.c01.t08"],
        ),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Defesa do Estado: estados de exceção e Forças Armadas",
          ["prf-const.c02.t05", "prf-const.c09.t01", "prf-const.c09.t02", "prf-const.c08.t08"],
        ),
      ],
    },
    { id: "42", review: ["36", "41"] },
    {
      id: "43",
      items: [
        item("pcrn-portugues", "Português", "Crase", ["pcrn-port.c03.t04"]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Estatuto da Pessoa Idosa", ["pcrn-lex.c03.t03"]),
      ],
    },
    {
      id: "44",
      items: [
        item("pcrn-portugues", "Português", "Colocação pronominal", ["pcrn-port.c03.t03"]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Probabilidade", [
          "pcrn-rlm.c06.t01",
          "pcrn-rlm.c06.t02",
          "pcrn-rlm.c06.t03",
        ]),
      ],
    },
    {
      id: "45",
      items: [
        item("pcrn-informatica", "Informática", "LibreOffice: Writer, Calc e Impress", [
          "pmpe-info.c04.t03",
          "pmpe-info.c04.t04",
          "pmpe-info.c04.t05",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Segurança pública (art. 144)", [
          "pcrn-const.c05.t01",
          "prf-const.c10.t01",
        ]),
      ],
    },
    {
      id: "46",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Estatuto da Juventude (Lei 12.852/2013)",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pmpe-historia-pe", "História de PE", "Aspectos afro-brasileiros em Pernambuco", [
          "pmpe-hist.c01.t08",
        ]),
      ],
    },
    { id: "47", review: ["43", "46"] },
  ],
};
