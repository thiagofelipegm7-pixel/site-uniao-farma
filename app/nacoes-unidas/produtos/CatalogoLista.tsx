"use client";

import { useState } from "react";
import { buildWhatsAppUrl, UNITS } from "../../site-config";
import { contarItens, filtrarGrupos, mensagemItem, type GrupoBusca } from "./busca";

type Props = {
  grupos: GrupoBusca[];
  whatsappHref: string;
  unitId: string;
};

/** Lista do catálogo com busca local. O HTML do servidor já traz tudo, então sem JavaScript a lista continua completa. */
export default function CatalogoLista({ grupos, whatsappHref, unitId }: Props) {
  const [consulta, setConsulta] = useState("");
  const visiveis = filtrarGrupos(grupos, consulta);
  const total = contarItens(visiveis);
  const buscando = consulta.trim().length > 0;
  const unit = UNITS.find((u) => u.id === unitId);
  const hrefDoItem = (nome: string, precoFmt: string) =>
    unit ? buildWhatsAppUrl(unit, mensagemItem(nome, precoFmt), { campaign: "produtos_nacoes", content: "nacoes_item" }) : whatsappHref;

  return (
    <>
      <form className="catalogo-busca" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="catalogo-busca-campo">Buscar produto, marca ou categoria</label>
        <div className="catalogo-busca-campo">
          <input
            id="catalogo-busca-campo"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Ex.: protetor solar, Nivea, dipirona"
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
          />
          {buscando ? (
            <button type="button" className="catalogo-busca-limpar" onClick={() => setConsulta("")} aria-label="Limpar busca">
              ×
            </button>
          ) : null}
        </div>
        <p className="catalogo-busca-status" role="status" aria-live="polite">
          {buscando ? (total === 0 ? "Nenhum produto encontrado." : `${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"}.`) : ""}
        </p>
      </form>

      {total === 0 ? (
        <p className="catalogo-vazio">
          Não achamos esse produto na lista. A loja pode ter outros itens: pergunte no{" "}
          <a href={whatsappHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unitId} data-track-source="produtos_nacoes_busca_vazia">
            WhatsApp
          </a>
          .
        </p>
      ) : (
        <>
          <ul className="catalogo-chips" aria-label="Categorias">
            {visiveis.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`}>
                  {g.categoria} ({g.itens.length})
                </a>
              </li>
            ))}
          </ul>
          {visiveis.map((g) => (
            <section key={g.id} className="catalogo-grupo" aria-labelledby={g.id}>
              <h3 id={g.id}>{g.categoria}</h3>
              <ul className="catalogo-lista">
                {g.itens.map((item) => (
                  <li key={item.nome} className="catalogo-item">
                    {item.foto ? <img className="catalogo-foto" src={item.foto} alt={item.nome} width="80" height="80" loading="lazy" decoding="async" /> : null}
                    <div className="catalogo-info">
                      <h4>{item.nome}</h4>
                      {item.lab ? <p className="catalogo-lab">{item.lab}</p> : null}
                      {item.isMIP ? (
                        <p className="catalogo-mip">Medicamento isento de prescrição. Leia a bula. Se persistirem os sintomas, o médico deverá ser consultado.</p>
                      ) : null}
                      <a
                        className="catalogo-acao"
                        href={hrefDoItem(item.nome, item.precoFmt)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Confirmar ${item.nome} no WhatsApp`}
                        data-track-event="whatsapp_click"
                        data-track-unit={unitId}
                        data-track-source="produtos_nacoes_item"
                      >
                        Confirmar no WhatsApp
                      </a>
                    </div>
                    <strong className="catalogo-preco">{item.precoFmt}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
