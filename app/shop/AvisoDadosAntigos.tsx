"use client";

import { useEffect, useState } from "react";
import { MINUTOS_PARA_AVISAR, textoIdade } from "../disponibilidade";
import { useIdadeDosDados } from "../reserva/useDisponibilidade";
import { PUBLIC_UNITS } from "../site-config";
import { getUnitOpenStatus } from "../UnitStatusBadge";

/**
 * Camada 4 de informações corretas: se o PC da loja parou de enviar o estoque (e a loja está aberta), o site diz de quando são os preços.
 * Sem aviso quando a loja está fechada: o PC desligado à noite deixa o dado "velho" sem ser problema.
 */
export default function AvisoDadosAntigos() {
  const idade = useIdadeDosDados();
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const unidade = PUBLIC_UNITS[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a hora só existe no navegador
    if (unidade) setAberta(getUnitOpenStatus(unidade, new Date()).isOpen);
  }, []);
  if (!aberta || idade === null || idade < MINUTOS_PARA_AVISAR) return null;
  return (
    <p className="shop-aviso-dados" role="status">
      Preços e estoque de {textoIdade(idade)} atrás. Confirme com a loja pelo WhatsApp antes de ir.
    </p>
  );
}
