import type { Plan, PlanItem } from "./model";

/**
 * Plano de metas da PMPE (Soldado), montado a partir do edital verticalizado.
 * Usa as apostilas que já estão na Biblioteca (PC-RN e PRF). Os assuntos do edital que ainda não têm
 * apostila entram como itens de "marcar como feito", com o aviso de estudar pelo material próprio.
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
  source: "Edital verticalizado PMPE (Soldado), com as apostilas da Biblioteca",
  note: "Plano montado a partir do edital da PMPE. Onde a Biblioteca ainda não tem apostila (História de Pernambuco e alguns assuntos de Português, Informática e Leis), o item pede para você estudar pelo seu material e marcar como feito.",
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
          "Internet, intranet, navegadores e computação em nuvem",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
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
        item(
          "pcrn-portugues",
          "Português",
          "Tipologias e gêneros textuais",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Ocupação e colonização: primeiros contatos, Capitanias Hereditárias e Duarte Coelho",
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
        item("pcrn-informatica", "Informática", "Segurança da informação", ["pcrn-info.c03.t01"]),
        item("pcrn-direito-constitucional", "Constitucional", "Remédios constitucionais", [
          "pcrn-const.c02.t02",
        ]),
      ],
    },
    {
      id: "09",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Declaração Universal dos Direitos Humanos", [
          "prf-dh.c04.t01",
          "prf-dh.c04.t02",
          "prf-dh.c04.t03",
          "prf-dh.c04.t04",
          "prf-dh.c04.t05",
          "prf-dh.c04.t06",
          "prf-dh.c04.t07",
        ]),
        item("pcrn-portugues", "Português", "Acentuação gráfica", ["pcrn-port.c01.t02"]),
      ],
    },
    {
      id: "10",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "A importância do açúcar para a economia local",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Direitos sociais", ["pcrn-const.c02.t03"]),
      ],
    },
    {
      id: "11",
      items: [
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
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Tautologia, contradição e contingência", [
          "pcrn-rlm.c02.t04",
          "pcrn-rlm.c02.t05",
        ]),
      ],
    },
    {
      id: "12",
      items: [
        item("pcrn-informatica", "Informática", "Organização de computadores e armazenamento", [
          "pcrn-info.c01.t01",
        ]),
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
        item("pcrn-direito-constitucional", "Constitucional", "Nacionalidade e direitos políticos", [
          "pcrn-const.c02.t04",
          "pcrn-const.c02.t05",
        ]),
      ],
    },
    { id: "14", review: ["08", "13"] },
    {
      id: "15",
      items: [
        item("pcrn-portugues", "Português", "Classes de palavras", ["pcrn-port.c02.t01"]),
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Formação de Olinda e Recife",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "16",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Equivalências lógicas", [
          "pcrn-rlm.c03.t01",
          "pcrn-rlm.c03.t02",
        ]),
        item("pcrn-informatica", "Informática", "Software, arquivos e pastas", ["pcrn-info.c01.t02"]),
      ],
    },
    {
      id: "17",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Estatuto da Criança e do Adolescente", [
          "pcrn-lex.c03.t02",
        ]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Organização político-administrativa e competências",
          ["pcrn-const.c03.t01"],
        ),
      ],
    },
    {
      id: "18",
      items: [
        item("pcrn-portugues", "Português", "Processos de formação de palavras", ["pcrn-port.c02.t02"]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Abuso de autoridade (Lei 13.869/2019)", [
          "pcrn-lex.c04.t01",
        ]),
      ],
    },
    {
      id: "19",
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
    {
      id: "20",
      items: [
        item(
          "pcrn-informatica",
          "Informática",
          "Windows",
          ["pcrn-info.c02.t01"],
          "A apostila é do Windows 10; o edital cobra o Windows 11 e o Prompt de Comando. Complete as diferenças pelo seu material.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Administração Pública e servidores", [
          "pcrn-const.c03.t02",
        ]),
      ],
    },
    { id: "21", review: ["15", "20"] },
    {
      id: "22",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "A presença holandesa e o governo de Maurício de Nassau",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Tortura (Lei 9.455/1997)", ["pcrn-lex.c01.t02"]),
      ],
    },
    {
      id: "23",
      items: [
        item("pcrn-portugues", "Português", "Sintaxe da oração e do período", ["pcrn-port.c03.t01"]),
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Militares dos Estados (art. 42) e polícias estaduais",
          ["prf-const.c10.t04"],
        ),
      ],
    },
    {
      id: "24",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Maria da Penha (Lei 11.340/2006)", [
          "pcrn-lex.c03.t01",
        ]),
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Quantificadores e suas negações", [
          "pcrn-rlm.c03.t05",
          "pcrn-rlm.c03.t06",
        ]),
      ],
    },
    {
      id: "25",
      items: [
        item("pcrn-informatica", "Informática", "Word", ["pcrn-info.c02.t02"]),
        item(
          "pcrn-portugues",
          "Português",
          "Funções do “que” e do “se”",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "26",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Movimentos de resistência e emancipacionistas (Quilombos, Insurreição Pernambucana e outros)",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Legislativo", [
          "pcrn-const.c04.t01",
          "pcrn-const.c04.t02",
        ]),
      ],
    },
    {
      id: "27",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Racismo (Lei 7.716/1989)", ["pcrn-lex.c03.t05"]),
        item(
          "pcrn-portugues",
          "Português",
          "Relações semânticas e mecanismos de coesão",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    { id: "28", review: ["22", "27"] },
    {
      id: "29",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Argumentação e diagramas lógicos", [
          "pcrn-rlm.c04.t01",
          "pcrn-rlm.c04.t02",
          "pcrn-rlm.c04.t03",
          "pcrn-rlm.c04.t04",
          "pcrn-rlm.c04.t05",
        ]),
        item("pcrn-informatica", "Informática", "Excel", ["pcrn-info.c02.t03"]),
      ],
    },
    {
      id: "30",
      items: [
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Crimes ambientais (Lei 9.605/1998)",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Executivo", ["pcrn-const.c04.t03"]),
      ],
    },
    {
      id: "31",
      items: [
        item("pcrn-portugues", "Português", "Pontuação", ["pcrn-port.c03.t05"]),
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Pernambuco no período republicano",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "32",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Crimes hediondos (Lei 8.072/1990)", [
          "pcrn-lex.c01.t01",
        ]),
        item("pcrn-direito-constitucional", "Constitucional", "Poder Judiciário", ["pcrn-const.c04.t04"]),
      ],
    },
    {
      id: "33",
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
      id: "34",
      items: [
        item("pcrn-portugues", "Português", "Concordância nominal e verbal", ["pcrn-port.c03.t02"]),
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Lei de Drogas (Lei 11.343/2006)", [
          "pcrn-lex.c02.t01",
        ]),
      ],
    },
    { id: "35", review: ["29", "34"] },
    {
      id: "36",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Funções essenciais à Justiça", [
          "pcrn-const.c04.t05",
        ]),
        item(
          "pcrn-portugues",
          "Português",
          "Regência nominal e verbal",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "37",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Cultura popular: frevo, maracatu, culinária e festas",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Estatuto dos Policiais Militares de PE (Lei 6.783/1974)",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "38",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Combinação e permutação", [
          "pcrn-rlm.c05.t04",
          "pcrn-rlm.c05.t05",
          "pcrn-rlm.c05.t06",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "Backup: tipos de cópia e restauração",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "39",
      items: [
        item(
          "pcrn-direito-constitucional",
          "Constitucional",
          "Defesa do Estado: estados de exceção e Forças Armadas",
          ["prf-const.c02.t05", "prf-const.c09.t01", "prf-const.c09.t02", "prf-const.c08.t08"],
        ),
        item("pcrn-portugues", "Português", "Crase", ["pcrn-port.c03.t04"]),
      ],
    },
    {
      id: "40",
      items: [
        item("prf-direitos-humanos", "Dir. Humanos e Leis", "Estatuto da Pessoa Idosa", ["pcrn-lex.c03.t03"]),
        item("pcrn-portugues", "Português", "Colocação pronominal", ["pcrn-port.c03.t03"]),
      ],
    },
    {
      id: "41",
      items: [
        item("pcrn-raciocinio-logico", "Raciocínio Lógico", "Probabilidade", [
          "pcrn-rlm.c06.t01",
          "pcrn-rlm.c06.t02",
          "pcrn-rlm.c06.t03",
        ]),
        item(
          "pcrn-informatica",
          "Informática",
          "LibreOffice: Writer, Calc e Impress",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    { id: "42", review: ["36", "41"] },
    {
      id: "43",
      items: [
        item("pcrn-direito-constitucional", "Constitucional", "Segurança pública (art. 144)", [
          "pcrn-const.c05.t01",
          "prf-const.c10.t01",
        ]),
        item(
          "prf-direitos-humanos",
          "Dir. Humanos e Leis",
          "Estatuto da Juventude (Lei 12.852/2013)",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    {
      id: "44",
      items: [
        item(
          "pmpe-historia-pe",
          "História de PE",
          "Aspectos afro-brasileiros em Pernambuco",
          [],
          "Sem apostila no app ainda: estude pelo seu material e marque como feito.",
        ),
      ],
    },
    { id: "45", review: ["43", "44"] },
  ],
};
