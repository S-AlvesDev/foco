# Biblioteca — formato de importação

A Biblioteca recebe apostilas já organizadas em um arquivo **JSON** (formato `alpha-biblioteca`, versão 1).
O conteúdo é preparado antes, a partir dos PDFs; o app não lê PDF nem usa IA.

Quem importa: a conta administradora (a mesma do banco de questões), em **Biblioteca › Importar**.
Quem lê: a conta administradora e quem está no mesmo espaço da **Nossa Jornada**.

## Estrutura

```
concurso → disciplina → capítulos → tópicos → subtópicos (até 3 níveis) → blocos de conteúdo
```

```jsonc
{
  "formato": "alpha-biblioteca",
  "versao": 1,
  "modo": "disciplina",            // "disciplina" (arquivo completo) ou "capitulos" (só os capítulos enviados)
  "concurso": { "id": "prf", "nome": "PRF", "ordem": 1 },
  "disciplina": {
    "id": "prf-direito-administrativo",
    "nome": "Direito Administrativo",
    "descricao": "Opcional",
    "ordem": 3
  },
  "fontes": [
    { "id": "prf-adm.apostila-2026", "arquivo": "Apostila Direito Administrativo.pdf", "titulo": "Apostila PRF 2026" }
  ],
  "capitulos": [
    {
      "id": "prf-adm.c01",
      "numero": "1",
      "titulo": "Introdução ao Direito Administrativo",
      "ordem": 1,                 // opcional
      "topicos": [
        {
          "id": "prf-adm.c01.t01",
          "numero": "1.1",
          "titulo": "Conceito",
          "blocos": [
            {
              "id": "prf-adm.c01.t01.b001",
              "tipo": "paragrafo",
              "dados": { "texto": "O **Direito Administrativo** é o ramo do direito público…" },
              "fontes": [{ "fonte": "prf-adm.apostila-2026", "pagina": 12, "secao": "1.1" }]
            }
          ],
          "subtopicos": [ /* mesmo formato de tópico */ ]
        }
      ]
    }
  ]
}
```

### Ids (o mais importante)

- Todo concurso, disciplina, fonte, capítulo, tópico e bloco tem um **id fixo**: letras minúsculas, números,
  ponto, hífen ou `_` (ex.: `prf-adm.c01.t01.b001`).
- **Reimportar com os mesmos ids atualiza no lugar.** É isso que mantém marcações, anotações, favoritos e progresso.
- Nunca reaproveite o id de um bloco para outro trecho. Bloco novo = id novo.
- Ids não se repetem no arquivo; um bloco não pode trocar de tópico (o app recusa).

### Modos

| modo | o que faz |
|---|---|
| `disciplina` | o arquivo é a disciplina inteira; capítulos e tópicos que não vierem são **arquivados** (somem da biblioteca, sem apagar dados pessoais) |
| `capitulos` | só mexe nos capítulos do arquivo; dentro deles, tópicos que não vierem são arquivados; os outros capítulos ficam como estão |

Em cada tópico, a lista de blocos é sempre completa: blocos que saírem são arquivados.

## Tipos de bloco (`tipo` e `dados`)

| tipo | dados |
|---|---|
| `titulo` | `{ "texto": "…", "nivel": 2 \| 3 \| 4 }` (subtítulo dentro do tópico) |
| `paragrafo` | `{ "texto": "…" }` |
| `lista` | `{ "ordenada": false, "itens": ["…", { "texto": "…", "itens": ["…"] }] }` |
| `tabela` | `{ "titulo": "…", "cabecalho": ["A", "B"], "linhas": [["1", "2"]], "legenda": "…" }` |
| `comparativo` | `{ "titulo": "…", "colunas": [{ "titulo": "Ato vinculado", "itens": ["…"] }, { "titulo": "Ato discricionário", "itens": ["…"] }] }` (2 a 5 colunas) |
| `destaque` | `{ "variante": "atencao" \| "observacao" \| "dica" \| "importante" \| "exemplo" \| "lembre", "titulo": "…", "texto": "…" }` |
| `citacao` | `{ "texto": "Art. 37. A administração pública…", "referencia": "CF/88, art. 37" }` (letra de lei) |
| `formula` | `{ "latex": "v = \\frac{\\Delta s}{\\Delta t}", "legenda": "…" }` |
| `imagem` | `{ "arquivo": "organograma.png", "alt": "descrição", "legenda": "…" }` ou `{ "url": "https://…", "alt": "…" }` |

Texto em linha (em qualquer campo de texto): `**negrito**`, `*itálico*`, `$fórmula$`. Use `\*`, `\$` para os
caracteres literais. Em `destaque` e `citacao`, uma linha em branco separa parágrafos.

Imagens com `arquivo`: escolha os arquivos junto com o JSON na tela de importação; ficam guardados por disciplina.

## Fontes (rastreabilidade)

- `fontes` (na raiz) lista os PDFs de origem.
- Cada bloco pode citar uma ou mais: `{ "fonte": "<id>", "pagina": 12, "secao": "Capítulo 1" }`.
- **Não invente página.** Se não souber, omita `pagina`.
- No leitor, o botão **Fontes** mostra a origem de cada bloco sem atrapalhar a leitura.

## Atualizações e marcações

Cada bloco guarda o texto exatamente como aparece na tela. Numa atualização:

1. bloco com o mesmo texto → marcações intactas;
2. bloco com texto alterado → cada marcação é procurada **só dentro do mesmo bloco**; se o trecho aparece uma única vez,
   ela é reposicionada; senão fica **“para revisar”** (aparece num aviso no leitor e na lista de marcações, e não é
   desenhada no texto);
3. bloco removido → arquivado; as marcações dele ficam “para revisar”. Se o bloco voltar com o mesmo texto, elas voltam.

Nada pessoal é apagado por uma importação.

## Validação antes de salvar

A tela de importação confere, antes de enviar: campos obrigatórios, tipos de bloco, ids repetidos, fontes citadas que
não existem, blocos que já pertencem a outro tópico, tópicos que seriam arquivados e imagens citadas. Mostra a
estrutura e uma prévia do primeiro tópico. Nada é gravado sem confirmar.

## Banco de dados (migração 0011)

- Catálogo: `library_contests`, `library_disciplines`, `library_sources`, `library_chapters`, `library_topics`,
  `library_blocks` (só leitura pelo app; escrita apenas pelas funções `library_import_structure`,
  `library_import_blocks` e `library_archive`, que exigem a conta administradora).
- Pessoal: `library_marks` (marcações, anotações e favoritos, de tópico ou de trecho) e `library_progress`. RLS: cada
  pessoa só lê e altera o que é seu.
- Busca: `library_search` (texto em português, sem diferenciar acentos; sem IA).
- Imagens: bucket privado `library`.
