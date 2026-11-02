"use client";

import { useEffect, useState } from "react";
import { readPreferredUnitId } from "../preferred-unit";
import { IconPino } from "../reserva/ReservaIcons";
import { UNITS } from "../site-config";
import { abrirSeletorDeLoja } from "./loja-evento";

/** "Retirar ou receber em [loja] · Trocar". Usa a loja preferida; sem escolha pede para escolher. */
export default function LojaBar() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const sincronizar = () => setId(readPreferredUnitId());
    sincronizar();
    window.addEventListener("uf-preferred-unit", sincronizar);
    return () => window.removeEventListener("uf-preferred-unit", sincronizar);
  }, []);

  const unit = UNITS.find((item) => item.id === id);

  return (
    <div className="shop-lojabar">
      <span className="shop-lojabar-pino"><IconPino size={26} /></span>
      <div>
        <small>Retirar ou receber em</small>
        <strong>{unit ? unit.shortName : "Escolha sua loja"}</strong>
      </div>
      <button type="button" onClick={abrirSeletorDeLoja}>{unit ? "Trocar" : "Escolher"}</button>
    </div>
  );
}
