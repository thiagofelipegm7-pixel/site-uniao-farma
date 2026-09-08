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

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      timeoutHandle = window.setTimeout(start, 800);
    }

    return () => {
      if (idleHandle && typeof window.cancelIdleCallback === "function") {
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
          : { isOpen: false, holiday: null, label: "Confira o horário" };
        return { unit, ...status };
      }),
    [now],
  );

  const holiday = rows.find((row) => row.holiday)?.holiday ?? null;
  const openCount = rows.filter((row) => row.isOpen).length;

  return (
    <div className="open-now-strip" role="status" aria-label="Situação das lojas agora">
      <strong>{holiday ? "Feriado" : openCount > 0 ? "Aberto agora" : "Unidades"}</strong>
      <div className="open-now-list">
        {rows.map((row) => {
          const name = row.unit.id === "fatima" ? "Fátima" : row.unit.id === "nacoes" ? "Nações" : "Itacolomi";
          return (
            <a
              key={row.unit.id}
              href="/#unidades-rapidas"
              className={row.isOpen ? "is-open" : "is-closed"}
              aria-label={`${name}: ${holiday ? "confirme o horário" : now ? (row.isOpen ? "aberta agora" : "fechada, ver horário") : "ver loja"}`}
            >
              <span>{name}</span>
              <small>{holiday ? "confirme" : now ? (row.isOpen ? "aberta" : "ver horário") : ""}</small>
            </a>
          );
        })}
      </div>
    </div>
  );
}
