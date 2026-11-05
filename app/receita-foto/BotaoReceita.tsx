"use client";

import { IconCamera } from "../reserva/ReservaIcons";
import { abrirLeitorReceita } from "./abrir-receita";
import "./receita-foto.css";

/** "Tenho uma receita": abre o leitor de receita por foto. `aoAbrir` serve para fechar a gaveta/painel onde o botão está. */
export default function BotaoReceita({ aoAbrir, classe = "", rotulo = "Tenho uma receita" }: { aoAbrir?: () => void; classe?: string; rotulo?: string }) {
  return (
    <button
      type="button"
      className={`receita-gatilho ${classe}`.trim()}
      onClick={() => {
        aoAbrir?.();
        // Dá um instante para a gaveta/painel de origem sair antes de abrir o leitor.
        window.setTimeout(abrirLeitorReceita, 30);
      }}
    >
      <IconCamera size={20} />
      <span>{rotulo}</span>
    </button>
  );
}
