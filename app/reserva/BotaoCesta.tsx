"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import "./botao-cesta.css";

/*
 * Botão da cesta (adaptado do Cart button da Kokonut UI, MIT): "+ Adicionar" que abre, no mesmo lugar, num
 * "− n +". O "+" não se mexe, então o segundo toque cai onde o primeiro caiu. Com uma unidade, o "−" vira lixeira.
 * Mesmos tempos do original: pílula 0,32 s, textos 0,2 s, números 0,24 s, curva [0.23, 1, 0.32, 1].
 */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const LIMITE_POR = 1600;

type Props = {
  /** Unidades deste item na cesta (0 = fora da cesta). */
  quantidade: number;
  /** Quanto cabe por pedido (o estoque da loja, até 9 por padrão). */
  teto?: number;
  /** Nome do produto, só para os leitores de tela. */
  nome: string;
  /** Texto do botão fechado. */
  rotulo?: string;
  /** Só o "+" fechado (cartão de produto), sem texto. */
  compacto?: boolean;
  /** Adiciona a primeira unidade. */
  aoAdicionar: () => void;
  /** Muda a quantidade (0 remove o item). */
  aoMudar: (quantidade: number) => void;
};

export default function BotaoCesta({ quantidade, teto = 9, nome, rotulo = "Adicionar", compacto = false, aoAdicionar, aoMudar }: Props) {
  const aberto = quantidade > 0;
  const reduzir = Boolean(useReducedMotion());
  const [direcao, setDirecao] = useState(1);
  const [vezesNoLimite, setVezesNoLimite] = useState(0);
  const [avisoLimite, setAvisoLimite] = useState(false);

  // Aviso "Só restam N" some sozinho depois de 1,6 s.
  useEffect(() => {
    if (!avisoLimite) return;
    const id = setTimeout(() => setAvisoLimite(false), LIMITE_POR);
    return () => clearTimeout(id);
  }, [avisoLimite, vezesNoLimite]);

  const rapido = { duration: reduzir ? 0 : 0.2, ease: EASE_OUT };
  const largura = compacto ? { fechado: 44, aberto: 116 } : { fechado: 196, aberto: 124 };
  const noLimite = quantidade >= teto;

  const mudar = (delta: number) => {
    if (delta > 0 && quantidade >= teto) {
      setVezesNoLimite((n) => n + 1);
      setAvisoLimite(true);
      return;
    }
    const novo = Math.min(teto, Math.max(0, quantidade + delta));
    if (novo === quantidade) return;
    setDirecao(novo > quantidade ? 1 : -1);
    aoMudar(novo);
  };

  return (
    <div className="bc-raiz">
      <AnimatePresence>
        {avisoLimite ? (
          <motion.span
            className="bc-aviso"
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={rapido}
          >
            Só restam {teto} na loja
          </motion.span>
        ) : null}
      </AnimatePresence>

      <motion.div
        className={`bc-pilula${aberto ? " is-aberto" : ""}`}
        animate={{ width: aberto ? largura.aberto : largura.fechado }}
        initial={false}
        transition={{ ...rapido, duration: reduzir ? 0 : 0.32 }}
      >
        <AnimatePresence initial={false}>
          {!aberto && !compacto ? (
            <motion.span
              key="rotulo"
              className="bc-rotulo"
              aria-hidden
              initial={{ opacity: 0, x: -6, filter: "blur(2px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -6, filter: "blur(2px)" }}
              transition={rapido}
            >
              {rotulo}
            </motion.span>
          ) : null}
        </AnimatePresence>

        {aberto ? (
          <fieldset className="bc-contador">
            <legend className="bc-sr">{`Quantidade de ${nome} na cesta`}</legend>
            <motion.button
              type="button"
              className="bc-menos"
              aria-label={quantidade === 1 ? `Diminuir ${nome} (última unidade: sai da cesta)` : `Diminuir ${nome}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={rapido}
              onClick={() => mudar(-1)}
            >
              <IconeMenos quantidade={quantidade} reduzir={reduzir} />
            </motion.button>

            <motion.output
              className="bc-numero"
              aria-live="polite"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={rapido}
            >
              <span className="bc-sr">{`${quantidade} na cesta`}</span>
              <motion.span
                key={vezesNoLimite}
                aria-hidden
                className="bc-tremer"
                animate={vezesNoLimite > 0 && !reduzir ? { x: [0, -3, 3, -2, 2, 0] } : undefined}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Digitos texto={String(quantidade)} direcao={direcao} reduzir={reduzir} />
              </motion.span>
            </motion.output>

            <motion.button
              type="button"
              className={`bc-mais${noLimite ? " is-limite" : ""}`}
              aria-disabled={noLimite}
              aria-label={`Aumentar ${nome}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={rapido}
              onClick={() => mudar(1)}
            >
              <Plus aria-hidden size={16} />
            </motion.button>
          </fieldset>
        ) : (
          <button
            type="button"
            className="bc-adicionar"
            aria-label={`${rotulo} ${nome} à cesta`}
            onClick={() => {
              setDirecao(1);
              aoAdicionar();
            }}
          >
            <span className="bc-icone-mais">
              <Plus aria-hidden size={compacto ? 22 : 16} />
            </span>
          </button>
        )}
      </motion.div>
    </div>
  );
}

/** − com duas ou mais unidades; lixeira com uma, porque o próximo toque esvazia a cesta. */
function IconeMenos({ quantidade, reduzir }: { quantidade: number; reduzir: boolean }) {
  const lixeira = quantidade === 1;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={lixeira ? "lixeira" : "menos"}
        className="bc-glifo"
        initial={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
        transition={reduzir ? { duration: 0 } : { duration: 0.16 }}
      >
        {lixeira ? <Trash2 aria-hidden size={14} /> : <Minus aria-hidden size={16} />}
      </motion.span>
    </AnimatePresence>
  );
}

/** Cada algarismo rola por conta própria, pela posição a partir da direita. */
function Digitos({ texto, direcao, reduzir }: { texto: string; direcao: number; reduzir: boolean }) {
  const posicoes = texto.split("").map((char, indice) => ({ char, posicao: texto.length - indice }));
  return (
    <span className="bc-digitos">
      {posicoes.map(({ char, posicao }) => (
        <span className="bc-digito" key={posicao}>
          <AnimatePresence custom={direcao} initial={false} mode="popLayout">
            <motion.span
              key={char}
              custom={direcao}
              className="bc-digito-char"
              initial={reduzir ? { opacity: 0 } : "in"}
              animate={{ y: 0, opacity: 1 }}
              exit={reduzir ? { opacity: 0 } : "out"}
              transition={reduzir ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }}
              variants={{
                in: (dir: number) => ({ y: dir * 12, opacity: 0 }),
                out: (dir: number) => ({ y: dir * -12, opacity: 0 }),
              }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
