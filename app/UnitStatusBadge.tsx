"use client";

import { useEffect, useMemo, useState } from "react";
import { getHolidayName } from "./hours-exceptions";
import type { Unit, Weekday } from "./site-config";

const weekdayOrder: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const weekdayLabels: Record<Weekday, string> = {
  sun: "domingo",
  mon: "segunda-feira",
  tue: "ter\u00e7a-feira",
  wed: "quarta-feira",
  thu: "quinta-feira",
  fri: "sexta-feira",
  sat: "s\u00e1bado",
};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getSaoPauloDateParts(date: Date): {
  weekday: Weekday;
  minutes: number;
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
  };
}

function getNextOpening(unit: Unit, currentWeekday: Weekday, currentMinutes: number): string {
  const currentIndex = weekdayOrder.indexOf(currentWeekday);
  const today = unit.schedule[currentWeekday];

  if (today && currentMinutes < timeToMinutes(today.open)) {
    return `abre hoje \u00e0s ${today.open}`;
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = weekdayOrder[(currentIndex + offset) % 7];
    const hours = unit.schedule[day];

    if (hours) {
      if (offset === 1) {
        return `abre amanh\u00e3 \u00e0s ${hours.open}`;
      }

      return `abre ${weekdayLabels[day]} \u00e0s ${hours.open}`;
    }
  }

  return "hor\u00e1rio indispon\u00edvel";
}

export function getFallbackLabel(unit: Unit): string {
  const weekday = unit.schedule.mon;
  const saturday = unit.schedule.sat;
  const sunday = unit.schedule.sun;
  return `Seg\u2013sex ${weekday?.open.slice(0, 5)}\u2013${weekday?.close.slice(0, 5)} \u00b7 S\u00e1b ${saturday?.open.slice(0, 5)}\u2013${saturday?.close.slice(0, 5)} \u00b7 Dom ${sunday?.open.slice(0, 5)}\u2013${sunday?.close.slice(0, 5)}`;
}

export function getUnitOpenStatus(unit: Unit, date = new Date()): {
  isOpen: boolean;
  label: string;
  holiday: string | null;
} {
  const holiday = getHolidayName(date);
  if (holiday) {
    return {
      isOpen: false,
      holiday,
      label: `Feriado (${holiday}) \u00b7 confirme o hor\u00e1rio no WhatsApp`,
    };
  }

  const { weekday, minutes } = getSaoPauloDateParts(date);
  const hours = unit.schedule[weekday];

  if (hours) {
    const opening = timeToMinutes(hours.open);
    const closing = timeToMinutes(hours.close);

    if (minutes >= opening && minutes < closing) {
      return {
        isOpen: true,
        holiday: null,
        label: `Aberto agora \u00b7 fecha \u00e0s ${hours.close}`,
      };
    }
  }

  return {
    isOpen: false,
    holiday: null,
    label: `Fechado \u00b7 ${getNextOpening(unit, weekday, minutes)}`,
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
    <span className={`open-status ${now ? (status.holiday ? "is-hours" : status.isOpen ? "is-open" : "is-closed") : "is-hours"}`}>
      <strong>{status.label}</strong>
    </span>
  );
}
