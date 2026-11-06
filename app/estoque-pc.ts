/**
 * Vigia o PC da loja: se ele para de enviar o estoque durante o horário de funcionamento, avisa no celular.
 * Funções puras (a leitura do Worker, o banco e o envio ficam em estoque-fonte.ts e na rota do alerta).
 */
import type { Unit, Weekday } from "./site-config";

export const LIMITE_HORAS_SEM_ENVIO = 2; // sem batimento há mais de 2 h com a loja aberta
export const TOLERANCIA_ABERTURA_MIN = 30; // logo depois de abrir, o PC pode ainda estar ligando
export const REPETIR_AVISO_HORAS = 6; // enquanto estiver parado, repete o aviso a cada 6 h

const DIAS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Dia da semana e minutos desde a meia-noite em Brasília (UTC-3, sem horário de verão). */
function agoraBrasilia(date: Date): { dia: Weekday; minutos: number } {
  const b = new Date(date.getTime() - 3 * 3_600_000);
  return { dia: DIAS[b.getUTCDay()], minutos: b.getUTCHours() * 60 + b.getUTCMinutes() };
}

const emMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Minutos desde que a loja abriu hoje, ou null se estiver fechada (feriados não entram: nesse caso só deixa de avisar ao fechar). */
export function minutosDesdeAbertura(unit: Pick<Unit, "schedule">, agora: Date): number | null {
  const { dia, minutos } = agoraBrasilia(agora);
  const horario = unit.schedule[dia];
  if (!horario) return null;
  const abre = emMinutos(horario.open);
  const fecha = emMinutos(horario.close);
  return minutos >= abre && minutos < fecha ? minutos - abre : null;
}

export type AvaliacaoPc = { idadeHoras: number | null; parado: boolean };

/** `batimentoMs`: instante do último envio do PC. Parado = loja aberta (passada a tolerância) e sem envio há mais de LIMITE_HORAS_SEM_ENVIO. */
export function avaliarPc(unit: Pick<Unit, "schedule">, batimentoMs: number | null, agora: Date): AvaliacaoPc {
  if (batimentoMs === null || Number.isNaN(batimentoMs)) return { idadeHoras: null, parado: false };
  const idadeHoras = Math.max(0, Math.round(((agora.getTime() - batimentoMs) / 3_600_000) * 10) / 10);
  const desdeAbertura = minutosDesdeAbertura(unit, agora);
  const aberta = desdeAbertura !== null && desdeAbertura >= TOLERANCIA_ABERTURA_MIN;
  return { idadeHoras, parado: aberta && idadeHoras > LIMITE_HORAS_SEM_ENVIO };
}

export type EstadoAlerta = { estado: "ok" | "parado"; avisadoEm: number | null };
export type Decisao = { enviar: "parou" | "continua" | "voltou" | null; proximo: EstadoAlerta };

/** Decide se manda aviso: ao parar, a cada 6 h enquanto continuar parado e ao voltar ao normal. Nunca repete aviso a cada checagem. */
export function decidirAviso(anterior: EstadoAlerta, parado: boolean, agoraMs: number): Decisao {
  if (parado) {
    if (anterior.estado !== "parado") return { enviar: "parou", proximo: { estado: "parado", avisadoEm: agoraMs } };
    const passou = anterior.avisadoEm === null || agoraMs - anterior.avisadoEm >= REPETIR_AVISO_HORAS * 3_600_000;
    return passou ? { enviar: "continua", proximo: { estado: "parado", avisadoEm: agoraMs } } : { enviar: null, proximo: anterior };
  }
  if (anterior.estado === "parado") return { enviar: "voltou", proximo: { estado: "ok", avisadoEm: null } };
  return { enviar: null, proximo: anterior };
}

export function textoDoAviso(tipo: "parou" | "continua" | "voltou", idadeHoras: number | null): { titulo: string; corpo: string; prioridade: "high" | "default" } {
  const h = idadeHoras === null ? "" : ` há ${String(idadeHoras).replace(".", ",")} h`;
  if (tipo === "voltou") return { titulo: "Estoque da loja voltou", corpo: "O PC da loja voltou a enviar o estoque. O site está atualizado.", prioridade: "default" };
  return {
    titulo: "Estoque da loja parado",
    corpo: `O PC da loja nao envia o estoque${h}. O site pode mostrar produto que acabou. Veja se o programa do catalogo esta aberto no PC.`,
    prioridade: "high",
  };
}
