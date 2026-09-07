"use client";

import { useEffect, useMemo, useState } from "react";
import { UNITS } from "./site-config";
import { getUnitOpenStatus } from "./UnitStatusBadge";

export default function OpenNowStrip() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let interval = 0;
    let idleHandle = 0;
    let timeoutHandle = 0;

    const start = () => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    };

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      timeoutHandle = window.setTimeout(start, 800);
    }

    return () => {
      if (idleHandle && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const rows = useMemo(
    () =>
      UNITS.map((unit) => {
        const status = now
          ? getUnitOpenStatus(unit, now)
          : { isOpen: false, holiday: null, label: "Confira o hor\u00e1rio" };
        return { unit, ...status };
      }),
    [now],
  );

  const holiday = rows.find((row) => row.holiday)?.holiday ?? null;
  const openCount = rows.filter((row) => row.isOpen).length;

  return (
    <div className="open-now-strip" role="status">
      <strong>{holiday ? "Feriado" : openCount > 0 ? "Aberto agora" : "Unidades"}</strong>
      <div className="open-now-list">
        {rows.map((row) => (
          <a key={row.unit.id} href="/#unidades-rapidas" className={row.isOpen ? "is-open" : "is-closed"}>
            <span>{row.unit.id === "fatima" ? "F\u00e1tima" : row.unit.id === "nacoes" ? "Na\u00e7\u00f5es" : "Itacolomi"}</span>
            <small>{holiday ? "confirme" : now ? (row.isOpen ? "aberta" : "ver hor\u00e1rio") : ""}</small>
          </a>
        ))}
      </div>
    </div>
  );
}
