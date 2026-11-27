"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "../analytics";
import { nomeDeExibicao } from "../nome-exibicao";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { imagemIlustrativa } from "../nacoes-unidas/produtos/receita";
import {
  casarReceita,
  mensagemNaoEncontrados,
  prepararCatalogo,
  type CatalogoReceita,
  type ItemCasado,
  type ProdutoNormal,
  type ProdutoRestrito,
  type ResultadoMedicamento,
} from "../nacoes-unidas/produtos/receita-casar";
import { abrirReserva } from "../reserva/abrir-reserva";
import { IconCamera, IconClipe, IconFechar, IconImagem, IconWhats } from "../reserva/ReservaIcons";
import { formatarCentavos, totalItens } from "../reserva/reserva-store";
import ReservarBotao from "../reserva/ReservarBotao";
import { useReserva } from "../reserva/useReserva";
import { EVENTO_ABRIR_RECEITA, type ModoLeitor } from "./abrir-receita";
import { ErroImagem, prepararImagem } from "./imagem";
import { lerLocalmente } from "./leitor-local";
import { medicamentosDoTexto, remediosForaDoCatalogo } from "./texto-para-medicamentos";
import "./receita-foto.css";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const TEMPO_CLIENTE_MS = 35_000;
const nacoes = UNITS.find((u) => u.id === "nacoes");

type Medicamento = { nome: string; dosagem: string | null };
type Falha = "grande" | "formato" | "falha-foto" | "limite" | "rede" | "tempo" | "indisponivel" | "catalogo";
type Fase =
  | { tipo: "inicio" }
  | { tipo: "lendo"; previa: string | null }
  | { tipo: "erro"; motivo: Falha }
  | { tipo: "naoReceita" }
  | { tipo: "resultado"; resultados: ResultadoMedicamento[] };

const MENSAGENS: Record<Falha, string> = {
  grande: "Esta foto é muito grande. Tire outra foto ou escolha uma imagem menor.",
  formato: "Não consegui abrir este arquivo. Use uma foto JPG, PNG ou WebP, ou um PDF.",
  "falha-foto": "Não consegui preparar a foto neste aparelho. Tente tirar outra.",
  limite: "Muitas leituras seguidas. Aguarde alguns minutos ou fale com o farmacêutico pelo WhatsApp.",
  rede: "Sem conexão agora. Confira a internet e tente de novo.",
  tempo: "A leitura demorou demais. Tente de novo com uma foto mais nítida, ou fale com o farmacêutico.",
  indisponivel: "A leitura automática está indisponível agora. Fale com o farmacêutico pelo WhatsApp.",
  catalogo: "Não consegui carregar os produtos da loja. Tente de novo em instantes.",
};

let catalogoEmMemoria: Promise<CatalogoReceita> | null = null;

