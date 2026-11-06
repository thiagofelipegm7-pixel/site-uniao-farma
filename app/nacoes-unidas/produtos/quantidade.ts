// Converte a apresentação crua do estoque ("CX 30CPR EMS", "cx 6 cap", "30ML") em texto legível,
// no estilo "30 comprimido(s)". Sem quantidade reconhecível, devolve null (nada é inventado).
const UNIDADES: Array<[RegExp, string]> = [
  [/^(?:comprimidos?|comp|cpr|cprs|cp)$/i, "comprimido(s)"],
  [/^(?:c[aá]psulas?|caps?|cps|cap)$/i, "cápsula(s)"],
  [/^(?:dr[aá]geas?|drg|drgs)$/i, "drágea(s)"],
  [/^(?:envelopes?|env)$/i, "envelope(s)"],
  [/^(?:sach[eê]s?)$/i, "sachê(s)"],
  [/^(?:ampolas?|amp)$/i, "ampola(s)"],
  [/^(?:doses?)$/i, "dose(s)"],
  [/^(?:ml)$/i, "mililitro(s)"],
  [/^(?:g|gr|grs)$/i, "grama(s)"],
  [/^(?:mg)$/i, "miligrama(s)"],
  [/^(?:unid|unids|und|un|unidades?)$/i, "unidade(s)"],
];

const PALAVRA = "(comprimidos?|comp|cprs?|cp|c[aá]psulas?|caps?|cps|dr[aá]geas?|drgs?|envelopes?|env|sach[eê]s?|ampolas?|amp|doses?|ml|gr|g|mg|unids?|und|un|unidades?)";
const NUM = "(\\d+(?:[.,]\\d+)?)";
const NUM_UNID = new RegExp(`(?:^|[^\\d.,])${NUM}\\s*${PALAVRA}(?![a-zà-ú])`, "i");
const UNID_NUM = new RegExp(`(?:^|[^a-zà-ú])${PALAVRA}\\s*${NUM}(?![\\d.,]*\\s*(?:ml|g|mg))`, "i");
const SO_NUM = /^(?:cx|c|caixa)?\s*[/.]?\s*(\d{1,4})\s*$/i;

function nomeUnidade(p: string): string | null {
  for (const [rx, nome] of UNIDADES) if (rx.test(p)) return nome;
  return null;
}

export function quantidadeLegivel(apresentacao: string | null | undefined): string | null {
  const t = (apresentacao ?? "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  let m = NUM_UNID.exec(t);
  if (m) {
    const u = nomeUnidade(m[2]);
    if (u) return `${m[1].replace(".", ",")} ${u}`;
  }
  m = UNID_NUM.exec(t);
  if (m) {
    const u = nomeUnidade(m[1]);
    if (u) return `${m[2].replace(".", ",")} ${u}`;
  }
  m = SO_NUM.exec(t);
  if (m) return `${m[1]} unidade(s)`;
  return null;
}

// Para produtos comuns a quantidade vem dentro do nome ("Acetona Farmax 100 ml", "Fralda G 30 unidades").
// Prefere contagem (comprimidos, unidades...) a volume/peso, e volume/peso a miligramas (concentração).
const PALAVRA_NOME = "(comprimidos?|comp|cprs?|c[aá]psulas?|caps?|cps|dr[aá]geas?|drgs?|envelopes?|env|sach[eê]s?|ampolas?|amp|doses?|unidades?|unids?|und|un|p[aá]res?|pe[cç]as?|pcs?|folhas?|tiras?|ml|litros?|l|kg|grs?|g|mg)";
const NOME_RX = new RegExp(`(?<![\\d.,])${NUM}\\s*${PALAVRA_NOME}(?![a-zà-ú\\d])`, "gi");
const EXTRAS: Array<[RegExp, string]> = [
  [/^(?:p[aá]res?)$/i, "par(es)"],
  [/^(?:pe[cç]as?|pcs?)$/i, "peça(s)"],
  [/^(?:litros?|l)$/i, "litro(s)"],
  [/^(?:folhas?)$/i, "folha(s)"],
  [/^(?:tiras?)$/i, "tira(s)"],
  [/^(?:kg)$/i, "quilo(s)"],
];

function nomeUnidadeNome(p: string): string | null {
  for (const [rx, nome] of EXTRAS) if (rx.test(p)) return nome;
  return nomeUnidade(p);
}

function prioridade(unidade: string): number {
  if (unidade === "miligrama(s)") return 2;
  if (/^(mililitro|grama|litro|quilo)/.test(unidade)) return 1;
  return 0;
}

export function quantidadeDoNome(nome: string | null | undefined): string | null {
  const t = (nome ?? "").replace(/\s+/g, " ");
  let melhor: { texto: string; p: number } | null = null;
  for (const m of t.matchAll(NOME_RX)) {
    const u = nomeUnidadeNome(m[2]);
    if (!u) continue;
    const p = prioridade(u);
    if (!melhor || p < melhor.p) melhor = { texto: `${m[1].replace(".", ",")} ${u}`, p };
  }
  if (melhor) return melhor.texto;
  const c = /(?:^|\s)c\/\s?(\d{1,4})(?![\d/])/i.exec(t);
  if (c) return `${c[1]} unidade(s)`;
  // "CAPS 20", "CPR 30": unidade antes do número.
  const u = new RegExp(`(?:^|[^a-zà-ú])${PALAVRA_NOME}\\s*(\\d{1,4})(?![\\d.,]|\\s*(?:ml|g|mg|kg|l)\\b)`, "i").exec(t);
  if (u) {
    const nome = nomeUnidadeNome(u[1]);
    if (nome && prioridade(nome) === 0) return `${u[2]} ${nome}`;
  }
  // "... UNIDADE" / "... UNID" no fim do nome: uma unidade.
  if (/(?:^|\s)(?:unidade|unid|und)\.?$/i.test(t.trim())) return "1 unidade(s)";
  return null;
}

// Formatação de exibição: "150 mililitro(s)" → "150 ml", "30 comprimido(s)" → "30 comprimidos", "1 cápsula(s)" → "1 cápsula".
// Não altera o dado de origem; só o texto mostrado ao cliente.
const ABREVIADAS: Record<string, string> = { "mililitro(s)": "ml", "grama(s)": "g", "miligrama(s)": "mg", "litro(s)": "L", "quilo(s)": "kg" };

export function formatarQuantidade(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const m = /^(\d+(?:,\d+)?)\s+(\S+)$/.exec(t);
  if (!m) return t;
  const [, numero, unidade] = m;
  if (ABREVIADAS[unidade]) return `${numero} ${ABREVIADAS[unidade]}`;
  const singular = numero === "1";
  if (unidade === "par(es)") return `${numero} ${singular ? "par" : "pares"}`;
  const base = /^(.+)\(s\)$/.exec(unidade);
  return base ? `${numero} ${base[1]}${singular ? "" : "s"}` : t;
}
