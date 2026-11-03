"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useState, useSyncExternalStore } from "react";
import BrandStrip from "../BrandStrip";
import { trackEvent } from "../analytics";
import { listarBairros, lojaDoBairro } from "../entrega-bairro";
import { UNIT_GOOGLE_PROFILES } from "../google-reviews";
import { readPreferredUnitId } from "../preferred-unit";
import { buildWhatsAppUrl, PAYMENT_ACCEPTED, UNITS, type Unit } from "../site-config";
import UnitStatusBadge from "../UnitStatusBadge";
import { IconCartao, IconCheckCirculo, IconEstrela, IconInfo, IconLoja, IconMais, IconMenos, IconMoto, IconSelo, IconVoltar, IconWhats } from "./ReservaIcons";
import { atualizarReserva, definirQtd, formatarCentavos, mensagemReserva, subtotalCentavos, totalItens, type ModoReserva } from "./reserva-store";
import { useReserva } from "./useReserva";

type Passo = 1 | 2 | 3;
const ROTULOS = ["Itens", "Loja e forma de receber", "Enviar"] as const;
const BAIRROS = listarBairros(UNITS);

/**
 * Reserva em 3 passos, igual ao protótipo: 1 Itens, 2 Loja e forma de receber (retirar ou receber em casa),
 * 3 Revisar e enviar pelo WhatsApp. Nada é cobrado. Nome e endereço ficam só na mensagem e nunca no analytics.
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
  const subtotal = formatarCentavos(subtotalCentavos(estado.itens));

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
    trackEvent("reserva_revisar", { modo, itens: estado.itens.length });
    ir(3);
  }

  const titulo = passo === 1 ? "Minha reserva" : passo === 2 ? (retirar ? "Loja e retirada" : "Entrega") : "Revisar e enviar";

  if (estado.itens.length === 0) {
    return (
      <div className="fluxo-reserva">
        <header className="fluxo-topo">
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
          <h1>Minha reserva</h1>
        </header>
        <BrandStrip semSacola />
        <div className="fluxo-vazio">
          <strong>Sua reserva ainda está vazia. Bora escolher?</strong>
          <p>Separa pra você: reserve aqui e pague só quando retirar.</p>
          <a className="fluxo-botao" href="/nacoes-unidas/produtos">Ver produtos</a>
        </div>
      </div>
    );
  }

  const mensagem = mensagemReserva(unidade.shortName, estado.itens, { modo, nome, bairro, rua, pagamento, taxaEntregaCentavos: retirar ? 0 : 100 });
  const href = buildWhatsAppUrl(unidade, mensagem, { campaign: "reserva", content: `reserva_${unidade.id}` });

  return (
    <div className="fluxo-reserva">
      <header className="fluxo-topo">
        {passo === 1 ? (
          <a className="fluxo-voltar" href="/nacoes-unidas/produtos" aria-label="Voltar para os produtos"><IconVoltar size={26} /></a>
        ) : (
          <button type="button" className="fluxo-voltar" aria-label="Voltar" onClick={() => ir((passo - 1) as Passo)}><IconVoltar size={26} /></button>
        )}
        <h1>{titulo}</h1>
      </header>
      <BrandStrip semSacola />

      <div className="fluxo-progresso" role="img" aria-label={`Passo ${passo} de 3`}>
        {[1, 2, 3].map((n) => <span key={n} className={n <= passo ? "is-on" : ""} />)}
      </div>
      <p className="fluxo-passo">Passo {passo} de 3 · {ROTULOS[passo - 1]}</p>

      {passo === 1 ? (
        <div className="fluxo-conteudo">
          <ul className="fluxo-itens">
            {estado.itens.map((item) => (
              <li key={item.id}>
                <span className="fluxo-item-foto">{item.foto ? <img src={item.foto} alt="" width="64" height="64" /> : null}</span>
                <div>
                  <strong className="fluxo-item-nome">{item.nome}</strong>
                  <p className="fluxo-item-preco"><b>{formatarCentavos(item.precoCentavos)}</b> <small>cada</small></p>
                  <div className="fluxo-item-acoes">
                    <div className="reservar-contador fluxo-contador" role="group" aria-label={`Quantidade de ${item.nome}`}>
                      <button type="button" aria-label={`Diminuir ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, Math.max(1, item.qtd - 1)))}><IconMenos size={20} /></button>
                      <output aria-live="polite">{item.qtd}</output>
                      <button type="button" aria-label={`Aumentar ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd + 1))}><IconMais size={20} /></button>
                    </div>
                    <button type="button" className="fluxo-remover" aria-label={`Remover ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, 0))}>Remover</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="fluxo-aviso fluxo-aviso-info">
            <IconInfo size={28} />
            <span><strong>Isto é uma reserva, não uma compra.</strong> A loja confirma preço e estoque pelo WhatsApp. Você paga no balcão (retirada) ou na entrega.</span>
          </p>

          <section className="fluxo-resumo" aria-label="Resumo da reserva">
            <p><span>{total} {total === 1 ? "item" : "itens"}</span><span>Itens sem receita</span></p>
            <p className="fluxo-resumo-total"><strong>Subtotal estimado</strong><strong>{subtotal}</strong></p>
            <small>Preço e estoque confirmados pela loja no WhatsApp. Nenhum pagamento é feito neste site.</small>
          </section>

          <div className="fluxo-rodape">
            <button type="button" className="fluxo-botao" onClick={() => ir(2)}>Continuar: escolher loja</button>
            <a className="fluxo-botao fluxo-botao-vazado" href="/nacoes-unidas/produtos"><IconMais size={20} /> Adicionar mais itens</a>
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
              <p className="fluxo-aviso">
                <IconCartao size={28} />
                <span><strong>Pagamento no balcão</strong>, ao retirar. A loja aceita {PAYMENT_ACCEPTED.replace(/, ([^,]+)$/, " e $1")}.</span>
              </p>
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
                  <IconCheckCirculo size={28} />
                  <span>
                    <strong>Sim, entregamos em {bairro}.</strong> A entrega sai da loja {unidadeEntrega.shortName}. Taxa e prazo são confirmados no WhatsApp da loja antes de fechar o pedido.
                    {unidadeEntrega.deliveryExclusive ? <small>Esta loja entrega somente no bairro {unidadeEntrega.deliveryAreas.join(", ")}{unidadeEntrega.ifoodUrl ? " e também está no iFood" : ""}.</small> : null}
                  </span>
                </p>
              ) : null}
              <p className="fluxo-nota-bairro">Outro bairro? Hoje a entrega é feita só nos bairros da lista. Escolha “Retirar na loja” e busque no balcão.</p>
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
              <p className="fluxo-aviso">
                <IconCartao size={28} />
                <span><strong>Pagamento na entrega.</strong> A loja aceita Pix, dinheiro, débito ou crédito. Confirme no WhatsApp.</span>
              </p>
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
          <p className="fluxo-aviso">
            <IconCheckCirculo size={28} />
            <span>Ao tocar no botão, o WhatsApp abre com esta mensagem pronta. <strong>Nada é cobrado agora:</strong> a loja responde com preço, estoque e prazo.</span>
          </p>
          <h2>Depois de enviar</h2>
          <ol className="fluxo-passos">
            <li><span className="fluxo-n">1</span><p>A loja confirma o <strong>preço e o estoque</strong> pelo WhatsApp, dentro do horário de atendimento da loja.</p></li>
            <li><span className="fluxo-n">2</span><p>O farmacêutico separa o seu pedido.</p></li>
            <li><span className="fluxo-n">3</span><p>Você <strong>paga no balcão</strong> ao retirar (ou na entrega).</p></li>
          </ol>
          <p className="fluxo-legal">Aqui só itens sem receita: medicamentos isentos de prescrição (MIPs), higiene e dermocosméticos. Leia a bula. Em caso de dúvida, procure o farmacêutico.</p>
          <div className="fluxo-rodape">
            <p className="fluxo-rt"><IconSelo size={22} /><span>Responsável técnico da loja Nações Unidas: <strong>João</strong> · CRF/MG <strong>31958</strong>. Farmacêutico presente em todo o horário.</span></p>
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
            <button type="button" className="fluxo-link" onClick={() => ir(1)}>Editar minha reserva</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
