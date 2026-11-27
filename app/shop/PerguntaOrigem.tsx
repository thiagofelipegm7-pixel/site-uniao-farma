"use client";

import { useState } from "react";
import { trackEvent } from "../analytics";

const CHAVE_RESPONDIDO = "uf-origem-respondida-v1";

const OPCOES = [
  { id: "assistente_ia", rotulo: "Assistente de IA (ChatGPT, Gemini, Perplexity)" },
  { id: "google", rotulo: "Google" },
  { id: "indicacao", rotulo: "Indicação de alguém" },
  { id: "instagram", rotulo: "Instagram" },
  { id: "loja_fisica", rotulo: "Passei em frente à loja" },
] as const;

/**
 * S-31 (Atribuição autodeclarada): pergunta opcional, de resposta única e fora do caminho do checkout (P-10, C-21, X-4).
 * Só envia evento se o visitante aceitou cookies (R-11, ver trackEvent).
 */
export default function PerguntaOrigem() {
  const [escolhido, setEscolhido] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(CHAVE_RESPONDIDO);
    } catch {
      return null;
    }
  });

  function responder(id: string) {
    setEscolhido(id);
    try {
      window.sessionStorage.setItem(CHAVE_RESPONDIDO, id);
    } catch {}
    trackEvent("atribuicao_origem", { origem: id });
  }

  return (
    <section className="pergunta-origem" aria-labelledby="pergunta-origem-titulo">
      <h2 id="pergunta-origem-titulo">Como você nos conheceu? (opcional)</h2>
      {escolhido ? (
        <p role="status" className="pergunta-origem-obrigado">
          Obrigado por responder! Isso ajuda a melhorar nosso atendimento em Sabará.
        </p>
      ) : (
        <div className="pergunta-origem-opcoes" role="group" aria-label="Escolha uma opção">
          {OPCOES.map((op) => (
            <button key={op.id} type="button" className="pergunta-origem-btn" onClick={() => responder(op.id)}>
              {op.rotulo}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
