/**
 * Café com Lei: uma dose curta de lei seca por dia, com os pontos que mais caem e três itens de
 * certo ou errado para fixar. Conteúdo próprio do Missão Alpha (resumos e questões originais),
 * com a referência de cada dispositivo para conferir no texto oficial.
 */
export type CafePoint = { ref: string; text: string; trap?: string };
export type CafeQuestion = { statement: string; answer: boolean; explain: string };
export type CafeDay = {
  id: string;
  title: string;
  law: string;
  /** Tópico da Biblioteca para aprofundar (apostila da PMPE). */
  topic?: { disciplineId: string; topicId: string };
  points: CafePoint[];
  questions: CafeQuestion[];
};

const C = "pmpe-direito-constitucional";
const H = "pmpe-direitos-humanos-legislacao";

export const CAFE_DAYS: CafeDay[] = [
  {
    id: "01",
    title: "Princípios fundamentais",
    law: "Constituição Federal, arts. 1º a 4º",
    topic: { disciplineId: C, topicId: "pmpe-const.c01.t01" },
    points: [
      {
        ref: "Art. 1º",
        text: "Cinco fundamentos: soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, pluralismo político.",
        trap: "Pluralismo político é mais amplo que pluripartidarismo.",
      },
      {
        ref: "Art. 1º, parágrafo único",
        text: "Todo o poder emana do povo, exercido por representantes eleitos ou diretamente.",
      },
      {
        ref: "Art. 2º",
        text: "Legislativo, Executivo e Judiciário são independentes e harmônicos entre si.",
      },
      {
        ref: "Art. 3º",
        text: "Objetivos começam com verbo: construir, garantir, erradicar a pobreza e reduzir as desigualdades, promover o bem de todos.",
        trap: "Erradicar a pobreza, mas só reduzir as desigualdades.",
      },
      {
        ref: "Art. 4º",
        text: "Relações internacionais: inclui prevalência dos direitos humanos, repúdio ao terrorismo e ao racismo e concessão de asilo político.",
      },
    ],
    questions: [
      {
        statement:
          "Garantir o desenvolvimento nacional é um dos fundamentos da República Federativa do Brasil.",
        answer: false,
        explain:
          "É um objetivo fundamental (art. 3º, II). Objetivos começam com verbo; fundamentos são substantivos.",
      },
      {
        statement: "A Constituição tem como objetivo erradicar as desigualdades sociais e regionais.",
        answer: false,
        explain:
          "O texto manda erradicar a pobreza e a marginalização e reduzir as desigualdades (art. 3º, III).",
      },
      {
        statement:
          "A concessão de asilo político é princípio que rege o Brasil em suas relações internacionais.",
        answer: true,
        explain: "Está no art. 4º, X.",
      },
    ],
  },
  {
    id: "02",
    title: "Direitos individuais na abordagem policial",
    law: "Constituição Federal, art. 5º",
    topic: { disciplineId: C, topicId: "pmpe-const.c02.t01" },
    points: [
      {
        ref: "Art. 5º, XI",
        text: "Sem consentimento do morador, entra-se na casa em flagrante delito, desastre, para prestar socorro ou, durante o dia, por ordem judicial.",
        trap: "Ordem judicial só durante o dia; flagrante, a qualquer hora.",
      },
      {
        ref: "Art. 5º, XVI",
        text: "Reunião pacífica, sem armas, em local aberto ao público, não depende de autorização; basta aviso prévio à autoridade.",
      },
      {
        ref: "Art. 5º, LXI",
        text: "Prisão só em flagrante ou por ordem escrita e fundamentada do juiz, salvo transgressão militar ou crime propriamente militar.",
      },
      {
        ref: "Art. 5º, LXIII e LXIV",
        text: "O preso deve ser informado de seus direitos, inclusive o de ficar calado, e tem direito de saber quem o prendeu ou interrogou.",
      },
      {
        ref: "Art. 5º, XLII a XLIV",
        text: "Racismo e ação de grupos armados contra a ordem constitucional são imprescritíveis. Tortura, tráfico, terrorismo e hediondos são inafiançáveis e sem graça ou anistia.",
        trap: "TTTH prescrevem; só racismo e grupos armados são imprescritíveis.",
      },
    ],
    questions: [
      {
        statement:
          "Em caso de flagrante delito, o policial pode ingressar na casa sem consentimento do morador mesmo durante a noite.",
        answer: true,
        explain:
          "Flagrante, desastre e socorro autorizam a entrada a qualquer hora (art. 5º, XI). Só a ordem judicial é restrita ao dia.",
      },
      {
        statement: "O crime de tortura é imprescritível, segundo a Constituição.",
        answer: false,
        explain:
          "Tortura é inafiançável e insuscetível de graça ou anistia, mas prescreve. Imprescritíveis são racismo e ação de grupos armados.",
      },
      {
        statement:
          "A reunião pacífica em local aberto ao público depende de autorização prévia da autoridade competente.",
        answer: false,
        explain: "Não depende de autorização; exige apenas aviso prévio (art. 5º, XVI).",
      },
    ],
  },
  {
    id: "03",
    title: "Remédios constitucionais",
    law: "Constituição Federal, art. 5º, LXVIII a LXXIII",
    topic: { disciplineId: C, topicId: "pmpe-const.c02.t02" },
    points: [
      {
        ref: "LXVIII",
        text: "Habeas corpus protege a liberdade de locomoção; qualquer pessoa pode impetrar, sem advogado.",
      },
      {
        ref: "Art. 142, § 2º",
        text: "Não cabe habeas corpus contra punição disciplinar militar, salvo para discutir a legalidade.",
        trap: "O mérito da punição não é revisto por HC.",
      },
      {
        ref: "LXIX e LXX",
        text: "Mandado de segurança protege direito líquido e certo não amparado por HC ou habeas data.",
      },
      {
        ref: "LXXII",
        text: "Habeas data garante acesso e correção de informações pessoais em bancos de dados públicos.",
      },
      {
        ref: "LXXIII",
        text: "Ação popular só pode ser proposta pelo cidadão, para anular ato lesivo ao patrimônio público, à moralidade, ao meio ambiente ou ao patrimônio histórico.",
      },
    ],
    questions: [
      {
        statement:
          "A ação popular pode ser proposta por qualquer pessoa, inclusive estrangeiro não residente.",
        answer: false,
        explain: "Só o cidadão, isto é, o eleitor, pode propor ação popular.",
      },
      {
        statement: "O habeas corpus pode ser impetrado sem advogado.",
        answer: true,
        explain: "Qualquer pessoa pode impetrar HC, em seu favor ou de outro, sem advogado e sem custas.",
      },
      {
        statement: "O mandado de injunção serve para corrigir dados pessoais em cadastro de órgão público.",
        answer: false,
        explain: "Isso é habeas data. O mandado de injunção combate a falta de norma regulamentadora.",
      },
    ],
  },
  {
    id: "04",
    title: "Administração Pública",
    law: "Constituição Federal, art. 37",
    topic: { disciplineId: C, topicId: "pmpe-const.c03.t03" },
    points: [
      {
        ref: "Caput",
        text: "Princípios: legalidade, impessoalidade, moralidade, publicidade e eficiência (LIMPE).",
      },
      {
        ref: "Incisos II e III",
        text: "Cargo efetivo depende de concurso; validade de até 2 anos, prorrogável uma vez por igual período.",
      },
      {
        ref: "§ 1º",
        text: "Publicidade oficial é educativa e informativa, sem nomes ou imagens que promovam autoridades.",
      },
      {
        ref: "§ 4º",
        text: "Improbidade gera suspensão dos direitos políticos, perda da função, indisponibilidade dos bens e ressarcimento.",
        trap: "Suspensão, e não cassação, dos direitos políticos.",
      },
      {
        ref: "§ 6º",
        text: "O Estado responde objetivamente pelos danos causados por seus agentes, com regresso contra o agente que agiu com dolo ou culpa.",
      },
    ],
    questions: [
      {
        statement:
          "O prazo de validade do concurso público é de até dois anos, prorrogável uma vez por igual período.",
        answer: true,
        explain: "Art. 37, III.",
      },
      {
        statement: "Os atos de improbidade administrativa importam a cassação dos direitos políticos.",
        answer: false,
        explain: "Importam suspensão. A Constituição proíbe a cassação de direitos políticos (art. 15).",
      },
      {
        statement:
          "Para ser indenizada por dano causado por viatura policial em serviço, a vítima precisa provar a culpa do policial.",
        answer: false,
        explain:
          "A responsabilidade do Estado é objetiva (art. 37, § 6º). A culpa só importa na ação regressiva contra o agente.",
      },
    ],
  },
  {
    id: "05",
    title: "Militares dos Estados e Forças Armadas",
    law: "Constituição Federal, arts. 42 e 142",
    topic: { disciplineId: C, topicId: "pmpe-const.c03.t04" },
    points: [
      {
        ref: "Art. 42",
        text: "PMs e Bombeiros Militares, organizados com base na hierarquia e disciplina, são militares dos Estados.",
      },
      { ref: "Art. 42, § 1º", text: "Patentes dos oficiais são conferidas pelos Governadores." },
      { ref: "Art. 142, § 3º, IV", text: "Ao militar são proibidas a sindicalização e a greve." },
      {
        ref: "Art. 142, § 3º, V",
        text: "Enquanto em serviço ativo, o militar não pode estar filiado a partido político.",
      },
      {
        ref: "Art. 14, § 8º",
        text: "Militar candidato: com menos de 10 anos de serviço, afasta-se; com mais de 10, é agregado e, se eleito, vai para a inatividade na diplomação.",
        trap: "A banca inverte as regras dos 10 anos.",
      },
    ],
    questions: [
      {
        statement:
          "As patentes dos oficiais das polícias militares são conferidas pelo Presidente da República.",
        answer: false,
        explain: "São conferidas pelos Governadores (art. 42, § 1º).",
      },
      {
        statement:
          "O militar em serviço ativo pode se filiar a partido político, desde que não exerça cargo de comando.",
        answer: false,
        explain: "Enquanto em serviço ativo, o militar não pode estar filiado a partido político.",
      },
      {
        statement:
          "O militar com mais de dez anos de serviço que se candidata será agregado pela autoridade superior.",
        answer: true,
        explain: "Art. 14, § 8º, II. Se eleito, passa para a inatividade no ato da diplomação.",
      },
    ],
  },
  {
    id: "06",
    title: "Segurança pública",
    law: "Constituição Federal, art. 144",
    topic: { disciplineId: C, topicId: "pmpe-const.c05.t03" },
    points: [
      { ref: "Caput", text: "Segurança pública é dever do Estado, direito e responsabilidade de todos." },
      {
        ref: "§ 5º",
        text: "Polícias militares: polícia ostensiva e preservação da ordem pública. Bombeiros: defesa civil.",
      },
      {
        ref: "§ 4º",
        text: "Polícias civis: polícia judiciária e apuração de infrações penais, exceto as militares.",
        trap: "Investigar crime militar não é da polícia civil.",
      },
      {
        ref: "§ 6º",
        text: "PMs e Bombeiros são forças auxiliares e reserva do Exército e se subordinam aos Governadores.",
      },
      {
        ref: "Inciso VI",
        text: "Polícias penais foram incluídas pela EC 104/2019, para a segurança dos estabelecimentos penais.",
      },
    ],
    questions: [
      {
        statement: "Cabe às polícias militares a polícia ostensiva e a preservação da ordem pública.",
        answer: true,
        explain: "Art. 144, § 5º.",
      },
      {
        statement: "As polícias militares são forças auxiliares e reserva da Marinha.",
        answer: false,
        explain: "São forças auxiliares e reserva do Exército (art. 144, § 6º).",
      },
      {
        statement: "As polícias civis apuram todas as infrações penais, inclusive as militares.",
        answer: false,
        explain: "O § 4º exclui as infrações militares e as de competência da União.",
      },
    ],
  },
  {
    id: "07",
    title: "ECA na atuação policial",
    law: "Lei 8.069/1990",
    topic: { disciplineId: H, topicId: "pmpe-dh.c03.t02" },
    points: [
      { ref: "Art. 2º", text: "Criança: até 12 anos incompletos. Adolescente: de 12 a 18 anos." },
      {
        ref: "Art. 106",
        text: "Adolescente só é apreendido em flagrante de ato infracional ou por ordem escrita e fundamentada do juiz.",
      },
      { ref: "Art. 107", text: "A apreensão é comunicada imediatamente ao juiz e à família." },
      { ref: "Art. 108", text: "Internação provisória: no máximo 45 dias." },
      {
        ref: "Art. 178",
        text: "Proibido transportar adolescente em compartimento fechado de viatura em condições indignas ou de risco.",
        trap: "Não é proibido usar viatura; é proibido o transporte em condições atentatórias.",
      },
    ],
    questions: [
      {
        statement:
          "A criança que pratica ato infracional fica sujeita a medidas socioeducativas, como a internação.",
        answer: false,
        explain: "Criança recebe apenas medidas de proteção. Medidas socioeducativas são para adolescentes.",
      },
      {
        statement: "A internação provisória do adolescente, antes da sentença, não pode passar de 45 dias.",
        answer: true,
        explain: "Art. 108 do ECA.",
      },
      {
        statement: "O Conselho Tutelar é órgão do Poder Judiciário encarregado de julgar atos infracionais.",
        answer: false,
        explain: "É órgão permanente, autônomo e não jurisdicional (art. 131).",
      },
    ],
  },
  {
    id: "08",
    title: "Abuso de autoridade",
    law: "Lei 13.869/2019",
    topic: { disciplineId: H, topicId: "pmpe-dh.c04.t01" },
    points: [
      {
        ref: "Art. 1º, § 1º",
        text: "Exige finalidade de prejudicar alguém, beneficiar a si ou a terceiro, ou mero capricho ou satisfação pessoal.",
      },
      {
        ref: "Art. 1º, § 2º",
        text: "Divergência na interpretação da lei ou na avaliação de provas não é crime.",
      },
      { ref: "Art. 2º", text: "Qualquer agente público, inclusive militar, pode cometer." },
      {
        ref: "Art. 4º",
        text: "Inabilitação e perda do cargo dependem de reincidência e de declaração motivada na sentença.",
        trap: "Não são automáticas, ao contrário da tortura.",
      },
      {
        ref: "Art. 22, § 1º, III",
        text: "Cumprir mandado de busca domiciliar depois das 21h ou antes das 5h é crime.",
      },
    ],
    questions: [
      {
        statement: "A perda do cargo é efeito automático de toda condenação por abuso de autoridade.",
        answer: false,
        explain: "Depende de reincidência e precisa ser declarada motivadamente (art. 4º, parágrafo único).",
      },
      {
        statement: "Os crimes da Lei de Abuso de Autoridade são de ação penal pública incondicionada.",
        answer: true,
        explain: "Art. 3º; cabe ação privada subsidiária se o MP não agir no prazo.",
      },
      {
        statement:
          "Cumprir mandado de busca e apreensão domiciliar às 22h configura, em tese, crime de abuso de autoridade.",
        answer: true,
        explain: "O art. 22, § 1º, III, pune o cumprimento após as 21h ou antes das 5h.",
      },
    ],
  },
  {
    id: "09",
    title: "Tortura",
    law: "Lei 9.455/1997",
    topic: { disciplineId: H, topicId: "pmpe-dh.c04.t02" },
    points: [
      {
        ref: "Art. 1º, I",
        text: "Tortura com violência ou grave ameaça para obter confissão, provocar crime ou por discriminação racial ou religiosa.",
      },
      {
        ref: "Art. 1º, II",
        text: "Tortura-castigo: intenso sofrimento a quem está sob guarda, poder ou autoridade do agente.",
      },
      {
        ref: "Art. 1º, § 2º",
        text: "Quem se omite tendo o dever de evitar ou apurar responde com detenção de 1 a 4 anos.",
        trap: "É a única forma punida com detenção.",
      },
      {
        ref: "Art. 1º, § 4º",
        text: "Aumento de 1/6 a 1/3 se cometida por agente público ou contra criança, gestante, pessoa com deficiência, adolescente ou idoso.",
      },
      {
        ref: "Art. 1º, § 5º",
        text: "A condenação acarreta perda do cargo e interdição pelo dobro do prazo da pena.",
      },
    ],
    questions: [
      {
        statement: "A perda do cargo é efeito automático da condenação por tortura.",
        answer: true,
        explain:
          "O § 5º prevê a perda do cargo e a interdição pelo dobro da pena, sem depender de declaração específica.",
      },
      {
        statement:
          "Quem se omite diante da tortura, tendo o dever de evitá-la, responde pela mesma pena de quem a pratica.",
        answer: false,
        explain: "Responde com detenção de 1 a 4 anos (§ 2º), pena menor que a da tortura.",
      },
      {
        statement:
          "A discriminação por orientação política está entre as finalidades da tortura previstas no art. 1º, I.",
        answer: false,
        explain: "A lei fala em discriminação racial ou religiosa.",
      },
    ],
  },
  {
    id: "10",
    title: "Maria da Penha",
    law: "Lei 11.340/2006",
    topic: { disciplineId: H, topicId: "pmpe-dh.c05.t01" },
    points: [
      {
        ref: "Art. 5º",
        text: "Violência baseada no gênero, na unidade doméstica, na família ou em relação íntima de afeto, mesmo sem coabitação.",
      },
      { ref: "Art. 7º", text: "Cinco formas: física, psicológica, sexual, patrimonial e moral." },
      {
        ref: "Art. 12-C",
        text: "Afastamento imediato do agressor: juiz; delegado, se o Município não for sede de comarca; policial, se também não houver delegado. Comunicação ao juiz em 24 horas.",
      },
      {
        ref: "Art. 24-A",
        text: "Descumprir medida protetiva é crime: reclusão de 2 a 5 anos e multa (Lei 14.994/2024). Só o juiz concede fiança.",
      },
      {
        ref: "Art. 41",
        text: "Não se aplica a Lei 9.099/1995.",
        trap: "Não cabe transação penal nem suspensão condicional do processo (Súmula 536 do STJ).",
      },
    ],
    questions: [
      {
        statement: "A configuração da violência doméstica exige que agressor e vítima morem juntos.",
        answer: false,
        explain: "Não exige coabitação (art. 5º, III, e Súmula 600 do STJ).",
      },
      {
        statement:
          "Na falta de delegado disponível, em Município que não é sede de comarca, o policial pode afastar o agressor do lar.",
        answer: true,
        explain: "Art. 12-C, III, com comunicação ao juiz em 24 horas.",
      },
      {
        statement:
          "O delegado pode conceder fiança na prisão em flagrante por descumprimento de medida protetiva.",
        answer: false,
        explain: "Só a autoridade judicial pode conceder fiança nesse caso (art. 24-A, § 2º).",
      },
    ],
  },
  {
    id: "11",
    title: "Racismo e injúria racial",
    law: "Lei 7.716/1989",
    topic: { disciplineId: H, topicId: "pmpe-dh.c05.t02" },
    points: [
      {
        ref: "Art. 1º",
        text: "Pune discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional.",
      },
      {
        ref: "Art. 2º-A",
        text: "Injúria racial (Lei 14.532/2023): reclusão de 2 a 5 anos e multa, aumentada de metade em concurso de duas ou mais pessoas.",
      },
      {
        ref: "Art. 20",
        text: "Praticar, induzir ou incitar discriminação ou preconceito: reclusão de 1 a 3 anos e multa.",
      },
      {
        ref: "CF, art. 5º, XLII",
        text: "Racismo é inafiançável e imprescritível; o STF aplica a regra à injúria racial.",
      },
      {
        ref: "STF, ADO 26",
        text: "Homofobia e transfobia se enquadram na Lei 7.716 até a edição de lei específica.",
        trap: "A injúria por religião continua no Código Penal (art. 140, § 3º).",
      },
    ],
    questions: [
      {
        statement: "A injúria racial está hoje prevista na Lei 7.716/1989.",
        answer: true,
        explain: "Foi transferida para o art. 2º-A pela Lei 14.532/2023.",
      },
      {
        statement: "A injúria em razão da religião também passou para a Lei 7.716/1989.",
        answer: false,
        explain: "Continua no art. 140, § 3º, do Código Penal.",
      },
      {
        statement: "O crime de racismo é afiançável, mas imprescritível.",
        answer: false,
        explain: "É inafiançável e imprescritível (CF, art. 5º, XLII).",
      },
    ],
  },
  {
    id: "12",
    title: "Crimes hediondos",
    law: "Lei 8.072/1990",
    topic: { disciplineId: H, topicId: "pmpe-dh.c06.t01" },
    points: [
      {
        ref: "Art. 1º",
        text: "Rol taxativo: inclui homicídio qualificado, feminicídio, latrocínio, extorsão mediante sequestro, estupro e estupro de vulnerável.",
      },
      {
        ref: "Art. 1º, I-A",
        text: "Lesão gravíssima ou seguida de morte e homicídio contra agentes de segurança pública, em razão da função, ou seus familiares.",
      },
      { ref: "Art. 2º", text: "Insuscetíveis de anistia, graça, indulto e fiança." },
      { ref: "Art. 2º, § 4º", text: "Prisão temporária de até 30 dias, prorrogável por mais 30." },
      {
        ref: "LEP, art. 112, § 5º",
        text: "Tráfico privilegiado não é hediondo.",
        trap: "TTT (tortura, tráfico e terrorismo) são equiparados, não hediondos.",
      },
    ],
    questions: [
      {
        statement:
          "O juiz pode considerar hediondo um crime que não esteja no rol da Lei 8.072/1990, pela sua gravidade.",
        answer: false,
        explain: "O Brasil adota o critério legal: só é hediondo o que está no rol.",
      },
      {
        statement:
          "Nos crimes hediondos, a prisão temporária pode durar 30 dias, prorrogáveis por igual período.",
        answer: true,
        explain: "Art. 2º, § 4º.",
      },
      {
        statement: "O tráfico de drogas privilegiado é crime equiparado a hediondo.",
        answer: false,
        explain: "A LEP, art. 112, § 5º, afasta essa natureza do tráfico privilegiado.",
      },
    ],
  },
  {
    id: "13",
    title: "Lei de Drogas",
    law: "Lei 11.343/2006",
    topic: { disciplineId: H, topicId: "pmpe-dh.c06.t02" },
    points: [
      {
        ref: "Art. 28",
        text: "Usuário: advertência, prestação de serviços e medida educativa. Não há prisão.",
      },
      { ref: "Art. 48, § 2º", text: "Usuário não é preso em flagrante; lavra-se termo circunstanciado." },
      {
        ref: "Art. 33",
        text: "Tráfico: 18 verbos, inclusive fornecer gratuitamente; reclusão de 5 a 15 anos.",
      },
      {
        ref: "Art. 33, § 4º",
        text: "Redução de 1/6 a 2/3 para o primário, de bons antecedentes, que não se dedica ao crime nem integra organização.",
      },
      {
        ref: "STF, RE 635.659",
        text: "Porte de até 40 g de maconha ou 6 plantas-fêmeas presume uso pessoal; é ilícito administrativo, não crime.",
        trap: "A presunção é relativa e vale só para a maconha.",
      },
    ],
    questions: [
      {
        statement:
          "O usuário de drogas flagrado com pequena quantidade para consumo pessoal deve ser preso em flagrante.",
        answer: false,
        explain:
          "Não se impõe prisão em flagrante ao usuário; lavra-se termo circunstanciado (art. 48, § 2º).",
      },
      {
        statement: "Fornecer droga gratuitamente pode configurar o crime de tráfico do art. 33.",
        answer: true,
        explain: '"Fornecer, ainda que gratuitamente" está entre os verbos do art. 33.',
      },
      {
        statement: "A associação para o tráfico exige pelo menos três pessoas.",
        answer: false,
        explain: "Basta a associação de duas ou mais pessoas (art. 35).",
      },
    ],
  },
  {
    id: "14",
    title: "Estatuto da Pessoa Idosa",
    law: "Lei 10.741/2003",
    topic: { disciplineId: H, topicId: "pmpe-dh.c07.t01" },
    points: [
      { ref: "Art. 1º", text: "Pessoa idosa: 60 anos ou mais; prioridade especial aos maiores de 80." },
      {
        ref: "Art. 95",
        text: "Crimes de ação penal pública incondicionada; não se aplicam as imunidades dos arts. 181 e 182 do Código Penal.",
      },
      {
        ref: "Art. 94",
        text: "Crimes com pena máxima de até 4 anos seguem o procedimento da Lei 9.099, sem os benefícios despenalizadores (STF).",
        trap: "Só o rito é aplicado, não a transação penal.",
      },
      {
        ref: "Art. 102",
        text: "Apropriar-se de bens ou proventos da pessoa idosa: reclusão de 1 a 4 anos e multa.",
      },
      { ref: "Art. 104", text: "Reter cartão magnético do benefício como garantia de dívida é crime." },
    ],
    questions: [
      {
        statement:
          "O filho que se apropria da aposentadoria do pai idoso fica isento de pena por causa do parentesco.",
        answer: false,
        explain: "O Estatuto afasta as imunidades dos arts. 181 e 182 do CP (art. 95).",
      },
      {
        statement: "Os crimes do Estatuto da Pessoa Idosa são de ação penal pública incondicionada.",
        answer: true,
        explain: "Art. 95.",
      },
      {
        statement: "Para o Estatuto, pessoa idosa é aquela com 65 anos ou mais.",
        answer: false,
        explain: "É a pessoa com idade igual ou superior a 60 anos (art. 1º).",
      },
    ],
  },
  {
    id: "15",
    title: "Estatuto da Juventude",
    law: "Lei 12.852/2013",
    topic: { disciplineId: H, topicId: "pmpe-dh.c07.t02" },
    points: [
      { ref: "Art. 1º, § 1º", text: "Jovens: pessoas de 15 a 29 anos." },
      {
        ref: "Art. 1º, § 2º",
        text: "Aos adolescentes de 15 a 18 anos aplica-se o ECA e, excepcionalmente, o Estatuto da Juventude, se não conflitar.",
      },
      {
        ref: "Art. 23",
        text: "Meia-entrada para estudantes e jovens de baixa renda em eventos culturais e esportivos.",
      },
      {
        ref: "Art. 32",
        text: "Transporte interestadual: 2 vagas gratuitas e 2 com 50% de desconto por veículo para jovens de baixa renda.",
      },
      {
        ref: "Arts. 37 e 38",
        text: "Direito à segurança pública e ao acesso à justiça, com políticas de prevenção da violência contra jovens.",
        trap: "Novidade no edital da PMPE: atenção à faixa etária.",
      },
    ],
    questions: [
      {
        statement: "Para o Estatuto da Juventude, são jovens as pessoas entre 18 e 29 anos.",
        answer: false,
        explain: "A faixa é de 15 a 29 anos (art. 1º, § 1º).",
      },
      {
        statement: "Aos adolescentes de 15 a 18 anos aplica-se prioritariamente o ECA.",
        answer: true,
        explain:
          "O Estatuto da Juventude só se aplica a eles excepcionalmente, quando não conflitar com o ECA.",
      },
      {
        statement:
          "O jovem de baixa renda tem direito a duas vagas gratuitas por veículo no transporte interestadual.",
        answer: true,
        explain: "Art. 32, I.",
      },
    ],
  },
];

export const CAFE_PLAN_ID = "cafe-com-lei";
export const getCafeDay = (id: string) => CAFE_DAYS.find((d) => d.id === id);
