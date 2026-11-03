/** Aritmética de datas locais no formato "YYYY-MM-DD" (sem fuso: já são dias do usuário). */

const toUTC = (iso: string) => Date.parse(iso + "T00:00:00Z");
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, n: number) {
  return fromUTC(toUTC(iso) + n * 86_400_000);
}

export function daysBetween(fromISO: string, toISO: string) {
  return Math.round((toUTC(toISO) - toUTC(fromISO)) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(iso: string) {
  return new Date(toUTC(iso)).getUTCDay();
}

/** Início da semana que contém o dia (weekStartsOn: 0 domingo, 1 segunda). */
export function weekStartOf(iso: string, weekStartsOn: number) {
  const diff = (weekday(iso) - weekStartsOn + 7) % 7;
  return addDays(iso, -diff);
}

export function monthStartOf(iso: string) {
  return iso.slice(0, 8) + "01";
}

export function addMonths(iso: string, n: number) {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function daysInMonth(iso: string) {
  return daysBetween(monthStartOf(iso), addMonths(iso, 1));
}

/** Todos os dias de from a to (inclusive). */
export function eachDay(fromISO: string, toISO: string) {
  const out: string[] = [];
  for (let d = fromISO; d <= toISO; d = addDays(d, 1)) out.push(d);
  return out;
}

export const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
export const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAYS_LONG = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** "segunda-feira, 2 de novembro" */
export function longDayLabel(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${WEEKDAYS_LONG[weekday(iso)]}, ${d} de ${MONTHS_LONG[m - 1]}`;
}

/** "novembro de 2026" */
export function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} de ${y}`;
}
