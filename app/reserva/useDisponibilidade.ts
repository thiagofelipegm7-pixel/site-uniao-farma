"use client";

import { useEffect, useState } from "react";
import { idadeEmMinutos, type Mudancas } from "../disponibilidade";

const VALIDADE_MS = 30_000;
let ultimo: { quando: number; mudou: Mudancas; geradoEm: string | null } | null = null;
let emVoo: Promise<Mudancas | null> | null = null;

/** O que mudou no estoque desde a última publicação do catálogo. null = sem dado (servidor fora do ar): a cesta segue sem bloquear nada. */
export function buscarDisponibilidade(): Promise<Mudancas | null> {
  if (ultimo && Date.now() - ultimo.quando < VALIDADE_MS) return Promise.resolve(ultimo.mudou);
  if (!emVoo) {
    emVoo = fetch("/api/disponibilidade", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; mudou?: Mudancas; geradoEm?: string | null } | null) => {
        if (!j?.ok || !j.mudou || typeof j.mudou !== "object") return null;
        ultimo = { quando: Date.now(), mudou: j.mudou, geradoEm: typeof j.geradoEm === "string" ? j.geradoEm : null };
        return j.mudou;
      })
      .catch(() => null)
      .finally(() => {
        emVoo = null;
      });
  }
  return emVoo;
}

/** Há quantos minutos o PC da loja mandou o estoque (null = não sei). Usa o mesmo pedido da disponibilidade ao vivo. */
export function useIdadeDosDados(): number | null {
  const [idade, setIdade] = useState<number | null>(ultimo ? idadeEmMinutos(ultimo.geradoEm) : null);
  useEffect(() => {
    let vivo = true;
    void buscarDisponibilidade().then(() => {
      if (vivo && ultimo) setIdade(idadeEmMinutos(ultimo.geradoEm));
    });
    return () => {
      vivo = false;
    };
  }, []);
  return idade;
}

/** Disponibilidade ao vivo para a cesta e a página do produto; atualiza ao voltar para a aba. `ativo` falso não faz pedido (cesta vazia/fechada). */
export function useDisponibilidade(ativo = true): Mudancas | null {
  const [mudou, setMudou] = useState<Mudancas | null>(ultimo?.mudou ?? null);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const atualizar = () => {
      void buscarDisponibilidade().then((m) => {
        if (vivo && m) setMudou(m);
      });
    };
    atualizar();
    const visivel = () => {
      if (document.visibilityState === "visible") atualizar();
    };
    document.addEventListener("visibilitychange", visivel);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [ativo]);
  return mudou;
}
