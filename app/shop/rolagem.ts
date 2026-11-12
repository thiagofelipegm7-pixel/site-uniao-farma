/** Quanto ainda precisa rolar para considerar a seta ativa (evita tremer no fim da faixa). */
const FOLGA = 1;

/** Estado das setas de uma faixa horizontal, a partir do scroll real do container. */
export function podeRolar(el: { scrollLeft: number; scrollWidth: number; clientWidth: number }) {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return { esquerda: el.scrollLeft > FOLGA, direita: max - el.scrollLeft > FOLGA };
}
