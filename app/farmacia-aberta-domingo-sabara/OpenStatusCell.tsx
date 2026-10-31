"use client";

import { useEffect, useState } from "react";
import { UNITS } from "../site-config";
import { getUnitOpenStatus } from "../UnitStatusBadge";

/** `fallback` é o horário fixo, renderizado no servidor; o status "aberta agora" entra só no cliente. */
export default function OpenStatusCell({ unitId, fallback }: { unitId: string; fallback: string }) {
  const [label, setLabel] = useState<{ text: string; open: boolean } | null>(null);

  useEffect(() => {
    const unit = UNITS.find((item) => item.id === unitId);
    if (!unit) return;
    const update = () => {
      const status = getUnitOpenStatus(unit, new Date());
      setLabel({ text: status.label.replace(/aberto/i, (m) => (m[0] === "A" ? "Aberta" : "aberta")).replace(/fechado/i, (m) => (m[0] === "F" ? "Fechada" : "fechada")), open: status.isOpen });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [unitId]);

  if (!label) return <span className="open-status-fallback">{fallback}</span>;
  return <strong className={label.open ? "unit-status-open" : "unit-status-closed"} aria-live="polite">{label.text}</strong>;
}
