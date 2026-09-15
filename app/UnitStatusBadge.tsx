"use client";

import { useEffect, useMemo, useState } from "react";
import { addSaoPauloDays, getDayRule, getSaoPauloDateKey } from "./hours-exceptions";
import type { Unit, Weekday } from "./site-config";

const weekdayOrder: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const weekdayLabels: Record<Weekday, string> = {
  sun: "domingo",
  mon: "segunda-feira",
  tue: "terça-feira",
  wed: "quarta-feira",
  thu: "quinta-feira",
  fri: "sexta-feira",
  sat: "sábado",
};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getSaoPauloDateParts(date: Date): {
  weekday: Weekday;
  minutes: number;
  dateKey: string;
} {
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
  const minute = Number(values.minute);

  return {
    weekday,
    minutes: hour * 60 + minute,
    dateKey: getSaoPauloDateKey(date),
  };
}

function hoursFor(unit: Unit, dateKey: string, weekday: Weekday) {
  const rule = getDayRule(dateKey, unit.id);
  if (rule?.type === "closed") return null;
  if (rule?.type === "special") return { open: rule.open, close: rule.close, name: rule.name };
  const weekly = unit.schedule[weekday];
  return weekly ? { ...weekly, name: null } : null;
}

function getNextOpening(unit: Unit, dateKey: string, weekday: Weekday, currentMinutes: number): string {
  const today = hoursFor(unit, dateKey, weekday);
  if (today && currentMinutes < timeToMinutes(today.open)) {
    return `abre hoje às ${today.open}`;
  }

  for (let offset = 1; offset <= 14; offset += 1) {
    const nextKey = addSaoPauloDays(dateKey, offset);
    const day = weekdayOrder[(weekdayOrder.indexOf(weekday) + offset) % 7];
    const hours = hoursFor(unit, nextKey, day);
    if (!hours) continue;
    if (offset === 1) return `abre amanhã às ${hours.open}`;
    return `abre ${weekdayLabels[day]} às ${hours.open}`;
  }

  return "confirme o horário no WhatsApp";
}

export function getFallbackLabel(unit: Unit): string {
  const weekday = unit.schedule.mon;
  const saturday = unit.schedule.sat;
  const sunday = unit.schedule.sun;
  return `Seg–sex ${weekday?.open.slice(0, 5)}–${weekday?.close.slice(0, 5)} · Sáb ${saturday?.open.slice(0, 5)}–${saturday?.close.slice(0, 5)} · Dom ${sunday?.open.slice(0, 5)}–${sunday?.close.slice(0, 5)}`;
}

export function getUnitOpenStatus(unit: Unit, date = new Date()): {
  isOpen: boolean;
  label: string;
  holiday: string | null;
} {
  const { weekday, minutes, dateKey } = getSaoPauloDateParts(date);
  const rule = getDayRule(dateKey, unit.id);
  const hours = hoursFor(unit, dateKey, weekday);

  if (!hours) {
    return {
      isOpen: false,
      holiday: rule?.name ?? null,
      label: rule
        ? `${rule.name} · fechado · ${getNextOpening(unit, dateKey, weekday, minutes)}`
        : `Fechado · ${getNextOpening(unit, dateKey, weekday, minutes)}`,
    };
  }

  const opening = timeToMinutes(hours.open);
  const closing = timeToMinutes(hours.close);
  const specialName = hours.name;

  if (minutes >= opening && minutes < closing) {
    return {
      isOpen: true,
      holiday: specialName,
      label: specialName
        ? `${specialName} · aberto agora · fecha às ${hours.close}`
        : `Aberto agora · fecha às ${hours.close}`,
    };
  }

  return {
    isOpen: false,
    holiday: specialName,
    label: specialName
      ? `${specialName} · ${getNextOpening(unit, dateKey, weekday, minutes)}`
      : `Fechado · ${getNextOpening(unit, dateKey, weekday, minutes)}`,
  };
}

export default function UnitStatusBadge({ unit }: { unit: Unit }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = useMemo(
    () => (now ? getUnitOpenStatus(unit, now) : { isOpen: false, holiday: null, label: getFallbackLabel(unit) }),
    [unit, now],
  );

  return (
    <span className={`open-status ${now ? (status.holiday && !status.isOpen ? "is-hours" : status.isOpen ? "is-open" : "is-closed") : "is-hours"}`}>
      <strong>{status.label}</strong>
    </span>
  );
}
