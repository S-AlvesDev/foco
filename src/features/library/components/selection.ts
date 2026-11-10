/**
 * Converte a seleção da tela em âncoras estáveis: id do bloco + início/fim no texto-âncora do bloco
 * (o mesmo texto calculado na importação) + o próprio trecho. Partes marcadas com data-no-anchor
 * (rótulos, fórmulas) não contam.
 */

export type Anchor = { blockId: string; start: number; end: number; quote: string };

function anchorTextNodes(block: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest("[data-no-anchor]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

/** Posição de um ponto (nó, deslocamento) dentro do texto-âncora do bloco. */
export function textOffset(block: Element, node: Node, offset: number): number {
  const point = document.createRange();
  point.setStart(node, offset);
  point.collapse(true);
  let n = 0;
  for (const t of anchorTextNodes(block)) {
    if (t === node) return n + Math.min(offset, t.length);
    // o nó começa depois do ponto? então o ponto está antes dele
    if (point.comparePoint(t, 0) > 0) return n;
    n += t.length;
  }
  return n;
}

/** Âncoras de uma seleção (uma por bloco tocado), ajustadas para não começar/terminar em espaço. */
export function selectionAnchors(root: Element, sel: Selection | null, texts: Map<string, string>): Anchor[] {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return [];
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")].filter((b) =>
    range.intersectsNode(b),
  );
  const out: Anchor[] = [];
  for (const b of blocks) {
    const id = b.dataset.block!;
    const text = texts.get(id);
    if (text === undefined) continue;
    let start = b.contains(range.startContainer) ? textOffset(b, range.startContainer, range.startOffset) : 0;
    let end = b.contains(range.endContainer)
      ? textOffset(b, range.endContainer, range.endOffset)
      : text.length;
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end - start < 1) continue;
    out.push({ blockId: id, start, end, quote: text.slice(start, end) });
  }
  return out;
}

/** Retângulo da seleção atual (para posicionar a barra de ações). */
export function selectionRect(sel: Selection | null): DOMRect | null {
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const rects = sel.getRangeAt(0).getClientRects();
  return rects.length ? rects[0] : sel.getRangeAt(0).getBoundingClientRect();
}
