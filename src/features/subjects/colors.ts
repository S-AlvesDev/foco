/** Paleta de matérias: tons dessaturados, legíveis no tema claro e no escuro. */
export const SUBJECT_COLORS = [
  { value: "#6E73E8", name: "Índigo" },
  { value: "#4A9FD8", name: "Azul" },
  { value: "#3BA99C", name: "Verde-água" },
  { value: "#5BAA62", name: "Verde" },
  { value: "#9AAE3C", name: "Oliva" },
  { value: "#D9A23A", name: "Âmbar" },
  { value: "#DD7A42", name: "Laranja" },
  { value: "#D9605A", name: "Vermelho" },
  { value: "#D0679A", name: "Rosa" },
  { value: "#9B72D9", name: "Violeta" },
  { value: "#A07C5B", name: "Marrom" },
  { value: "#7D8696", name: "Cinza" },
] as const;

/** Sugere a primeira cor da paleta ainda não usada. */
export function nextFreeColor(used: string[]) {
  const set = new Set(used.map((c) => c.toUpperCase()));
  return (SUBJECT_COLORS.find((c) => !set.has(c.value)) ?? SUBJECT_COLORS[0]).value;
}
