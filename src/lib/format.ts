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

/**
 * Lê a duração digitada: "90" (minutos), "1:30", "1h30", "1h 30min", "2h", "45min".
 * Devolve minutos ou null se não entender.
 */
export function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  let m = /^(\d{1,4})$/.exec(s);
  if (m) return Number(m[1]);
  m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m && Number(m[2]) < 60) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d{1,2})h(?:(\d{1,2})(?:min|m)?)?$/.exec(s);
  if (m && (!m[2] || Number(m[2]) < 60)) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  m = /^(\d{1,4})(?:min|m)$/.exec(s);
  if (m) return Number(m[1]);
  return null;
}

/** Minutos para o campo de duração: 90 → "1:30". */
export function minutesToInput(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Minutos entre "HH:MM" e "HH:MM"; se o fim for antes do início, passou da meia-noite. */
export function minutesBetween(start: string, end: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let diff = toMin(end) - toMin(start);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** "HH:MM" + minutos → "HH:MM" (volta ao 00:00 depois da meia-noite). */
export function addMinutesToTime(time: string, minutes: number) {
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Segundos para o relógio do cronômetro: "0:05:09", "1:02:03". */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Versão curta para espaços pequenos: "45m", "1h30", "2h". */
export function compactDuration(seconds: number) {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
