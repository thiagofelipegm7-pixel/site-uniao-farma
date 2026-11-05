"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useState, useSyncExternalStore } from "react";
import MarcaUniao from "../shop/MarcaUniao";
import { trackEvent } from "../analytics";
import { listarBairros, lojaDoBairro } from "../entrega-bairro";
import { readPreferredUnitId } from "../preferred-unit";
import { buildWhatsAppUrl, PUBLIC_UNITS, type Unit } from "../site-config";
import UnitStatusBadge from "../UnitStatusBadge";
import { IconLixeira, IconMais, IconMenos, IconSacola, IconLoja, IconVoltar, IconWhats, IconCesta, IconCaminhao, IconConfirmado } from "./ReservaIcons";
import DestaquesSemana from "../shop/DestaquesSemana";
import { atualizarReserva, definirQtd, exigeReceita, definirSelecao, descontoCentavos, FORMAS_PAGAMENTO, itemAtivo, selecionarTodos, formatarCentavos, limpar, subtotalDeTabelaCentavos, taxaDoBairro, TAXA_ENTREGA_CENTAVOS, mensagemReserva, subtotalCentavos, totalItens } from "./reserva-store";
import { useReserva } from "./useReserva";

type Passo = 1 | 2 | 3;
const ROTULOS = ["Itens", "Entrega e forma de receber", "Finalizar"] as const;
const BAIRROS = listarBairros(PUBLIC_UNITS);

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
  const [editando, setEditando] = useState(true);

  // Medicamento com receita ou controlado na cesta: só retirada na loja, com a receita.
  const soRetirada = exigeReceita(estado.itens);
  const modo = soRetirada ? "retirar" : estado.modo;
  const retirar = modo === "retirar";
  const unidadeEntrega = bairro ? lojaDoBairro(PUBLIC_UNITS, bairro) : null;
  const unidade = (retirar ? PUBLIC_UNITS.find((u) => u.id === lojaId) : unidadeEntrega) ?? PUBLIC_UNITS[0];
  const total = totalItens(estado);
  const marcados = estado.itens.filter(itemAtivo).length;
  const todosMarcados = marcados === estado.itens.length;
  const subtotal = formatarCentavos(subtotalCentavos(estado.itens));
  const taxaDoLocal = taxaDoBairro(bairro);
  const taxaEntrega = retirar ? 0 : (taxaDoLocal ?? 0);
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

  const mostrarForm = editando || !valido;

  function salvar() {
    if (valido) setEditando(false);
    else setTentou(true);
  }

  function revisar() {
    if (!valido) {
      setTentou(true);
      return;
    }
    trackEvent("reserva_revisar", { modo, itens: estado.itens.filter(itemAtivo).length });
    ir(3);
  }

  const titulo = passo === 1 ? "Minha cesta" : passo === 2 ? "Entrega ou retirada" : "Revisar e enviar";

  if (estado.itens.length === 0) {
    return (
      <div className="fluxo-reserva">
        <header className="fluxo-topo">
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
          <h1>Minha cesta</h1>
        </header>
        <div className="fluxo-vazio">
          <strong>Sua cesta ainda está vazia. Bora escolher?</strong>
          <p>Escolha seus produtos e pague só quando retirar.</p>
          <a className="fluxo-botao" href="/nacoes-unidas/produtos">Ver produtos</a>
        </div>
      </div>
    );
  }

  const tabelaItens = (
    <>
        <p className="entrega-colunas" aria-hidden="true"><span>Item</span><span>Preço</span><span>Quantidade</span><span>Total</span></p>
        <ul className="entrega-itens">
          {estado.itens.filter(itemAtivo).map((item) => (
            <li key={item.id}>
              <div className="entrega-item-prod">
                <span className="fluxo-item-foto">{item.foto ? <img src={item.foto} alt="" width="52" height="52" /> : null}<b className="fluxo-item-qtd" aria-hidden="true">{item.qtd}</b></span>
                <strong className="fluxo-item-nome">{item.nome}{item.receita ? <span className="fluxo-item-receita">{item.receita === "controlado" ? "Controlado · receita retida" : "Exige receita"}</span> : null}</strong>
              </div>
              <span className="entrega-item-preco">{formatarCentavos(item.precoCentavos)}</span>
              <span className="entrega-item-qtd">{item.qtd} {item.qtd === 1 ? "unidade" : "unidades"}</span>
              <b className="entrega-item-total">{formatarCentavos(item.precoCentavos * item.qtd)}</b>
            </li>
          ))}
        </ul>
    </>
  );

  const enviarWhats = (classe: string) => pagamento ? (
    <a className={classe} href={href} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unidade.id} data-track-source="reserva_envio">
      <IconWhats size={24} /> Enviar pedido pelo WhatsApp
    </a>
  ) : (
    <button type="button" className={classe} disabled><IconWhats size={24} /> Enviar pedido pelo WhatsApp</button>
  );

  const mensagem = mensagemReserva(unidade.shortName, estado.itens, { modo, nome, bairro, rua, pagamento, taxaEntregaCentavos: taxaEntrega });
  const href = buildWhatsAppUrl(unidade, mensagem, { campaign: "reserva", content: `reserva_${unidade.id}` });

  return (
    <div className="fluxo-reserva">
      <div className="cesta-faixa">
        <a className="cesta-logo" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial"><MarcaUniao /></a>
        <ol className="cesta-passos" role="img" aria-label={`Passo ${passo} de 3`}>
          {[{ n: 1, r: "Cesta", i: <IconCesta size={26} /> }, { n: 2, r: "Entrega", i: <IconCaminhao size={26} /> }, { n: 3, r: "Finalizar", i: <IconConfirmado size={26} /> }].map((e) => (
            <li key={e.n} className={e.n <= passo ? "is-on" : ""}><span aria-hidden="true">{e.i}</span><em>{e.r}</em></li>
          ))}
        </ol>
        <div className="cesta-contato">
          <a href={`https://wa.me/${PUBLIC_UNITS[0].whatsappDigits}`} aria-label="Falar com a União Farma no WhatsApp"><IconWhats size={22} /><span>WhatsApp<strong>{PUBLIC_UNITS.find((u) => u.id === "nacoes")?.whatsapp}</strong></span></a>
        </div>
      </div>
      <header className="fluxo-topo">
        {passo === 1 ? (
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
        ) : (
          <button type="button" className="fluxo-voltar" aria-label="Voltar" onClick={() => ir((passo - 1) as Passo)}><IconVoltar size={26} /></button>
        )}
        <h1>{titulo}</h1>
        {passo === 1 ? (
          <a className="fluxo-continuar-comprando" href="/nacoes-unidas/produtos">Continuar comprando</a>
        ) : (
          <button type="button" className="fluxo-continuar-comprando" onClick={() => ir((passo - 1) as Passo)}>Voltar</button>
        )}
      </header>

      <div className="fluxo-progresso" role="img" aria-label={`Passo ${passo} de 3`}>
        {[1, 2, 3].map((n) => <span key={n} className={n <= passo ? "is-on" : ""} />)}
      </div>
      <ol className="fluxo-progresso-rotulos" aria-hidden="true">
        {["Cesta", "Entrega", "Finalizar"].map((r, i) => <li key={r} className={i + 1 <= passo ? "is-on" : ""}>{r}</li>)}
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
                          {item.receita ? <p className="fluxo-item-receita">{item.receita === "controlado" ? "Controlado: retirada na loja, com a receita retida pela farmácia." : "Exige receita: retirada na loja, apresentando a receita."}</p> : null}
                          <p className="fluxo-item-loja">Vendido e entregue por <b>União Farma</b> · {PUBLIC_UNITS.find((u) => u.id === item.unitId)?.shortName ?? ""}</p>
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
        <div className="fluxo-conteudo fluxo-conteudo-cesta fluxo-entrega">
          <div className="fluxo-coluna-itens">
            <section className="entrega-endereco" aria-label="Dados da entrega">
              {mostrarForm ? (
                <div className="entrega-form">
                  <label className="fluxo-campo">
                    <span>Seu nome</span>
                    <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={retirar ? "Nome para a retirada" : "Nome completo"} autoComplete="name" aria-invalid={tentou && !nomeOk} />
                  </label>
                  {!retirar ? (
                    <>
                      <label className="fluxo-campo">
                        <span>Bairro</span>
                        <select value={bairro} onChange={(e) => { setBairro(e.target.value); trackEvent("delivery_check", { source: "reserva", covered: lojaDoBairro(PUBLIC_UNITS, e.target.value) !== null }); }} aria-invalid={tentou && !unidadeEntrega}>
                          <option value="">Selecione</option>
                          {BAIRROS.map((b) => <option key={b.bairro} value={b.bairro}>{b.bairro} · {formatarCentavos(taxaDoBairro(b.bairro) ?? 0)}</option>)}
                        </select>
                      </label>
                      <label className="fluxo-campo">
                        <span>Rua e número</span>
                        <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Ex.: Rua Inglaterra, 100" autoComplete="street-address" aria-invalid={tentou && rua.trim().length < 3} />
                      </label>
                    </>
                  ) : null}
                  {tentou && !valido ? <p className="fluxo-erro" role="alert">{retirar ? "Informe o nome de quem vai retirar." : "Preencha o nome, escolha o bairro da lista e informe a rua com número."}</p> : null}
                  <button type="button" className="entrega-btn" onClick={salvar}>Salvar</button>
                </div>
              ) : (
                <div className="entrega-end">
                  <div className="entrega-end-texto">
                    <strong>{nome.trim()}</strong>
                    {!retirar ? <span>{rua.trim()}</span> : null}
                    <span>{retirar ? `Retirada na União Farma ${unidade.shortName}` : `${bairro}, Sabará - MG`}</span>
                  </div>
                  <button type="button" className="entrega-btn entrega-btn-alterar" onClick={() => setEditando(true)}>Alterar</button>
                </div>
              )}
            </section>

            <p className="entrega-titulo" role="heading" aria-level={2}>Retire ou receba sua compra</p>
            <div className="entrega-pacote">
              <p className="entrega-topbar"><IconSacola size={20} /><span>Vendido e entregue por <strong>União Farma</strong></span></p>
              <div className="entrega-miolo">
                {tabelaItens}

                <p className="entrega-opcoes-titulo" role="heading" aria-level={3}>Selecione uma opção</p>
                <div role="radiogroup" aria-label="Selecione uma opção">
                  <label className={retirar ? "entrega-opcao is-on" : "entrega-opcao"}>
                    <input type="radio" name="forma" checked={retirar} onChange={() => atualizarReserva((s) => ({ ...s, modo: "retirar" }))} />
                    <span className="entrega-tipo">Retirada em loja</span>
                    <span className="entrega-periodo">retire na loja que escolher</span>
                    <span className="entrega-preco entrega-preco-gratis">Grátis</span>
                  </label>
                  {retirar ? (
                    <div className="entrega-lojas" role="radiogroup" aria-label="Escolha a loja">
                      {PUBLIC_UNITS.filter((u) => u.id === "nacoes").map((u) => (
                        <label key={u.id} className={lojaId === u.id ? "entrega-loja is-on" : "entrega-loja"}>
                          <input type="radio" name="loja" checked={lojaId === u.id} onChange={() => setLojaId(u.id)} />
                          <span className="entrega-loja-corpo">
                            <strong>{u.shortName}</strong>
                            <span>{u.shortAddress}</span>
                            <UnitStatusBadge unit={u} />
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {soRetirada ? <p className="fluxo-aviso-receita" role="note">Sua cesta tem medicamento com receita ou controlado: a retirada é na loja, com a receita. Entrega indisponível.</p> : null}
                  <label className={retirar ? "entrega-opcao" : "entrega-opcao is-on"} aria-disabled={soRetirada}>
                    <input type="radio" name="forma" checked={!retirar} disabled={soRetirada} onChange={() => atualizarReserva((s) => ({ ...s, modo: "casa" }))} />
                    <span className="entrega-tipo">Entrega no seu bairro</span>
                    <span className="entrega-periodo">{unidadeEntrega ? `pela União Farma ${unidadeEntrega.shortName}` : "receba em casa, em Sabará"}</span>
                    <span className="entrega-preco">{taxaDoLocal !== null ? formatarCentavos(taxaDoLocal) : `a partir de ${formatarCentavos(TAXA_ENTREGA_CENTAVOS)}`}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <aside className="fluxo-coluna-resumo">
            <section className="fluxo-resumo" aria-label="Resumo da cesta">
              <p className="fluxo-resumo-titulo">Resumo da sua cesta</p>
              <p><span>Subtotal</span><span>{descontos > 0 ? subtotalTabela : subtotal}</span></p>
              {descontos > 0 ? <p className="fluxo-resumo-desconto"><span>Descontos</span><span>- {formatarCentavos(descontos)}</span></p> : null}
              <p><span>Taxa de entrega</span><span>{formatarCentavos(taxaEntrega)}</span></p>
              <p className="fluxo-resumo-total"><strong>Total estimado</strong><strong>{totalComTaxa}</strong></p>
              <button type="button" className="fluxo-botao fluxo-botao-resumo" onClick={revisar}>Revisar pedido</button>
            </section>
          </aside>

          <div className="fluxo-rodape fluxo-rodape-total">
            <p className="fluxo-barra-total"><span>Total estimado</span><strong>{totalComTaxa}</strong></p>
            <button type="button" className="fluxo-botao" onClick={revisar}>Revisar pedido</button>
          </div>
        </div>
      ) : null}

      {passo === 3 ? (
        <div className="fluxo-conteudo fluxo-conteudo-cesta fluxo-pagamento">
          <div className="fluxo-coluna-itens">
            <section className="entrega-endereco" aria-label="Dados do pedido">
              <div className="entrega-end">
                <div className="entrega-end-texto">
                  <strong>{nome.trim()}</strong>
                  {!retirar ? <span>{rua.trim()}</span> : null}
                  <span>{retirar ? `Retirada na União Farma ${unidade.shortName}` : `${bairro}, Sabará - MG`}</span>
                </div>
                <button type="button" className="entrega-btn entrega-btn-alterar" onClick={() => { setEditando(true); ir(2); }}>Alterar</button>
              </div>
            </section>

            <p className="entrega-titulo" role="heading" aria-level={2}>Revise seu pedido</p>
            <div className="entrega-pacote">
              <p className="entrega-topbar"><IconSacola size={20} /><span>Vendido e entregue por <strong>União Farma</strong></span></p>
              <div className="entrega-miolo">
                {tabelaItens}

                <p className="entrega-opcoes-titulo" role="heading" aria-level={3}>Forma de pagamento</p>
                <div role="radiogroup" aria-label="Forma de pagamento">
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <label key={forma} className={pagamento === forma ? "entrega-opcao entrega-opcao-simples is-on" : "entrega-opcao entrega-opcao-simples"}>
                      <input type="radio" name="pagamento" checked={pagamento === forma} onChange={() => setPagamento(forma)} />
                      <span className="entrega-tipo">{forma}</span>
                      <span className="entrega-periodo">{forma === "Pix" ? "pelo WhatsApp" : retirar ? "no balcão" : "na entrega"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <p className="entrega-titulo" role="heading" aria-level={2}>Prévia da mensagem</p>
            <div className="entrega-pacote">
              <div className="entrega-miolo">
                <p className="fluxo-destino">Vai para o WhatsApp da União Farma {unidade.shortName}: <strong>{unidade.whatsapp}</strong></p>
                <div className="fluxo-bolha">
                  <pre>{mensagem}</pre>
                  <time>agora</time>
                </div>
              </div>
            </div>
            <div className="fluxo-links">
              <button type="button" className="fluxo-link-quieto" onClick={() => ir(1)}>Editar minha cesta</button>
            </div>
          </div>

          <aside className="fluxo-coluna-resumo">
            <section className="fluxo-resumo" aria-label="Resumo da cesta">
              <p className="fluxo-resumo-titulo">Resumo da sua cesta</p>
              <p><span>Subtotal</span><span>{descontos > 0 ? subtotalTabela : subtotal}</span></p>
              {descontos > 0 ? <p className="fluxo-resumo-desconto"><span>Descontos</span><span>- {formatarCentavos(descontos)}</span></p> : null}
              <p><span>Taxa de entrega</span><span>{formatarCentavos(taxaEntrega)}</span></p>
              <p className="fluxo-resumo-total"><strong>Total estimado</strong><strong>{totalComTaxa}</strong></p>
              {enviarWhats("fluxo-botao fluxo-botao-resumo")}
            </section>
          </aside>

          <div className="fluxo-rodape fluxo-rodape-total">
            <p className="fluxo-barra-total"><span>Total estimado</span><strong>{totalComTaxa}</strong></p>
            {enviarWhats("fluxo-botao")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
