/**
 * Gesto de "arrastar para baixo para fechar" do bottom sheet da Cesta (só no layout de celular, < 768 px).
 * Pointer events, sem biblioteca: a folha acompanha o dedo (translateY) e, ao soltar, fecha com animação se passou
 * de ~28% da altura ou se o gesto foi rápido; senão volta ao lugar. O arrasto começa pela alça/cabeçalho, ou pelo
 * conteúdo só quando a lista está rolada no topo — rolar os itens continua normal.
 */
export const LIMIAR_FECHAR = 0.28; // fração da altura da folha
export const VELOCIDADE_FECHAR = 0.6; // px/ms
const FOLGA_INICIO = 6; // px antes de assumir o gesto (deixa toques e cliques passarem)
const DURACAO_MS = 220;

export function deveFechar(deslocamento: number, altura: number, velocidade: number): boolean {
  if (deslocamento <= 0 || altura <= 0) return false;
  if (deslocamento >= altura * LIMIAR_FECHAR) return true;
  return velocidade >= VELOCIDADE_FECHAR && deslocamento >= 24;
}

type Opcoes = {
  card: HTMLElement;
  fundo: HTMLElement | null;
  corpo: HTMLElement | null;
  aoFechar: () => void;
};

/** Liga o gesto na folha e devolve a função que desliga. */
export function ligarArrastarParaFechar({ card, fundo, corpo, aoFechar }: Opcoes): () => void {
  const celular = window.matchMedia("(max-width: 767.98px)");
  const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)");
  let id: number | null = null;
  let inicioY = 0;
  let pelaLista = false;
  let arrastando = false;
  let dy = 0;
  let amostras: { y: number; t: number }[] = [];
  let fechando = false;

  const aplicar = (y: number, comTransicao: boolean) => {
    const transicao = comTransicao && !semAnimacao.matches ? `transform ${DURACAO_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : "none";
    card.style.transition = transicao;
    card.style.transform = y > 0 ? `translateY(${y}px)` : "";
    if (fundo) {
      fundo.style.transition = transicao === "none" ? "none" : `opacity ${DURACAO_MS}ms ease-out`;
      fundo.style.opacity = y > 0 ? String(Math.max(0, 1 - y / Math.max(card.offsetHeight, 1))) : "";
    }
  };

  const podeComecar = (alvo: EventTarget | null) => {
    if (!(alvo instanceof Element) || !celular.matches || fechando) return null;
    if (alvo.closest(".cm-puxador, .cm-topo")) return "topo" as const;
    if (corpo && corpo.contains(alvo)) {
      if (alvo.closest("input, select, textarea")) return null;
      return corpo.scrollTop <= 0 ? ("lista" as const) : null;
    }
    return null;
  };

  const aoBaixar = (event: PointerEvent) => {
    if (id !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    const origem = podeComecar(event.target);
    if (!origem) return;
    id = event.pointerId;
    inicioY = event.clientY;
    pelaLista = origem === "lista";
    arrastando = false;
    dy = 0;
    amostras = [{ y: event.clientY, t: event.timeStamp }];
  };

  const aoMover = (event: PointerEvent) => {
    if (event.pointerId !== id) return;
    const bruto = event.clientY - inicioY;
    if (!arrastando) {
      if (bruto < -FOLGA_INICIO && pelaLista) { soltar(); return; } // rolando a lista para cima: não é gesto
      if (bruto < FOLGA_INICIO) return;
      if (pelaLista && corpo && corpo.scrollTop > 0) { soltar(); return; }
      arrastando = true;
      inicioY = event.clientY; // começa do ponto atual: sem "pulo" de 6 px
      try { card.setPointerCapture(event.pointerId); } catch { /* ponteiro já saiu */ }
    }
    dy = Math.max(0, event.clientY - inicioY);
    amostras.push({ y: event.clientY, t: event.timeStamp });
    if (amostras.length > 6) amostras.shift();
    aplicar(dy, false);
  };

  const soltar = () => {
    id = null;
    arrastando = false;
    pelaLista = false;
  };

  const aoSoltar = (event: PointerEvent) => {
    if (event.pointerId !== id) return;
    const estava = arrastando;
    soltar();
    if (!estava) return;
    // Evita que o "soltar" vire clique num botão/link embaixo do dedo.
    const bloquear = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("click", bloquear, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", bloquear, { capture: true }), 350);

    const primeira = amostras[0];
    const ultima = amostras[amostras.length - 1];
    const dt = ultima.t - primeira.t;
    const velocidade = dt > 0 ? (ultima.y - primeira.y) / dt : 0;
    const altura = card.offsetHeight;
    if (event.type !== "pointercancel" && deveFechar(dy, altura, velocidade)) {
      fechando = true;
      if (semAnimacao.matches) { aoFechar(); return; }
      aplicar(altura + 16, true);
      window.setTimeout(aoFechar, DURACAO_MS);
    } else {
      aplicar(0, true);
    }
    dy = 0;
  };

  // No toque, sem isto o navegador assume a rolagem (e cancela o ponteiro) quando o dedo desce sobre a lista no topo.
  const aoTocarMover = (event: TouchEvent) => {
    if (!event.cancelable) return;
    if (arrastando || (id !== null && pelaLista && corpo && corpo.scrollTop <= 0 && (event.touches[0]?.clientY ?? 0) > inicioY)) {
      event.preventDefault();
    }
  };

  card.addEventListener("pointerdown", aoBaixar);
  card.addEventListener("pointermove", aoMover);
  card.addEventListener("pointerup", aoSoltar);
  card.addEventListener("pointercancel", aoSoltar);
  card.addEventListener("touchmove", aoTocarMover, { passive: false });
  return () => {
    card.removeEventListener("pointerdown", aoBaixar);
    card.removeEventListener("pointermove", aoMover);
    card.removeEventListener("pointerup", aoSoltar);
    card.removeEventListener("pointercancel", aoSoltar);
    card.removeEventListener("touchmove", aoTocarMover);
  };
}
