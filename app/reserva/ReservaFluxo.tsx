"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useState, useSyncExternalStore } from "react";
import BrandLogo from "../BrandLogo";
import BrandStrip from "../BrandStrip";
import { trackEvent } from "../analytics";
import { listarBairros, lojaDoBairro } from "../entrega-bairro";
import { UNIT_GOOGLE_PROFILES } from "../google-reviews";
import { readPreferredUnitId } from "../preferred-unit";
import { buildWhatsAppUrl, UNITS, type Unit } from "../site-config";
import UnitStatusBadge from "../UnitStatusBadge";
import { IconCheckCirculo, IconEstrela, IconLixeira, IconLoja, IconMais, IconMenos, IconMoto, IconSacola, IconSelo, IconVoltar, IconWhats } from "./ReservaIcons";
import DestaquesSemana from "../shop/DestaquesSemana";
import { atualizarReserva, definirQtd, definirSelecao, descontoCentavos, itemAtivo, selecionarTodos, formatarCentavos, limpar, subtotalDeTabelaCentavos, TAXA_ENTREGA_CENTAVOS, mensagemReserva, subtotalCentavos, totalItens, type ModoReserva } from "./reserva-store";
import { useReserva } from "./useReserva";

type Passo = 1 | 2 | 3;
const ROTULOS = ["Itens", "Loja e forma de receber", "Enviar"] as const;
const BAIRROS = listarBairros(UNITS);

/**
 * Reserva em 3 passos, igual ao protótipo: 1 Itens, 2 Loja e forma de receber (retirar ou receber em casa),
 * 3 Revisar e enviar pelo WhatsApp. Nome e endereço ficam só na mensagem e nunca no analytics.
 */
