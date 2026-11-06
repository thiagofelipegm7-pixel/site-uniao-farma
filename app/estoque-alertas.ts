/**
 * Alertas de estoque para a equipe (painel interno e resumo de WhatsApp). Só funções puras, sem rede nem banco.
 *
 * O export do DMaster traz o estoque atual, mas não as vendas. A velocidade de venda é estimada pela QUEDA do estoque
 * entre um dia e o seguinte (aumentos são entrada de mercadoria e não contam). Precisa de alguns dias de histórico.
 */

export const LIMITE_BAIXO = 5; // 1 a 5 unidades: "baixo"
export const DIAS_ACABANDO = 7; // acaba em até 7 dias no ritmo atual
export const DIAS_MIN_VELOCIDADE = 6; // histórico mínimo (dias) para estimar a velocidade
export const DIAS_MIN_PARADO = 21; // sem nenhuma queda por 21 dias = parado
export const JANELA_DIAS = 28;

export type ItemEstoque = { chave: string; nome: string; lab: string; estoque: number; preco: number };
export type PontoHistorico = { dia: string; estoque: number; nome?: string };
export type TipoAlerta = "esgotado" | "acabando" | "baixo" | "parado";
export type Alerta = {
  chave: string;
  nome: string;
  tipo: TipoAlerta;
  estoque: number;
  /** Unidades vendidas por semana, estimadas. null = histórico curto demais. */
  vendaPorSemana: number | null;
  diasRestantes: number | null;
  /** Valor parado em reais (estoque x preço), só para o tipo "parado". */
  valorParado?: number;
  motivo: string;
};

const DIA_MS = 86_400_000;
const diaParaMs = (dia: string) => Date.parse(`${dia}T12:00:00Z`);

/** Média de unidades vendidas por dia pela soma das quedas, ou null se o histórico for curto. */
export function vendaPorDia(pontos: readonly PontoHistorico[]): { porDia: number; dias: number } | null {
  const ordem = [...pontos].sort((a, b) => a.dia.localeCompare(b.dia));
  if (ordem.length < 2) return null;
  const dias = Math.round((diaParaMs(ordem[ordem.length - 1].dia) - diaParaMs(ordem[0].dia)) / DIA_MS);
  if (dias < DIAS_MIN_VELOCIDADE) return null;
  let quedas = 0;
  for (let i = 1; i < ordem.length; i += 1) {
    const queda = ordem[i - 1].estoque - ordem[i].estoque;
    if (queda > 0) quedas += queda;
  }
  return { porDia: quedas / dias, dias };
}

const arredonda = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const fmtNumero = (n: number) => String(arredonda(n)).replace(".", ",");
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/**
 * Classifica os itens. `historico` tem, por chave, o estoque de cada dia guardado (sem o dia de hoje; o atual vem em `itens`).
 * Item que sumiu do export de hoje conta como estoque 0 se já teve estoque na janela.
 */
export function gerarAlertas(itens: readonly ItemEstoque[], historico: ReadonlyMap<string, PontoHistorico[]>, hoje: string): Alerta[] {
  const alertas: Alerta[] = [];
  const atuais = new Map(itens.map((i) => [i.chave, i]));
  const chaves = new Set<string>([...atuais.keys(), ...historico.keys()]);

  for (const chave of chaves) {
    const item = atuais.get(chave);
    const antes = historico.get(chave) ?? [];
    const estoque = item?.estoque ?? 0;
    const nome = item?.nome ?? [...antes].reverse().find((p) => p.nome)?.nome ?? chave;
    const pontos: PontoHistorico[] = [...antes, { dia: hoje, estoque }];
    const vel = vendaPorDia(pontos);
    const porSemana = vel ? vel.porDia * 7 : null;
    const teveEstoque = antes.some((p) => p.estoque > 0);

    if (estoque <= 0) {
      if (!teveEstoque) continue; // nunca teve na janela: não é "acabou", é item sem estoque de sempre
      alertas.push({
        chave,
        nome: nome,
        tipo: "esgotado",
        estoque: 0,
        vendaPorSemana: porSemana,
        diasRestantes: 0,
        motivo: porSemana && porSemana >= 0.5 ? `Acabou. Vendia cerca de ${fmtNumero(porSemana)} por semana.` : "Acabou.",
      });
      continue;
    }

    if (vel && vel.porDia > 0) {
      const dias = estoque / vel.porDia;
      if (dias <= DIAS_ACABANDO) {
        alertas.push({
          chave,
          nome: nome,
          tipo: estoque <= LIMITE_BAIXO ? "baixo" : "acabando",
          estoque,
          vendaPorSemana: porSemana,
          diasRestantes: Math.max(1, Math.round(dias)),
          motivo: `Vende cerca de ${fmtNumero(porSemana as number)} por semana e ${plural(estoque, "resta", "restam")} ${estoque}: acaba em ~${Math.max(1, Math.round(dias))} ${plural(Math.max(1, Math.round(dias)), "dia", "dias")}.`,
        });
        continue;
      }
    }

    if (estoque <= LIMITE_BAIXO) {
      alertas.push({
        chave,
        nome: nome,
        tipo: "baixo",
        estoque,
        vendaPorSemana: porSemana,
        diasRestantes: vel && vel.porDia > 0 ? Math.max(1, Math.round(estoque / vel.porDia)) : null,
        motivo: `${plural(estoque, "Resta", "Restam")} ${estoque}.`,
      });
      continue;
    }

    // Parado: histórico longo, nenhuma queda no período, e ainda com estoque.
    const longo = pontos.length >= 2 && Math.round((diaParaMs(hoje) - diaParaMs([...pontos].sort((a, b) => a.dia.localeCompare(b.dia))[0].dia)) / DIA_MS) >= DIAS_MIN_PARADO;
    if (longo && vel && vel.porDia === 0 && item) {
      alertas.push({
        chave,
        nome: item.nome,
        tipo: "parado",
        estoque,
        vendaPorSemana: 0,
        diasRestantes: null,
        valorParado: Math.round(item.estoque * item.preco * 100) / 100,
        motivo: `Sem venda há mais de ${DIAS_MIN_PARADO} dias, com ${estoque} em estoque.`,
      });
    }
  }

  const peso: Record<TipoAlerta, number> = { esgotado: 0, acabando: 1, baixo: 2, parado: 3 };
  return alertas.sort((a, b) => {
    if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
    if (a.tipo === "parado") return (b.valorParado ?? 0) - (a.valorParado ?? 0);
    return (b.vendaPorSemana ?? 0) - (a.vendaPorSemana ?? 0) || a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export const ROTULO_TIPO: Record<TipoAlerta, string> = {
  esgotado: "Acabou",
  acabando: "Vai acabar",
  baixo: "Estoque baixo",
  parado: "Parado",
};

/** Texto curto para mandar por WhatsApp. Até `max` linhas por grupo. */
export function resumoWhatsApp(alertas: readonly Alerta[], data: string, max = 8): string {
  if (alertas.length === 0) return `Estoque ${data}: nada para repor hoje.`;
  const linhas: string[] = [`Estoque ${data}`];
  for (const tipo of ["esgotado", "acabando", "baixo", "parado"] as TipoAlerta[]) {
    const grupo = alertas.filter((a) => a.tipo === tipo);
    if (grupo.length === 0) continue;
    linhas.push("", `${ROTULO_TIPO[tipo]} (${grupo.length})`);
    for (const a of grupo.slice(0, max)) linhas.push(`• ${a.nome}: ${a.motivo}`);
    if (grupo.length > max) linhas.push(`… e mais ${grupo.length - max}`);
  }
  return linhas.join("\n");
}
