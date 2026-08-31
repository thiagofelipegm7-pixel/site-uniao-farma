"use client";

import { useEffect, useMemo, useState } from "react";
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
    return `abre hoje às ${today.open}`;
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = weekdayOrder[(currentIndex + offset) % 7];
    const hours = unit.schedule[day];

    if (hours) {
      if (offset === 1) {
        return `abre amanhã às ${hours.open}`;
      }

      return `abre ${weekdayLabels[day]} às ${hours.open}`;
    }
  }

  return "horário indisponível";
}

export function getUnitOpenStatus(unit: Unit, date = new Date()): {
  isOpen: boolean;
  label: string;
} {
  const { weekday, minutes } = getSaoPauloDateParts(date);
  const hours = unit.schedule[weekday];

  if (hours) {
    const opening = timeToMinutes(hours.open);
    const closing = timeToMinutes(hours.close);

    if (minutes >= opening && minutes < closing) {
      return {
        isOpen: true,
        label: `Aberto agora · fecha às ${hours.close}`,
      };
    }
  }

  return {
    isOpen: false,
    label: `Fechado · ${getNextOpening(unit, weekday, minutes)}`,
  };
}

export default function UnitStatusBadge({ unit }: { unit: Unit }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = useMemo(() => getUnitOpenStatus(unit, now), [unit, now]);

  return (
    <span className={`open-status ${status.isOpen ? "is-open" : "is-closed"}`}>
      <span aria-hidden="true" />
      {status.label}
    </span>
  );
}
