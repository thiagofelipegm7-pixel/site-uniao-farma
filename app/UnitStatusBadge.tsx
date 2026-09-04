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

function getFallbackLabel(unit: Unit): string {
  const weekday = unit.schedule.mon;
  const saturday = unit.schedule.sat;
  const sunday = unit.schedule.sun;
  return `Horário: Seg–sex ${weekday?.open.slice(0, 5)}–${weekday?.close.slice(0, 5)} · Sáb ${saturday?.open.slice(0, 5)}–${saturday?.close.slice(0, 5)} · Dom ${sunday?.open.slice(0, 5)}–${sunday?.close.slice(0, 5)}`;
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
  // Keep the server render and the first browser render identical so the live
  // status does not trigger a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = useMemo(
    () => now ? getUnitOpenStatus(unit, now) : { isOpen: false, label: getFallbackLabel(unit) },
    [unit, now],
  );

  return (
    <span className={`open-status ${status.isOpen ? "is-open" : "is-closed"}`}>
      <span aria-hidden="true" />
      <strong>{status.label}</strong>
      <small>{getFallbackLabel(unit).replace("Horário: ", "")}</small>
    </span>
  );
}
