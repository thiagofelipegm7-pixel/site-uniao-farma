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
  [/^(?:g|gr)$/i, "grama(s)"],
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