/** Carrega o catálogo (os mesmos arquivos da busca) uma vez por visita. */
function carregarCatalogo(): Promise<CatalogoReceita> {
  if (!catalogoEmMemoria) {
    const pegar = async <T,>(url: string): Promise<T[]> => {
      const r = await fetch(url, { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("catalogo");
      const dados: unknown = await r.json();
      if (!Array.isArray(dados)) throw new Error("catalogo");
      return dados as T[];
    };
    catalogoEmMemoria = Promise.all([pegar<ProdutoNormal>("/dados/nacoes/catalogo-busca.json"), pegar<ProdutoRestrito>("/dados/nacoes/restritos-busca.json")])
      .then(([normais, restritos]): CatalogoReceita => prepararCatalogo(normais, restritos))
      .catch((erro) => {
        catalogoEmMemoria = null;
        throw erro;
      });
  }
  return catalogoEmMemoria;
}

function CartaoItem({ item, principioAtivoSimilar }: { item: ItemCasado; principioAtivoSimilar?: string }) {
  if (item.tipo === "normal") {
    const nome = nomeDeExibicao(item.nome);
    return (
      <li className="receita-item">
        <span className="receita-item-foto">{item.foto ? <img src={item.foto} alt="" width="48" height="48" loading="lazy" /> : null}</span>
        <span className="receita-item-info">
          <strong>{nome}</strong>
          <span className="receita-item-preco">{formatarCentavos(item.precoCentavos)}</span>
        </span>
        <ReservarBotao unitId="nacoes" nome={nome} precoCentavos={item.precoCentavos} foto={item.foto} source="receita_foto" rotulo="Adicionar à cesta" />
      </li>
    );
  }
  const p = item.produto;
  const controlado = p.tipo === "controlados" || p.controlado;
  return (
    <li className="receita-item">
      <span className="receita-item-foto">
        <img src={imagemIlustrativa({ ...p, nome: p.nomeOriginal ?? p.nome })} alt="" width="48" height="48" loading="lazy" />
      </span>
      <span className="receita-item-info">
        <strong>{p.nome}</strong>
        <span className="receita-item-preco">{formatarCentavos(item.precoCentavos)}</span>
        {p.generico ? <em className="receita-selo">Genérico</em> : null}
        <em className={`receita-selo${controlado ? " is-controlado" : ""}`}>{controlado ? "Controlado · receita retida na loja" : "Exige receita · retirada na loja"}</em>
        {principioAtivoSimilar ? <em className="receita-selo receita-selo-similar">Mesmo princípio ativo ({principioAtivoSimilar}). {item.doseConfere === true ? "Dose descrita compatível com a receita; confira a apresentação com o farmacêutico." : "Confira a dose e a apresentação com o farmacêutico antes de usar."}</em> : null}
      </span>
      {principioAtivoSimilar && item.doseConfere !== true ? (
        <span className="receita-similar-sem-cesta">Confira esta dose e apresentação com o farmacêutico antes de adicionar.</span>
      ) : (
        <ReservarBotao
          unitId="nacoes"
          nome={p.nome}
          precoCentavos={item.precoCentavos}
          foto={imagemIlustrativa({ ...p, nome: p.nomeOriginal ?? p.nome })}
          source={`receita_foto_${controlado ? "controlado" : "receita"}`}
          receita={controlado ? "controlado" : "receita"}
          rotulo="Adicionar à cesta"
        />
      )}
    </li>
  );
}

const ITENS_VISIVEIS = 3;

function CartaoMedicamento({ r }: { r: ResultadoMedicamento }) {
  const [verTodos, setVerTodos] = useState(false);
  const lido = `${r.lido.nome}${r.lido.dosagem ? ` ${r.lido.dosagem}` : ""}`;
  const todosSimilaresComDose = r.similares.length > 0 && r.similares.every((item) => item.doseConfere === true);
  return (
    <section className="receita-med" aria-label={`Medicamento da receita: ${lido}`}>
      <h3>
        {lido}
        <span className="receita-med-lido">na receita</span>
      </h3>
      {r.status === "achado" ? (
        <>
          {r.entendidoComo ? <p className="receita-aviso-leve">Entendi como “{r.entendidoComo}”. Confira se é este mesmo.</p> : null}
          <ul className="receita-itens">{(verTodos ? r.itens : r.itens.slice(0, ITENS_VISIVEIS)).map((item) => <CartaoItem key={item.chave} item={item} />)}</ul>
          {r.itens.length > ITENS_VISIVEIS ? (
            <button type="button" className="receita-mais" aria-expanded={verTodos} onClick={() => setVerTodos((v) => !v)}>
              {verTodos ? "Ver menos opções" : `Ver mais ${r.itens.length - ITENS_VISIVEIS} ${r.itens.length - ITENS_VISIVEIS === 1 ? "opção" : "opções"}`}
            </button>
          ) : null}
        </>
      ) : r.status === "dose" ? (
        <p className="receita-faltou">
          Temos este nome, mas não achei a dosagem da receita. Não vou colocar na cesta para não errar. Fale com o farmacêutico.
          {r.outrasDoses.length > 0 ? <span className="receita-outras">Outras apresentações na loja: {r.outrasDoses.join("; ")}.</span> : null}
        </p>
      ) : r.status === "loja" ? (
        <p className="receita-faltou">
          Este remédio é controlado ou antibiótico e não é vendido pelo site: a receita original fica retida na loja. Leve a receita ao
          balcão da loja Nações Unidas ou tire a dúvida com o farmacêutico no WhatsApp.
          {r.outrasDoses.length > 0 ? <span className="receita-outras">Na loja: {r.outrasDoses.join("; ")}.</span> : null}
        </p>
      ) : (
        <p className="receita-faltou">{r.similares.length > 0 ? "Não encontrei esse nome exato." : "Não encontrado no site."} Fale com o farmacêutico.</p>
      )}
      {r.similares.length > 0 ? (
        <div className="receita-similares">
          <strong>{todosSimilaresComDose ? "Opção com dose compatível e mesmo princípio ativo:" : "Opção encontrada pelo princípio ativo:"} {r.principioAtivoSimilar}</strong>
          <p>{todosSimilaresComDose ? "A dose descrita corresponde à receita. Confira a apresentação e a embalagem com o farmacêutico." : "Esta correspondência não confirma que seja a mesma dose ou apresentação. Confira a receita com o farmacêutico antes de escolher."}</p>
          <ul className="receita-itens">
            {r.similares.map((item) => <CartaoItem key={item.chave} item={item} principioAtivoSimilar={r.principioAtivoSimilar ?? undefined} />)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function lerComoDataUrl(arquivo: Blob): Promise<string | null> {
  return new Promise((resolver) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(typeof leitor.result === "string" ? leitor.result : null);
    leitor.onerror = () => resolver(null);
    leitor.readAsDataURL(arquivo);
  });
}

/** Leitor de receita por foto (modal). Fica dentro da sacola e abre por evento, de qualquer botão "Tenho uma receita". */
export default function LerReceita() {
  const reserva = useReserva();
  const [aberto, setAberto] = useState(false);
  const [fase, setFase] = useState<Fase>({ tipo: "inicio" });
  const janelaRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const abortarRef = useRef<AbortController | null>(null);
  const retornoRef = useRef<HTMLElement | null>(null);
  const modoRef = useRef<ModoLeitor | undefined>(undefined);
  const totalNaCesta = totalItens(reserva);
  const [demora, setDemora] = useState(false);
  const estaLendo = fase.tipo === "lendo";
  // Na primeira leitura o aparelho baixa o leitor (alguns MB): avisa que é só desta vez em vez de parecer travado.
  useEffect(() => {
    setDemora(false);
    if (!estaLendo) return;
    const t = window.setTimeout(() => setDemora(true), 5000);
    return () => window.clearTimeout(t);
  }, [estaLendo]);

  const fechar = useCallback(() => {
    abortarRef.current?.abort();
    abortarRef.current = null;
    setAberto(false);
    setFase({ tipo: "inicio" });
  }, []);

  useEffect(() => {
    const abrir = (evento: Event) => {
      modoRef.current = (evento as CustomEvent<{ modo?: ModoLeitor }>).detail?.modo;
      retornoRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setFase({ tipo: "inicio" });
      setAberto(true);
      trackEvent("receita_foto_abrir", { modo: modoRef.current ?? "padrao" });
      // Aquece o catálogo enquanto a pessoa escolhe a foto.
      carregarCatalogo().catch(() => undefined);
    };
    window.addEventListener(EVENTO_ABRIR_RECEITA, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_RECEITA, abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fundo = [
      document.querySelector("header"),
      document.getElementById("conteudo"),
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector(".fluxo-reserva"),
      document.querySelector(".uf-footer"),
      document.querySelector(".mobile-quick-nav"),
      document.querySelector(".whatsapp-fab"),
      document.querySelector(".skip-link"),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    fundo.forEach((node) => node.setAttribute("inert", ""));
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modo = modoRef.current;
    modoRef.current = undefined;
    // Quem tocou em "Tenho um PDF" cai direto no seletor de arquivo; as outras opções continuam na janela.
    const timer = window.setTimeout(() => (modo === "pdf" ? pdfRef.current?.click() : fecharRef.current?.focus()), 20);
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        fechar();
        return;
      }
      if (event.key !== "Tab" || !janelaRef.current) return;
      const focaveis = Array.from(janelaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
      fundo.forEach((node) => node.removeAttribute("inert"));
      const volta = retornoRef.current;
      if (volta && document.contains(volta)) volta.focus();
    };
  }, [aberto, fechar]);

  // Sair da página com a leitura em andamento: cancela e solta a foto da memória.
  useEffect(
    () => () => {
      abortarRef.current?.abort();
    },
    [],
  );

  async function ler(arquivo: File) {
    abortarRef.current?.abort();
    const controle = new AbortController();
    abortarRef.current = controle;
    let expirou = false;
    const armarRelogio = () =>
      window.setTimeout(() => {
        expirou = true;
        controle.abort();
      }, TEMPO_CLIENTE_MS);
    let relogio = armarRelogio();
    try {
      setFase({ tipo: "lendo", previa: null });
      const imagem = await prepararImagem(arquivo);
      if (controle.signal.aborted) return;
      // A prévia é um data: URL (a política de segurança do site não aceita blob:) e some da memória quando a leitura termina.
      const previa = imagem.type === "application/pdf" ? null : await lerComoDataUrl(imagem);
      if (controle.signal.aborted) return;
      setFase({ tipo: "lendo", previa });
      const catalogo = await carregarCatalogo().catch(() => null);
      if (!catalogo) return setFase({ tipo: "erro", motivo: "catalogo" });
      // 1º: leitura no próprio aparelho (texto do PDF ou OCR), sem IA e sem enviar nada. Se não achar remédio, a IA lê.
      const local = await lerLocalmente(arquivo, imagem, controle.signal).catch(() => null);
      if (controle.signal.aborted) return;
      if (!local) trackEvent("receita_foto_local_falhou", { motivo: "erro" });
      else if (local.origem !== "pdf" && local.confianca < 65) trackEvent("receita_foto_local_falhou", { motivo: "confianca_baixa" });
      if (local && (local.origem === "pdf" || local.confianca >= 65)) {
        const lidosLocal = medicamentosDoTexto(local.texto, catalogo);
        if (lidosLocal.length > 0) {
          const resultadosLocal = casarReceita(catalogo, [...lidosLocal, ...remediosForaDoCatalogo(local.texto, catalogo, lidosLocal)]);
          trackEvent("receita_foto_resultado", { achados: resultadosLocal.filter((r) => r.status === "achado").length, lidos: resultadosLocal.length, leitor: local.origem });
          return setFase({ tipo: "resultado", resultados: resultadosLocal });
        }
        trackEvent("receita_foto_local_falhou", { motivo: "sem_remedio" });
      }
      // Reserva: a leitura local gastou parte do tempo; a IA recebe o prazo inteiro.
      window.clearTimeout(relogio);
      relogio = armarRelogio();
      const resposta = await fetch("/api/receita-ia", { method: "POST", body: imagem, headers: { "content-type": imagem.type || "image/jpeg" }, cache: "no-store", signal: controle.signal });
      if (resposta.status === 429) return setFase({ tipo: "erro", motivo: "limite" });
      if (resposta.status === 413) return setFase({ tipo: "erro", motivo: "grande" });
      if (resposta.status === 415) return setFase({ tipo: "erro", motivo: "formato" });
      if (!resposta.ok) return setFase({ tipo: "erro", motivo: "indisponivel" });
      const dados = (await resposta.json()) as { ehReceita?: boolean; medicamentos?: Medicamento[] };
      const lidos = Array.isArray(dados.medicamentos) ? dados.medicamentos : [];
      if (dados.ehReceita === false || lidos.length === 0) {
        trackEvent("receita_foto_resultado", { achados: 0, lidos: 0, leitor: "ia" });
        return setFase({ tipo: "naoReceita" });
      }
      const resultados = casarReceita(catalogo, lidos);
      trackEvent("receita_foto_resultado", { achados: resultados.filter((r) => r.status === "achado").length, lidos: resultados.length, leitor: "ia" });
      setFase({ tipo: "resultado", resultados });
    } catch (erro) {
      if (erro instanceof ErroImagem) {
        setFase({ tipo: "erro", motivo: erro.motivo === "falha" ? "falha-foto" : erro.motivo });
      } else if (controle.signal.aborted) {
        if (expirou) setFase({ tipo: "erro", motivo: "tempo" });
      } else {
        setFase({ tipo: "erro", motivo: "rede" });
      }
    } finally {
      window.clearTimeout(relogio);
      if (abortarRef.current === controle) {
        abortarRef.current = null;
        // A foto não é mais necessária: sai da memória assim que a leitura termina.
          }
    }
  }

  function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (arquivo) void ler(arquivo);
  }

  function cancelarLeitura() {
    abortarRef.current?.abort();
    abortarRef.current = null;
    setFase({ tipo: "inicio" });
  }

  if (!aberto) return null;

  const lendo = fase.tipo === "lendo";
  const resultados = fase.tipo === "resultado" ? fase.resultados : null;
  const faltam = resultados ? resultados.filter((r) => r.status !== "achado") : [];
  const achados = resultados ? resultados.length - faltam.length : 0;
  const temRestrito = !!resultados?.some((r) => r.itens.some((i) => i.tipo !== "normal"));
  const whatsapp = nacoes
    ? buildWhatsAppUrl(
        nacoes,
        resultados && faltam.length > 0 ? mensagemNaoEncontrados(resultados) : "Oi, União Farma! Quero enviar minha receita para o farmacêutico conferir.",
        { campaign: "receita_foto", content: "nacoes" },
      )
    : null;

  const escolher = (
    <div className="receita-acoes">
      <button type="button" className="reserva-botao" onClick={() => cameraRef.current?.click()} disabled={lendo}>
        <IconCamera size={22} /> Tirar foto da receita
      </button>
      <button type="button" className="reserva-botao reserva-botao-vazado" onClick={() => galeriaRef.current?.click()} disabled={lendo}>
        <IconImagem size={22} /> Escolher da galeria
      </button>
      <button type="button" className="reserva-botao reserva-botao-vazado" onClick={() => pdfRef.current?.click()} disabled={lendo}>
        <IconClipe size={22} /> Escolher arquivo PDF
      </button>
    </div>
  );

  const janela = (
    <div className="receita-raiz" role="dialog" aria-modal="true" aria-labelledby="receita-titulo">
      <button type="button" className="receita-fundo" aria-label="Fechar" tabIndex={-1} onClick={fechar} />
      <div className="receita-janela" ref={janelaRef}>
        <div className="receita-topo">
          <h2 id="receita-titulo">Ler receita</h2>
          <button ref={fecharRef} type="button" className="reserva-icone" aria-label="Fechar" onClick={fechar}>
            <IconFechar size={24} />
          </button>
        </div>
        <div className="receita-corpo">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
          <input ref={galeriaRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={aoEscolher} />
          <input ref={pdfRef} type="file" accept="application/pdf,.pdf" hidden onChange={aoEscolher} />

          {fase.tipo === "inicio" || fase.tipo === "erro" || fase.tipo === "naoReceita" ? (
            <>
              {fase.tipo === "erro" ? <p className="receita-erro" role="alert">{MENSAGENS[fase.motivo]}</p> : null}
              {fase.tipo === "naoReceita" ? (
                <p className="receita-erro" role="alert">Não consegui ler medicamentos nesta foto. Tente de novo com a receita inteira, em foco e sem sombra, ou fale com o farmacêutico.</p>
              ) : null}
              {fase.tipo === "inicio" ? <p className="receita-dica">Fotografe a receita inteira, com boa luz e o texto em foco. Se tiver o PDF do Memed, escolha o arquivo.</p> : null}
              {escolher}
              {whatsapp ? (
                <a className="receita-mao" href={whatsapp} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="receita_foto_mao">
                  Receita escrita à mão? Fale com o farmacêutico
                </a>
              ) : null}
            </>
          ) : null}

          {lendo ? (
            <div className="receita-lendo" role="status" aria-live="polite">
              {fase.tipo === "lendo" && fase.previa ? <img src={fase.previa} alt="" className="receita-previa" /> : <span className="receita-previa receita-previa-vazia" aria-hidden="true" />}
              <span className="receita-giro" aria-hidden="true" />
              <p>{demora ? "Preparando o leitor no seu aparelho. Só demora assim na primeira vez." : "Lendo a receita… leva alguns segundos."}</p>
              <button type="button" className="reserva-botao reserva-botao-vazado" onClick={cancelarLeitura}>Cancelar</button>
            </div>
          ) : null}

          {resultados ? (
            <>
              <p className="receita-resumo" role="status">
                {achados === 0
                  ? "Li a receita, mas não achei estes itens no site."
                  : `Achei ${achados} de ${resultados.length} ${resultados.length === 1 ? "medicamento" : "medicamentos"} da receita.${faltam.length > 0 ? ` ${faltam.length === 1 ? "Falta 1 remédio" : `Faltam ${faltam.length} remédios`} no site: fale com o farmacêutico.` : ""}`}
              </p>
              {temRestrito ? (
                <p className="receita-aviso">Remédio com receita é retirado na loja, com a receita original. Controle especial (Portaria 344) e antimicrobianos só são vendidos na loja, e a farmácia retém a receita.</p>
              ) : null}
              <div className="receita-lista">
                {resultados.map((r, i) => <CartaoMedicamento key={`${r.lido.nome}-${i}`} r={r} />)}
              </div>
              {faltam.length > 0 && whatsapp ? (
                <a className="reserva-botao reserva-botao-vazado receita-whats" href={whatsapp} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="receita_foto">
                  <IconWhats size={22} oficial /> <span>Falar com o farmacêutico sobre o que faltou</span>
                </a>
              ) : null}
            </>
          ) : null}
        </div>
        {resultados ? (
          <div className="receita-pe">
            <button type="button" className="reserva-botao reserva-botao-vazado" onClick={() => setFase({ tipo: "inicio" })}>Ler outra receita</button>
            {totalNaCesta > 0 ? (
              <button type="button" className="reserva-botao" onClick={() => { fechar(); abrirReserva(); }}>Ir para a cesta ({totalNaCesta})</button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(janela, document.body);
}
