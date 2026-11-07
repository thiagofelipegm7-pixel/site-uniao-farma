"use client";

import { useEffect } from "react";

type Mapa = Record<string, string>;
type Dados = { novas: Mapa; removidas: string[] };
const NEUTRA = "/ilustrativas/neutra.webp";

const MARCA = "data-foto-nova";

function tirar(raiz: ParentNode, removidas: Set<string>) {
  // Foto removida pelo painel: volta para a imagem neutra na hora (o arquivo sai na próxima publicação).
  for (const a of raiz.querySelectorAll<HTMLAnchorElement>('a[href^="/nacoes-unidas/produtos/"]')) {
    const slug = decodeURIComponent((a.getAttribute("href") ?? "").split("?")[0].split("/").pop() ?? "");
    if (!removidas.has(slug)) continue;
    const img = a.querySelector<HTMLImageElement>("img");
    if (img && /^\/produtos\/\d+\.webp$/.test(img.getAttribute("src") ?? "")) img.setAttribute("src", NEUTRA);
  }
  const m = window.location.pathname.match(/^\/nacoes-unidas\/produtos\/([^/]+)\/?$/);
  if (m && removidas.has(decodeURIComponent(m[1]))) {
    const img = document.querySelector<HTMLImageElement>(".produto-foto img");
    if (img && /^\/produtos\/\d+\.webp$/.test(img.getAttribute("src") ?? "")) img.setAttribute("src", NEUTRA);
  }
}

function trocar(raiz: ParentNode, mapa: Mapa) {
  // Cartões, sugestões da busca e itens que levam à página do produto.
  for (const a of raiz.querySelectorAll<HTMLAnchorElement>('a[href^="/nacoes-unidas/produtos/"]')) {
    const slug = decodeURIComponent((a.getAttribute("href") ?? "").split("?")[0].split("/").pop() ?? "");
    const ean = mapa[slug];
    if (!ean) continue;
    const url = `/api/foto-nova?ean=${ean}`;
    const img = a.querySelector<HTMLImageElement>("img:not([" + MARCA + "])");
    if (img) {
      if (img.getAttribute("src") !== url && !img.hasAttribute(MARCA)) img.setAttribute("src", url);
      continue;
    }
    if (a.querySelector(`img[${MARCA}]`)) continue;
    const vazio = a.querySelector<HTMLElement>(".sem-foto");
    if (!vazio?.parentElement) continue;
    // Não mexe em nós do React: esconde o quadro "sem foto" e põe a imagem ao lado.
    const nova = document.createElement("img");
    nova.setAttribute(MARCA, "1");
    nova.src = url;
    nova.alt = "";
    const grande = vazio.parentElement.classList.contains("pv-img");
    nova.width = grande ? 160 : 44;
    nova.height = grande ? 160 : 44;
    vazio.style.display = "none";
    vazio.insertAdjacentElement("afterend", nova);
  }
  // Página do produto.
  const m = window.location.pathname.match(/^\/nacoes-unidas\/produtos\/([^/]+)\/?$/);
  const ean = m ? mapa[decodeURIComponent(m[1])] : undefined;
  const caixa = document.querySelector<HTMLElement>(".produto-foto");
  if (ean && caixa && !caixa.querySelector(`img[${MARCA}]`)) {
    const url = `/api/foto-nova?ean=${ean}`;
    const existente = caixa.querySelector<HTMLImageElement>("img");
    if (existente) {
      existente.setAttribute("src", url);
    } else {
      const nova = document.createElement("img");
      nova.setAttribute(MARCA, "1");
      nova.src = url;
      nova.alt = "";
      nova.width = 300;
      nova.height = 300;
      caixa.classList.remove("produto-foto--vazia");
      caixa.querySelectorAll<HTMLElement>(".sem-foto").forEach((e) => (e.style.display = "none"));
      caixa.appendChild(nova);
    }
  }
}

/**
 * Foto enviada pelo painel aparece no site na hora, sem esperar a publicação: pergunta quais produtos têm foto nova
 * (ainda guardada no banco) e troca a imagem nos cartões, na busca e na página do produto. Depois da publicação a
 * lista fica vazia e vale o arquivo fixo.
 */
export default function FotosNovas() {
  useEffect(() => {
    let mapa: Mapa = {};
    let removidas = new Set<string>();
    let agendado = 0;
    let observador: MutationObserver | null = null;
    const aplicar = () => {
      agendado = 0;
      if (Object.keys(mapa).length > 0) trocar(document, mapa);
      if (removidas.size > 0) tirar(document, removidas);
    };
    const agendar = () => {
      if (!agendado) agendado = window.requestAnimationFrame(aplicar);
    };
    fetch("/api/fotos-novas", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((bruto: unknown) => {
        const dados = bruto as Partial<Dados> | null;
        if (!dados || typeof dados !== "object") return;
        mapa = Object.fromEntries(Object.entries(dados.novas ?? {}).filter(([, v]) => typeof v === "string" && /^\d{8,14}$/.test(v))) as Mapa;
        removidas = new Set((Array.isArray(dados.removidas) ? dados.removidas : []).filter((x): x is string => typeof x === "string"));
        if (Object.keys(mapa).length === 0 && removidas.size === 0) return;
        aplicar();
        // Listas e busca desenham depois: observa e repete.
        observador = new MutationObserver(agendar);
        observador.observe(document.body, { childList: true, subtree: true });
      })
      .catch(() => undefined);
    return () => {
      observador?.disconnect();
      if (agendado) window.cancelAnimationFrame(agendado);
    };
  }, []);
  return null;
}
