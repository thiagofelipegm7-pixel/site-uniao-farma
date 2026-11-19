/**
 * Área de entrega da loja Nações Unidas, por CEP completo (8 dígitos).
 * Fonte única usada pelo painel interno e, se fizer sentido, pelo site.
 * As taxas vêm de site-config (deliveryFees); este módulo não altera valores.
 */
import { UNITS } from "./site-config";

type Faixa = { de: number; ate: number; bairros: readonly string[] };

/** Faixas oficiais de CEP (inclusivas) dos bairros atendidos pela loja Nações Unidas. */
const FAIXAS: readonly Faixa[] = [
  { de: 34590000, ate: 34590390, bairros: ["Nações Unidas"] },
  { de: 34590400, ate: 34590400, bairros: ["Nações Unidas"] },
  { de: 34580010, ate: 34580200, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34580220, ate: 34580220, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34580240, ate: 34580680, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34585000, ate: 34585022, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34585040, ate: 34585300, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34515370, ate: 34515370, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34515380, ate: 34515380, bairros: ["Itacolomi", "Vila Rica", "Vila São José"] },
  { de: 34585470, ate: 34585560, bairros: ["Valparaíso"] },
  { de: 34585580, ate: 34585580, bairros: ["Valparaíso"] },
  { de: 34575120, ate: 34575120, bairros: ["Coqueiros"] },
  { de: 34575250, ate: 34575260, bairros: ["Coqueiros"] },
  { de: 34575300, ate: 34575300, bairros: ["Coqueiros"] },
  { de: 34575320, ate: 34575360, bairros: ["Coqueiros"] },
  { de: 34575390, ate: 34575390, bairros: ["Coqueiros"] },
  { de: 34576001, ate: 34576090, bairros: ["Coqueiros"] },
  { de: 34580700, ate: 34580770, bairros: ["General Carneiro", "Ipê Amarelo"] },
];

/** CEP fora da área, mas perto o bastante para o operador confirmar (não confundir com Vila São José). */
const CEP_CONFIRMAR: Readonly<Record<number, string>> = {
  34515320: "Conjunto Residencial São José",
};

export type AreaEntrega =
  | { status: "vazio" }
  | { status: "incompleto"; digitos: string }
  | { status: "fora" }
  | { status: "confirmar"; local: string }
  | { status: "atendida"; bairros: string[]; taxaCentavos: number }
  | { status: "ambigua"; bairros: string[]; taxasCentavos: Record<string, number> };

export type CepParaCotar =
  | { ok: true; cep: string; bairros: string[]; bairro: string; taxaCentavos: number }
  | { ok: false; erro: string; mensagem: string; statusHttp: number };

/** Só os dígitos do CEP, no máximo 8, aceitando hífen, espaço ou colado. */
export function soDigitosCep(valor: string): string {
  return valor.normalize("NFKC").replace(/\D/g, "").slice(0, 8);
}

/** Formata como 00000-000 enquanto a pessoa digita ou cola. */
export function formatarCep(valor: string): string {
  const digitos = soDigitosCep(valor);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function formatarTaxaCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Taxa oficial do bairro em site-config. Não inventa valor. */
export function taxaOficialDoBairro(bairro: string): number | null {
  for (const unit of UNITS) {
    const taxa = unit.deliveryFees?.[bairro];
    if (taxa !== undefined) return taxa;
  }
  return null;
}

function taxasDos(bairros: readonly string[]): Record<string, number> | null {
  const taxas: Record<string, number> = {};
  for (const bairro of bairros) {
    const taxa = taxaOficialDoBairro(bairro);
    if (taxa == null) return null;
    taxas[bairro] = taxa;
  }
  return taxas;
}

export function consultarCep(valor: string): AreaEntrega {
  const digitos = soDigitosCep(valor);
  if (!digitos) return { status: "vazio" };
  if (digitos.length < 8) return { status: "incompleto", digitos };
  const n = Number(digitos);
  const confirmar = CEP_CONFIRMAR[n];
  if (confirmar) return { status: "confirmar", local: confirmar };
  const faixa = FAIXAS.find((f) => n >= f.de && n <= f.ate);
  if (!faixa) return { status: "fora" };
  const taxas = taxasDos(faixa.bairros);
  if (!taxas) return { status: "fora" };
  const distintas = [...new Set(Object.values(taxas))];
  if (distintas.length > 1) {
    return { status: "ambigua", bairros: [...faixa.bairros], taxasCentavos: taxas };
  }
  return { status: "atendida", bairros: [...faixa.bairros], taxaCentavos: distintas[0] };
}

/** Valida o CEP (e o bairro, quando a faixa é compartilhada) antes de cotar no painel. */
export function validarCepParaCotar(cepBruto: string, bairroConfirmado?: string): CepParaCotar {
  const area = consultarCep(cepBruto);
  const cep = soDigitosCep(cepBruto);
  if (area.status === "vazio" || area.status === "incompleto") {
    return { ok: false, erro: "cep_invalido", mensagem: "Informe o CEP completo do cliente, com 8 dígitos.", statusHttp: 400 };
  }
  if (area.status === "fora") {
    return { ok: false, erro: "fora_da_area", mensagem: "Este CEP fica fora da área de entrega.", statusHttp: 422 };
  }
  if (area.status === "confirmar") {
    return {
      ok: false,
      erro: "fora_da_area",
      mensagem: `Este CEP é do ${area.local}, que fica fora da área de entrega. Confirme o endereço com o cliente.`,
      statusHttp: 422,
    };
  }
  const escolhido = (bairroConfirmado ?? "").trim();
  if (area.status === "ambigua") {
    if (!area.bairros.includes(escolhido)) {
      return {
        ok: false,
        erro: "bairro_ambiguo",
        mensagem: "Este CEP é compartilhado por General Carneiro e Ipê Amarelo. Confirme o bairro para aplicar a taxa certa.",
        statusHttp: 422,
      };
    }
    return { ok: true, cep, bairros: area.bairros, bairro: escolhido, taxaCentavos: area.taxasCentavos[escolhido] };
  }
  const bairro = area.bairros.includes(escolhido) ? escolhido : area.bairros[0];
  return { ok: true, cep, bairros: area.bairros, bairro, taxaCentavos: area.taxaCentavos };
}
