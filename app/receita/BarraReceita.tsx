"use client";

import { useEffect, useState } from "react";
import BotaoReceita from "../receita-foto/BotaoReceita";
import { IconClipe } from "../reserva/ReservaIcons";

/** Botão fixo na base da tela (só no celular): aparece quando o botão do topo sai de vista, para ler a receita sem voltar à rolagem. */
export default function BarraReceita() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const alvo = document.querySelector(".recipe-hero .recipe-anexar");
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    const olho = new IntersectionObserver(([entrada]) => setVisivel(!entrada.isIntersecting), { threshold: 0 });
    olho.observe(alvo);
    return () => olho.disconnect();
  }, []);

  return (
    <div className={`recipe-fixo${visivel ? " is-visivel" : ""}`}>
      <BotaoReceita classe="recipe-fixo-botao" rotulo="Ler minha receita" icone={<IconClipe size={22} />} />
    </div>
  );
}
