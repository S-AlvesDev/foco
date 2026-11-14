import { describe, expect, it } from "vitest";
import { findArticles } from "./components/in-topic-nav";

describe("findArticles", () => {
  it("acha o primeiro bloco de cada artigo, com letra quando houver", () => {
    const a = findArticles([
      { id: "b1", text: "Art. 1º Esta Lei dispõe..." },
      { id: "b2", text: "Parágrafo único. Texto." },
      { id: "b3", text: "Art. 12-A. Fica criado..." },
      { id: "b4", text: "Comentário Art. 31º sobre a lei" },
      { id: "b5", text: "Art. 1º repetido" },
      { id: "b6", text: "O art. 5º da CF diz" },
    ]);
    expect(a.map((x) => [x.id, x.num])).toEqual([
      ["b1", "1"],
      ["b3", "12-A"],
      ["b4", "31"],
    ]);
  });
});
