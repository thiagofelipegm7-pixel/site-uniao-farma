import { getHolidayName } from "./hours-exceptions";
import type { Unit, Weekday } from "./site-config";

const weekdayOrder: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayLabels: Record<Weekday, string> = {
  sun: "domingo",
  mon: "segunda-feira",
  tue: "terca-feira",
  wed: "quarta-feira",
  thu: "quinta-feira",
  fri: "sexta-feira",
  sat: "sabado",
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = values.weekday.toLowerCase().slice(0, 3) as Weekday;
  const hour = Number(values.hour) === 24 ? 0 : Number(values.hour);
  return { weekday, minutes: hour * 60 + Number(values.minute) };
}

function getNextOpening(unit: Unit, currentWeekday: Weekday, currentMinutes: number) {
  const currentIndex = weekdayOrder.indexOf(currentWeekday);
  const today = unit.schedule[currentWeekday];
  if (today && currentMinutes < timeToMinutes(today.open)) return `abre hoje as ${today.open}`;
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = weekdayOrder[(currentIndex + offset) % 7];
    const hours = unit.schedule[day];
    if (!hours) continue;
    if (offset === 1) return `abre amanha as ${hours.open}`;
    return `abre ${weekdayLabels[day]} as ${hours.open}`;
  }
  return "horario indisponivel";
}

export function getUnitOpenStatus(unit: Unit, date = new Date()) {
  const holiday = getHolidayName(date);
  if (holiday) {
    return { isOpen: false, holiday, label: `Feriado (${holiday}) · confirme o horario no WhatsApp` };
  }
  const { weekday, minutes } = getSaoPauloDateParts(date);
  const hours = unit.schedule[weekday];
  if (hours) {
    const opening = timeToMinutes(hours.open);
    const closing = timeToMinutes(hours.close);
    if (minutes >= opening && minutes < closing) {
      return { isOpen: true, holiday: null, label: `Aberto agora · fecha as ${hours.close}` };
    }
  }
  return { isOpen: false, holiday: null, label: `Fechado · ${getNextOpening(unit, weekday, minutes)}` };
}
