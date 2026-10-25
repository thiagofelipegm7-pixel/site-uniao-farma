"use client";

import { useEffect, useState } from "react";
import { UNITS } from "../site-config";
import { getUnitOpenStatus } from "../unit-hours";

export default function OpenStatusCell({ unitId }: { unitId: string }) {
  const [label, setLabel] = useState<{ text: string; open: boolean } | null>(null);

  useEffect(() => {
    const unit = UNITS.find((item) => item.id === unitId);
    if (!unit) return;
    const update = () => {
      const status = getUnitOpenStatus(unit, new Date());
      setLabel({ text: status.isOpen ? `Aberta agora · ${status.label.split("· ")[1] ?? ""}` : status.label.replace(/^Fechado/, "Fechada"), open: status.isOpen });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [unitId]);

  if (!label) return <span className="open-status-fallback">Veja o horário ao lado</span>;
  return <strong className={label.open ? "unit-status-open" : "unit-status-closed"} aria-live="polite">{label.text}</strong>;
}
