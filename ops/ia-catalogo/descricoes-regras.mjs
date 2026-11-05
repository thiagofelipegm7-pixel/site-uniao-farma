// Prompt e validação das descrições automáticas. A IA só reescreve o que o nome do produto já diz.
export const PROMPT_DESCRICAO = `Você escreve descrições curtas para o catálogo de uma farmácia de bairro no Brasil (português do Brasil, linguagem simples).
Receberá produtos numerados com o nome do sistema da loja (caixa alta e abreviado) e a categoria.
Para cada produto escreva UMA descrição de 1 ou 2 frases curtas (de 60 a 180 caracteres) usando SOMENTE o que o nome e a categoria dizem: o tipo do produto, a marca que aparece no nome, a variação (aroma, cor, tipo de pele ou de cabelo) e o tamanho ou quantidade.
Regras obrigatórias:
- Não invente nada: nada de ingredientes, benefícios, efeitos, resultados, público ou modo de uso que não estejam escritos no nome.
- Proibido dizer para que serve, tratar, curar, aliviar, prevenir, combater, hidratar, clarear, proteger como efeito, "ideal", "perfeito", "melhor", "natural", "testado", "eficaz", "garantido".
- Só use números que estejam no nome (tamanho, quantidade, FPS, dosagem). Se o nome tiver número ambíguo, não o use.
- Se o nome tiver uma abreviação que você não tem certeza do que é, não a expanda: use a palavra como está ou omita.
- Abreviações comuns: SH=shampoo, COND=condicionador, SAB=sabonete, DES=desodorante, PROT=protetor, ABS=absorvente, CR=creme, TINT=tintura, MASC=máscara, HID=hidratante, LOC=loção, ESC=escova, XPE=xarope, COMP/CPR=comprimidos, CAPS/CPS=cápsulas, UND/UN=unidades, ENV=envelopes, FR=frasco, INF=infantil, ADUL=adulto, SOL=solução, SUSP=suspensão.
- Para medicamentos (marcados com "medicamento: sim"): descreva só o nome, a forma e a quantidade, em tom neutro. Não diga para que serve nem como usar.
- Comece pelo tipo do produto (ex.: "Shampoo Pantene 400 ml, ..."). Não use emoji, nem exclamação, nem pergunta, nem preço, nem a palavra "farmácia".
Responda SOMENTE com um JSON do tipo {"1":"texto","2":"texto"} com todos os números recebidos.`;

const PROIBIDAS = [
  /\bcura\w*/i, /\btrata\w*/i, /\btratamento/i, /\balivia\w*/i, /\bprev[eé]m\w*|\bpreven[cç]\w*/i, /\bcombat\w*/i, /\belimina\w*/i,
  /\bhidrata(?!nte)\w*/i, /\bclareia\w*|\bclareamento/i, /\bprotege\w*|\bprote[cç][aã]o/i, /\bideal\b/i, /\bperfeit\w*/i, /\bmelhor\w*/i,
  /\bnatura(l|is)\b/i, /\btestad\w*/i, /\beficaz\w*|\befic[aá]cia/i, /\bgarant\w*/i, /\bcomprovad\w*/i, /\bcl[ií]nic\w*/i,
  /\bdermatol[oó]gic\w*/i, /\bhipoalerg\w*/i, /\bsem efeitos?\b/i, /\bpara que serve\b/i, /\bindicad\w*/i, /\bajuda\w*/i, /\bauxilia\w*/i,
  /\brejuvenesc\w*/i, /\bemagrec\w*/i, /\bsa[uú]de\b/i, /\bsintoma\w*/i, /\bdoen[cç]\w*/i, /\bdor(es)?\b/i, /\bfarm[aá]cia\b/i, /R\$/, /[!?]/,
  /\banti-?inflamat\w*/i, /\bantial[eé]rgic\w*/i, /\bpotente\b/i, /\bresultado\w*/i, /\bbenef[ií]cio\w*/i, /\brenova\w*/i, /\bsuave\w*/i, /\bgentil\w*/i, /\bnutri[cç]\w*/i,
];

function semAcento(t) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function numerosDe(texto) {
  return (semAcento(texto).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".").replace(/^0+(?=\d)/, ""));
}

/** Devolve null se o texto passou, ou o motivo da reprovação. Palavra proibida é aceita só quando já está escrita no nome (ex.: "hidratante"). */
export function reprovarDescricao(texto, item) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 12) return "curta";
  if (t.length > 230) return "longa";
  const nomeNormal = semAcento(`${item.nome} ${item.exibicao}`);
  for (const re of PROIBIDAS) {
    const m = re.exec(t);
    if (!m) continue;
    const palavra = semAcento(m[0]);
    if (palavra === "tratamento" && /\bTRAT\b|TRATAMENTO/i.test(nomeNormal)) continue; // "creme de tratamento" é tipo de produto
    if (!/^[a-z]{4,}$/.test(palavra) || !nomeNormal.includes(palavra.slice(0, Math.min(palavra.length, 8)))) return `proibida:${m[0]}`;
  }
  const permitidos = new Set([...numerosDe(item.nome), ...numerosDe(item.exibicao)]);
  for (const n of numerosDe(t)) if (!permitidos.has(n)) return `numero:${n}`;
  if (!/[.]$/.test(t)) return "sem-ponto-final";
  return null;
}

/** Texto seguro sem IA, só com o que o nome diz. Usado quando a IA falha duas vezes. */
export function descricaoPorModelo(item) {
  return `${item.exibicao}. Item da categoria ${item.categoria}.`;
}
