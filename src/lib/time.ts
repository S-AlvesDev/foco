/** Utilitários de data/hora sempre no fuso do usuário. */

const BR_NAMES: Record<string, string> = {
  "America/Sao_Paulo": "São Paulo, Brasília",
  "America/Fortaleza": "Fortaleza",
  "America/Recife": "Recife",
  "America/Bahia": "Salvador",
  "America/Maceio": "Maceió",
  "America/Belem": "Belém",
  "America/Araguaina": "Araguaína",
  "America/Santarem": "Santarém",
  "America/Manaus": "Manaus",
  "America/Cuiaba": "Cuiabá",
  "America/Campo_Grande": "Campo Grande",
  "America/Porto_Velho": "Porto Velho",
  "America/Boa_Vista": "Boa Vista",
  "America/Rio_Branco": "Rio Branco",
  "America/Noronha": "Fernando de Noronha",
};

export const BRAZIL_ZONES = Object.keys(BR_NAMES);

export function timeZoneName(tz: string) {
  return BR_NAMES[tz] ?? tz.split("/").pop()!.replaceAll("_", " ");
}

export function timeZoneRegion(tz: string) {
  if (BR_NAMES[tz]) return "Brasil";
  return tz.includes("/") ? tz.split("/")[0].replaceAll("_", " ") : "";
}

/** "UTC−03:00" (com sinal de menos tipográfico). */
export function timeZoneOffset(tz: string, at: Date = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  if (!part || part === "GMT") return "UTC+00:00";
  return part.replace("GMT", "UTC").replace("-", "−");
}

/** Minutos de deslocamento (para ordenar a lista). */
export function timeZoneOffsetMinutes(tz: string, at: Date = new Date()) {
  const label = timeZoneOffset(tz, at);
  const m = /UTC([+−])(\d{2}):(\d{2})/.exec(label);
  if (!m) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === "−" ? -minutes : minutes;
}

function hourIn(tz: string, at: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(at),
  );
}

export function greeting(tz: string, at: Date) {
  const h = hourIn(tz, at);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "segunda-feira, 2 de novembro" */
export function longDate(tz: string, at: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(at);
}

/** "22:41" */
export function clockTime(tz: string, at: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(at);
}
