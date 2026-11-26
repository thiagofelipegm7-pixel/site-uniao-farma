/** Utilitários de animação com JavaScript. Respeitam prefers-reduced-motion. */

const reduzido = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Bounce no contador da cesta (Web Animations API). */
export function animarContador(el: HTMLElement | null) {
  if (!el || reduzido() || !el.animate) return;
  el.animate(
    [
      { transform: "scale(0.55)" },
      { transform: "scale(1.22)" },
      { transform: "scale(1)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
  );
}

/** View Transition entre passos (fallback se não suportado). */
export function comViewTransition(callback: () => void) {
  if (reduzido() || !document.startViewTransition) {
    callback();
    return;
  }
  document.startViewTransition(callback);
}

/** Anima um número de `de` até `para` (requestAnimationFrame). */
export function animarNumero(
  el: HTMLElement | null,
  de: number,
  para: number,
  duracao = 420,
  formatar?: (n: number) => string
) {
  if (!el) return;
  const alvo = el; // dentro de `frame` o TypeScript perde a garantia de que não é nulo
  if (reduzido()) {
    alvo.textContent = formatar ? formatar(para) : String(para);
    return;
  }
  const inicio = performance.now();
  function frame(agora: number) {
    const p = Math.min(1, (agora - inicio) / duracao);
    const valor = Math.round(de + (para - de) * p);
    alvo.textContent = formatar ? formatar(valor) : String(valor);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
