/**
 * Nome e endereço do cliente guardados SÓ no navegador dele (localStorage), para o próximo pedido vir preenchido.
 * Nunca vão ao servidor nem ao analytics. O cliente pode esquecer tudo com um toque.
 */
export const CHAVE_CLIENTE = "uf-cliente-v1";

export type DadosCliente = { nome: string; rua: string; bairro: string };

const limpo = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Lê e valida o texto guardado; qualquer coisa estranha vira null. */
export function lerDadosCliente(bruto: string | null): DadosCliente | null {
  if (!bruto) return null;
  try {
    const d = JSON.parse(bruto) as Partial<DadosCliente>;
    const dados = { nome: limpo(d.nome, 80), rua: limpo(d.rua, 120), bairro: limpo(d.bairro, 60) };
    return dados.nome.length >= 2 ? dados : null;
  } catch {
    return null;
  }
}

export function carregarDadosCliente(): DadosCliente | null {
  try {
    return lerDadosCliente(window.localStorage.getItem(CHAVE_CLIENTE));
  } catch {
    return null;
  }
}

/** Guarda os campos informados e mantém os outros (quem só retira não apaga o endereço de entrega já salvo). */
export function guardarDadosCliente(parcial: Partial<DadosCliente>): void {
  try {
    const antes = carregarDadosCliente() ?? { nome: "", rua: "", bairro: "" };
    const junto = {
      nome: parcial.nome !== undefined ? limpo(parcial.nome, 80) : antes.nome,
      rua: parcial.rua !== undefined ? limpo(parcial.rua, 120) : antes.rua,
      bairro: parcial.bairro !== undefined ? limpo(parcial.bairro, 60) : antes.bairro,
    };
    if (junto.nome.length < 2) return;
    window.localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(junto));
  } catch {
    // navegação privada ou sem espaço: o pedido segue normal, só não lembra
  }
}

export function esquecerDadosCliente(): void {
  try {
    window.localStorage.removeItem(CHAVE_CLIENTE);
  } catch {
    // sem armazenamento
  }
}
