"use client";

import { useId, useState } from "react";
import { carregarListas, salvarListas, type ListaCompra } from "./listas-compras";

export default function SalvarNaLista({ nome, slug }: { nome: string; slug?: string }) {
  const [aberto, setAberto] = useState(false);
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [salvo, setSalvo] = useState(false);
  const painelId = useId();

  function abrir() {
    setListas(carregarListas());
    setAberto(true);
  }

  function salvar(listaId: string) {
    const atualizadas = listas.map((l) => {
      if (l.id !== listaId) return l;
      const existe = l.itens.find((i) => i.nome === nome);
      if (existe) {
        return { ...l, itens: l.itens.map((i) => i.nome === nome ? { ...i, qtd: i.qtd + 1 } : i) };
      }
      return { ...l, itens: [...l.itens, { nome, qtd: 1, slug }] };
    });
    salvarListas(atualizadas);
    setSalvo(true);
    setTimeout(() => { setAberto(false); setSalvo(false); }, 1200);
  }

  if (salvo) {
    return <span className="salvar-lista-ok" role="status">Salvo na lista</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Salvar ${nome} na lista`}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="salvar-lista-botao"
      >
        + Lista
      </button>
      {aberto && (
        <div id={painelId} className="salvar-lista-painel">
          {listas.length === 0 ? (
            <p className="salvar-lista-vazia">
              <a href="/listas">Criar uma lista de compras</a>
            </p>
          ) : (
            listas.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => salvar(l.id)}
                className="salvar-lista-opcao"
              >
                {l.nome}
              </button>
            ))
          )}
          <button type="button" onClick={() => setAberto(false)} className="salvar-lista-opcao">
            Fechar listas
          </button>
        </div>
      )}
    </>
  );
}
