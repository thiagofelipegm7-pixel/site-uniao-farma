"use client";

import { useRef } from "react";
import { IconCamera, IconClipe, IconComprimido, IconLoja, IconSacola } from "../reserva/ReservaIcons";

/** Passo a passo da leitura de receita: cartões em carrossel, cada um com um celular ilustrado (sem fotos de produto nem dados reais). */
const PASSOS = [
  {
    n: 1,
    titulo: "Fotografe ou anexe",
    texto: "Foto da receita inteira ou PDF do Memed. O site só lê os nomes dos remédios e não guarda a imagem.",
    tela: "foto",
  },
  {
    n: 2,
    titulo: "Escolha o que levar",
    texto: "O site mostra o que achou na loja. Se um nome vier errado, é só desmarcar.",
    tela: "lista",
  },
  {
    n: 3,
    titulo: "Monte a cesta",
    texto: "Adicione os remédios à cesta e finalize como qualquer pedido do site.",
    tela: "cesta",
  },
  {
    n: 4,
    titulo: "Confirme no WhatsApp",
    texto: "Remédio com receita só sai depois que o farmacêutico confere. Mande a foto ou o PDF no WhatsApp da loja.",
    tela: "zap",
  },
] as const;

/** Resumo de uma linha por passo: quem já sabe o que quer não precisa abrir o passo a passo ilustrado. */
const RESUMO = ["Foto ou PDF da receita", "Escolha os remédios que a loja tem", "Cesta e conferência do farmacêutico"] as const;

function IconImagem() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function Visto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#000000" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ lado }: { lado: "esq" | "dir" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={lado === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function Celular({ tela }: { tela: (typeof PASSOS)[number]["tela"] }) {
  return (
    <div className="recipe-celular" aria-hidden="true">
      <div className="recipe-celular-tela">
        <span className="recipe-entalhe" />
        <div className="recipe-app-topo">
          <Chevron lado="esq" />
          <span>{tela === "zap" ? "WhatsApp" : "Ler receita"}</span>
        </div>

        {tela === "foto" ? (
          <div className="recipe-cena">
            <strong className="recipe-cena-titulo">Sua receita</strong>
            <small>A imagem deve estar completa e com texto nítido.</small>
            <div className="recipe-opcao">
              <IconCamera size={18} />
              <span>Tirar foto</span>
              <Chevron lado="dir" />
            </div>
            <div className="recipe-opcao">
              <IconImagem />
              <span>Galeria de fotos</span>
              <Chevron lado="dir" />
            </div>
            <div className="recipe-opcao">
              <IconClipe size={18} />
              <span>Arquivo PDF</span>
              <Chevron lado="dir" />
            </div>
          </div>
        ) : null}

        {tela === "lista" ? (
          <div className="recipe-cena">
            <strong className="recipe-cena-titulo">Selecione os produtos</strong>
            <small>Achamos estes na loja.</small>
            {["Remédio A", "Remédio B"].map((nome, i) => (
              <div key={nome} className="recipe-item">
                <span className={i === 0 ? "recipe-caixa recipe-caixa-marcada" : "recipe-caixa"}>{i === 0 ? <Visto /> : null}</span>
                <span className="recipe-item-icone"><IconComprimido size={18} /></span>
                <span className="recipe-item-texto">
                  <strong>{nome}</strong>
                  <small>{nome === "Remédio A" ? "500 mg" : "10 mg"}</small>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {tela === "zap" ? (
          <div className="recipe-cena">
            <small className="recipe-etiqueta">Conversa com a loja</small>
            <div className="recipe-balao">
              <div className="recipe-papel recipe-papel-mini">
                <i /><i /><i /><i />
              </div>
              <small>Receita</small>
            </div>
            <span className="recipe-pilula">Enviar no WhatsApp</span>
          </div>
        ) : null}

        {tela === "cesta" ? (
          <div className="recipe-cena">
            <strong className="recipe-cena-titulo">Sua cesta</strong>
            <div className="recipe-item">
              <span className="recipe-caixa recipe-caixa-marcada"><Visto /></span>
              <span className="recipe-item-icone"><IconSacola size={18} /></span>
              <span className="recipe-item-texto">
                <strong>Remédio A</strong>
                <small>Retirar na loja</small>
              </span>
            </div>
            <div className="recipe-total">
              <small>Total (1 produto)</small>
              <span className="recipe-pilula">Adicionar (1)</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TutorialReceita() {
  const faixa = useRef<HTMLDivElement>(null);
  const rolar = (sentido: 1 | -1) => {
    const el = faixa.current;
    if (!el) return;
    el.scrollBy({ left: sentido * (el.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <section className="recipe-tutorial" aria-labelledby="recipe-tutorial-titulo">
      <h2 id="recipe-tutorial-titulo">Como funciona</h2>
      <ol className="recipe-resumo">
        {RESUMO.map((texto, i) => (
          <li key={texto}>
            <span className="recipe-numero">{i + 1}</span>
            <span>{texto}</span>
          </li>
        ))}
      </ol>
      <details className="recipe-detalhe">
        <summary>Ver passo a passo</summary>
        <div className="recipe-detalhe-corpo">
          <div className="recipe-setas">
            <button type="button" aria-label="Passo anterior" onClick={() => rolar(-1)}><Chevron lado="esq" /></button>
            <button type="button" aria-label="Próximo passo" onClick={() => rolar(1)}><Chevron lado="dir" /></button>
          </div>
          <div className="recipe-passos" ref={faixa}>
            {PASSOS.map((p) => (
              <article key={p.titulo} className="recipe-passo">
                <div className="recipe-passo-texto">
                  <span className="recipe-numero">{p.n}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
                <Celular tela={p.tela} />
              </article>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
