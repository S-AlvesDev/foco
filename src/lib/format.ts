/** Formatação em pt-BR para durações, contagens e datas locais. */

/** 45 → "45 min"; 3900 → "1h 05min"; 7200 → "2h"; 0 → "0 min". */
export function formatDuration(seconds: number) {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}

/** Data local ("YYYY-MM-DD") no fuso informado. */
export function localDateISO(tz: string, at: Date) {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function daysBetween(fromISO: string, toISO: string) {
  return Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / 86_400_000);
}

const MONTHS = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
];

/** "12 out." ou "12 out. 2025" quando o ano é outro. */
export function shortDate(iso: string, todayISO?: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const sameYear = !todayISO || todayISO.slice(0, 4) === iso.slice(0, 4);
  return `${d} ${MONTHS[m - 1]}${sameYear ? "" : ` ${y}`}`;
}

/** "hoje", "ontem", "há 3 dias" ou a data curta. */
export function relativeDay(iso: string, todayISO: string) {
  const diff = daysBetween(iso, todayISO);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff > 1 && diff < 7) return `há ${diff} dias`;
  return shortDate(iso, todayISO);
}
