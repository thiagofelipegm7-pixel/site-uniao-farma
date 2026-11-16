import type { CSSProperties } from "react";

/**
 * Kit de movimento da loja: as mesmas durações e curvas de motion.css, para uso em React.
 * Referência: https://motion-reference.takayustudio.jp/
 * Ao mudar um valor aqui, mude também a variável correspondente em motion.css.
 */

/** Durações em milissegundos. */
export const MOTION_DUR = {
  /** Entrada de painel (空間検索リビール). */
  reveal: 900,
  /** Revelação escalonada, por item (list-stagger). */
  stagger: 760,
  /** Intervalo entre itens da revelação escalonada. */
  staggerStep: 70,
  /** Toque: tempo para afundar (press-feedback). */
  pressIn: 120,
  /** Toque: tempo para voltar. */
  pressOut: 300,
  /** Destaque de estado ativo (ピルインジケーター). */
  active: 470,
  /** Transição de largura/expansão (accordion-open). */
  expand: 620,
  /** Laço do brilho de carregamento (skeleton-shimmer). */
  shimmer: 1200,
} as const;

/** Escala do elemento enquanto está pressionado. */
export const MOTION_PRESS_SCALE = 0.94;

/** Molas da referência, na notação dela: spring(rigidez, amortecimento, massa). */
export const MOTION_SPRING = {
  reveal: "spring(220, 22, 1)",
  active: "spring(240, 24, 1)",
} as const;

/** Curvas como valores de CSS (animation-timing-function / transition-timing-function). */
export const MOTION_EASE = {
  out: "cubic-bezier(0.33, 1, 0.68, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  linear: "linear",
  springReveal:
    "linear(0, 0.056, 0.186, 0.344, 0.504, 0.647, 0.767, 0.86, 0.929, 0.976, 1.006, 1.022, 1.03, 1.031, 1.028, 1.024, 1.019, 1.014, 1.01, 1.006, 1.004)",
  springActive:
    "linear(0, 0.015, 0.055, 0.112, 0.181, 0.256, 0.334, 0.413, 0.489, 0.561, 0.627, 0.689, 0.744, 0.793, 0.836, 0.873, 0.904, 0.931, 0.953, 0.971, 0.986, 0.997, 1.005, 1.012, 1.016, 1.019, 1.021, 1.021, 1.021, 1.02, 1.019, 1.018, 1.016, 1.015, 1.013, 1.011, 1.01, 1.008, 1.007, 1.006, 1.005)",
} as const;

/** Nomes dos @keyframes definidos em motion.css. */
export const MOTION_KEYFRAMES = {
  reveal: "motion-reveal",
  staggerIn: "motion-stagger-in",
  activePop: "motion-active-pop",
  shimmer: "motion-shimmer",
} as const;

/** Estilo que informa a posição do item na revelação escalonada (lida no CSS como var(--motion-i)). */
export function motionIndex(i: number): CSSProperties {
  return { "--motion-i": i } as CSSProperties;
}