export default function ReservaFluxo() {
  const estado = useReserva();
  const [passo, setPasso] = useState<Passo>(1);
  const preferida = useSyncExternalStore(
    (fn) => {
      window.addEventListener("uf-preferred-unit", fn);
      return () => window.removeEventListener("uf-preferred-unit", fn);
    },
    () => readPreferredUnitId(),
    () => null,
  );
  const [escolhida, setLojaId] = useState<Unit["id"] | null>(null);
  const lojaId: Unit["id"] = escolhida ?? preferida ?? "nacoes";
  const [nome, setNome] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [tentou, setTentou] = useState(false);

  const modo = estado.modo;
  const retirar = modo === "retirar";
  const unidadeEntrega = bairro ? lojaDoBairro(UNITS, bairro) : null;
  const unidade = (retirar ? UNITS.find((u) => u.id === lojaId) : unidadeEntrega) ?? UNITS[0];
  const total = totalItens(estado);
  const marcados = estado.itens.filter(itemAtivo).length;
  const todosMarcados = marcados === estado.itens.length;
  const subtotal = formatarCentavos(subtotalCentavos(estado.itens));
  const taxaEntrega = retirar ? 0 : TAXA_ENTREGA_CENTAVOS;
  const totalComTaxa = formatarCentavos(subtotalCentavos(estado.itens) + taxaEntrega);
  const descontos = descontoCentavos(estado.itens);
  const subtotalTabela = formatarCentavos(subtotalDeTabelaCentavos(estado.itens));

  const nomeOk = nome.trim().length >= 2;
  const valido = retirar ? nomeOk : nomeOk && rua.trim().length >= 3 && unidadeEntrega !== null;

  function ir(proximo: Passo) {
    setPasso(proximo);
    setTentou(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function revisar() {
    if (!valido) {
      setTentou(true);
      return;
    }
    trackEvent("reserva_revisar", { modo, itens: estado.itens.filter(itemAtivo).length });
    ir(3);
  }

  const titulo = passo === 1 ? "Minha cesta" : passo === 2 ? (retirar ? "Loja e retirada" : "Entrega") : "Revisar e enviar";

  if (estado.itens.length === 0) {
    return (
      <div className="fluxo-reserva">
        <header className="fluxo-topo">
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
          <h1>Minha cesta</h1>
        </header>
        <BrandStrip semSacola />
        <div className="fluxo-vazio">
          <strong>Sua cesta ainda está vazia. Bora escolher?</strong>
          <p>Escolha seus produtos e pague só quando retirar.</p>
          <a className="fluxo-botao" href="/nacoes-unidas/produtos">Ver produtos</a>
        </div>
      </div>
    );
  }

  const mensagem = mensagemReserva(unidade.shortName, estado.itens, { modo, nome, bairro, rua, pagamento, taxaEntregaCentavos: retirar ? 0 : 100 });
  const href = buildWhatsAppUrl(unidade, mensagem, { campaign: "reserva", content: `reserva_${unidade.id}` });

  return (
    <div className="fluxo-reserva">
      <div className="cesta-faixa">
        <a className="cesta-logo" href="/" aria-label="União Farma, página inicial"><BrandLogo priority width={44} height={44} /><span>União Farma</span></a>
        <ol className="cesta-passos" role="img" aria-label={`Passo ${passo} de 3`}>
          {[{ n: 1, r: "Cesta", i: <IconSacola size={26} /> }, { n: 2, r: "Loja", i: <IconLoja size={26} /> }, { n: 3, r: "Enviar", i: <IconWhats size={26} /> }].map((e) => (
            <li key={e.n} className={e.n <= passo ? "is-on" : ""}><span aria-hidden="true">{e.i}</span><em>{e.r}</em></li>
          ))}
        </ol>
        <div className="cesta-contato">
          <a href={`https://wa.me/${UNITS[0].whatsappDigits}`} aria-label="Falar com a União Farma no WhatsApp"><IconWhats size={22} /><span>WhatsApp<strong>{UNITS.find((u) => u.id === "nacoes")?.whatsapp}</strong></span></a>
        </div>
      </div>
      <header className="fluxo-topo">
        {passo === 1 ? (
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
        ) : (
          <button type="button" className="fluxo-voltar" aria-label="Voltar" onClick={() => ir((passo - 1) as Passo)}><IconVoltar size={26} /></button>
        )}
        <h1>{titulo}</h1>
        <a className="fluxo-continuar-comprando" href="/nacoes-unidas/produtos">Continuar comprando</a>
      </header>
      <div className="fluxo-brandstrip"><BrandStrip semSacola /></div>

      <div className="fluxo-progresso" role="img" aria-label={`Passo ${passo} de 3`}>
        {[1, 2, 3].map((n) => <span key={n} className={n <= passo ? "is-on" : ""} />)}
      </div>
      <ol className="fluxo-progresso-rotulos" aria-hidden="true">
        {["Cesta", "Loja", "Enviar"].map((r, i) => <li key={r} className={i + 1 <= passo ? "is-on" : ""}>{r}</li>)}
      </ol>
      <p className="fluxo-passo">Passo {passo} de 3 · {ROTULOS[passo - 1]}{passo === 1 ? ` · ${total} ${total === 1 ? "item" : "itens"} na cesta` : ""}</p>

      {passo === 1 ? (
        <div className="fluxo-conteudo fluxo-conteudo-cesta">
          <div className="fluxo-coluna-itens">
            <div className="fluxo-titulo-cesta">
              <label className="fluxo-check fluxo-check-todos">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  ref={(el) => { if (el) el.indeterminate = marcados > 0 && !todosMarcados; }}
                  onChange={(e) => atualizarReserva((s) => selecionarTodos(s, e.target.checked))}
                />
                <span>Todos os produtos</span>
              </label>
              <p>{total} {total === 1 ? "item" : "itens"} na cesta</p>
            </div>
            <div className="fluxo-tabela">
              <p className="fluxo-colunas" aria-hidden="true"><span>Produto</span><span>Preço</span><span>Quantidade</span><span>Total</span><span /></p>
              <ul className="fluxo-itens">
                {estado.itens.map((item) => {
                  const temDe = !!item.deCentavos && item.deCentavos > item.precoCentavos;
                  return (
                    <li key={item.id} className={itemAtivo(item) ? undefined : "is-fora"}>
                      <div className="cel-produto">
                        <label className="fluxo-check">
                          <input type="checkbox" aria-label={`Incluir ${item.nome}`} checked={itemAtivo(item)} onChange={(e) => atualizarReserva((s) => definirSelecao(s, item.id, e.target.checked))} />
                        </label>
                        <span className="fluxo-item-foto">{item.foto ? <img src={item.foto} alt="" width="64" height="64" /> : null}<b className="fluxo-item-qtd" aria-hidden="true">{item.qtd}</b></span>
                        <div>
                          <strong className="fluxo-item-nome">{item.nome}</strong>
                          <p className="fluxo-item-loja">Vendido e entregue por <b>União Farma</b> · {UNITS.find((u) => u.id === item.unitId)?.shortName ?? ""}</p>
                        </div>
                      </div>
                      <div className="cel-preco">
                        {temDe ? <span className="fluxo-item-tag">↓ {Math.round((1 - item.precoCentavos / item.deCentavos!) * 100)}%</span> : null}
                        {temDe ? <s className="fluxo-item-de">{formatarCentavos(item.deCentavos!)}</s> : null}
                        <b>{formatarCentavos(item.precoCentavos)}</b>
                      </div>
                      <div className="cel-qtd">
                        <div className="reservar-contador fluxo-contador" role="group" aria-label={`Quantidade de ${item.nome}`}>
                          {item.qtd > 1 ? <button type="button" aria-label={`Diminuir ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd - 1))}><IconMenos size={18} /></button> : null}
                          <output aria-live="polite">{item.qtd}</output>
                          <button type="button" aria-label={`Aumentar ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd + 1))}><IconMais size={18} /></button>
                        </div>
                      </div>
                      <div className="cel-total">
                        {temDe ? <s className="fluxo-item-de">{formatarCentavos(item.deCentavos! * item.qtd)}</s> : null}
                        <b>{formatarCentavos(item.precoCentavos * item.qtd)}</b>
                      </div>
                      <div className="cel-remover">
                        <button type="button" className="fluxo-lixeira" aria-label={`Remover ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, 0))}><IconLixeira size={20} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="fluxo-links">
              <button type="button" className="fluxo-link-quieto" onClick={() => atualizarReserva(limpar)}>Esvaziar minha cesta</button>
              <a className="fluxo-link-quieto" href="/nacoes-unidas/produtos">Adicionar mais itens</a>
            </div>
          </div>

          <aside className="fluxo-coluna-resumo">
            <section className="fluxo-resumo" aria-label="Resumo da cesta">
              <p className="fluxo-resumo-titulo">Resumo da sua cesta</p>
              <p><span>Subtotal</span><span>{descontos > 0 ? subtotalTabela : subtotal}</span></p>
              {descontos > 0 ? <p className="fluxo-resumo-desconto"><span>Descontos</span><span>- {formatarCentavos(descontos)}</span></p> : null}
              <p><span>Taxa de entrega</span><span>{formatarCentavos(taxaEntrega)}</span></p>
              <p className="fluxo-resumo-total"><strong>Total estimado</strong><strong>{totalComTaxa}</strong></p>
              <button type="button" className="fluxo-botao fluxo-botao-resumo" disabled={marcados === 0} onClick={() => ir(2)}>Continuar: escolher loja</button>
            </section>
          </aside>

          <div className="fluxo-vitrine"><DestaquesSemana titulo="Aproveite também" verTodas={false} source="reserva_vitrine" /></div>

          <div className="fluxo-rodape fluxo-rodape-total">
            <p className="fluxo-barra-total"><span>Total estimado</span><strong>{totalComTaxa}</strong></p>
            <button type="button" className="fluxo-botao" disabled={marcados === 0} onClick={() => ir(2)}>Continuar: escolher loja</button>
          </div>
        </div>
      ) : null}

      {passo === 2 ? (
        <div className="fluxo-conteudo">
          <h2>Como quer receber?</h2>
          <div className="fluxo-modo" role="group" aria-label="Como quer receber?">
            {(["retirar", "casa"] as ModoReserva[]).map((m) => (
              <button key={m} type="button" aria-pressed={modo === m} className={modo === m ? "is-on" : ""} onClick={() => atualizarReserva((s) => ({ ...s, modo: m }))}>
                {m === "retirar" ? <IconLoja size={24} /> : <IconMoto size={24} />}
                {m === "retirar" ? "Retirar na loja" : "Entrega"}
              </button>
            ))}
          </div>

          {retirar ? (
            <>
              <h2>Escolha a loja</h2>
              <div className="fluxo-lojas" role="radiogroup" aria-label="Escolha a loja">
                {UNITS.filter((u) => u.id === "nacoes").map((u) => {
                  const perfil = UNIT_GOOGLE_PROFILES.find((p) => p.unitId === u.id);
                  return (
                    <label key={u.id} className={lojaId === u.id ? "fluxo-loja is-on" : "fluxo-loja"}>
                      <input type="radio" name="loja" checked={lojaId === u.id} onChange={() => setLojaId(u.id)} />
                      <span className="fluxo-radio" aria-hidden="true" />
                      <span className="fluxo-loja-corpo">
                        <strong>{u.shortName}</strong>
                        <span>{u.shortAddress}</span>
                        {perfil?.rating != null ? (
                          <span className="fluxo-nota"><IconEstrela size={16} /> {perfil.rating.toFixed(1).replace(".", ",")} · {perfil.reviewCount} avaliações no Google</span>
                        ) : null}
                        <small>{u.hoursSummary}</small>
                        <UnitStatusBadge unit={u} />
                      </span>
                    </label>
                  );
                })}
              </div>
              <h2>Quem vai retirar?</h2>
              <label className="fluxo-campo">
                <span>Seu nome</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome para a retirada" autoComplete="name" aria-invalid={tentou && !nomeOk} />
              </label>
              {tentou && !nomeOk ? <p className="fluxo-erro" role="alert">Informe o nome de quem vai retirar.</p> : null}
            </>
          ) : (
            <>
              <h2>Mora em Sabará? Entregamos no seu bairro.</h2>
              <label className="fluxo-campo">
                <span>Escolha o seu bairro</span>
                <select value={bairro} onChange={(e) => { setBairro(e.target.value); trackEvent("delivery_check", { source: "reserva", covered: lojaDoBairro(UNITS, e.target.value) !== null }); }} aria-invalid={tentou && !unidadeEntrega}>
                  <option value="">Selecione</option>
                  {BAIRROS.map((b) => <option key={b.bairro} value={b.bairro}>{b.bairro}</option>)}
                </select>
              </label>
              {unidadeEntrega ? (
                <p className="fluxo-aviso fluxo-aviso-ok" role="status">
                  <IconCheckCirculo size={24} />
                  <span>Entrega pela União Farma <strong>{unidadeEntrega.shortName}</strong>.</span>
                </p>
              ) : null}
              {tentou && !unidadeEntrega ? <p className="fluxo-erro" role="alert">Escolha um bairro da lista para continuar.</p> : null}
              <h2>Dados para a entrega</h2>
              <label className="fluxo-campo">
                <span>Seu nome</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" autoComplete="name" aria-invalid={tentou && !nomeOk} />
              </label>
              <label className="fluxo-campo">
                <span>Rua e número</span>
                <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Ex.: Rua Inglaterra, 100" autoComplete="street-address" aria-invalid={tentou && rua.trim().length < 3} />
              </label>
              {tentou && (!nomeOk || rua.trim().length < 3) ? <p className="fluxo-erro" role="alert">Preencha o nome e a rua com número.</p> : null}
              <label className="fluxo-campo">
                <span>Forma de pagamento</span>
                <select value={pagamento} onChange={(e) => setPagamento(e.target.value)} required>
                  <option value="">Selecione</option>
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de débito">Cartão de débito</option>
                  <option value="Cartão de crédito">Cartão de crédito</option>
                </select>
              </label>
            </>
          )}

          <div className="fluxo-rodape">
            <button type="button" className="fluxo-botao" onClick={revisar}>Revisar pedido</button>
          </div>
        </div>
      ) : null}

      {passo === 3 ? (
        <div className="fluxo-conteudo">
          <h2>Prévia da mensagem</h2>
          <p className="fluxo-destino">Vai para o WhatsApp da União Farma {unidade.shortName}: <strong>{unidade.whatsapp}</strong></p>
          <div className="fluxo-bolha">
            <pre>{mensagem}</pre>
            <time>agora</time>
          </div>
          <div className="fluxo-rodape">
            <a
              className="fluxo-botao"
              href={href}
              target="_blank"
              rel="noreferrer"
              data-track-event="whatsapp_click"
              data-track-unit={unidade.id}
              data-track-source="reserva_envio"
            >
              <IconWhats size={26} /> Enviar pedido pelo WhatsApp
            </a>
            <button type="button" className="fluxo-link" onClick={() => ir(1)}>Editar minha cesta</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
