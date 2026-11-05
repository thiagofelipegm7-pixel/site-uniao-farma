// "Combina com": candidatos por regra + escolha pela IA, tudo offline. Só entram itens elegíveis (sem medicamento, NBCAL, suplemento ou item de ingerir).
import { elegivelParaPares } from "./comum.mjs";

export const PROMPT_PARES = `Você monta sugestões "Combina com" para a loja online de uma farmácia de bairro (Brasil).
Receberá produtos numerados. Cada um traz uma lista de candidatos numerados (letras e números, ex.: a1).
Para cada produto, escolha de 3 a 6 candidatos que as pessoas usam JUNTO com ele, no mesmo momento de cuidado (ex.: shampoo com condicionador; escova de dente com creme dental e fio dental; protetor solar com hidratante corporal; fralda com lenço umedecido; esmalte com removedor).
Regras:
- Escolha só entre os candidatos listados, usando o código exato. Não invente códigos.
- Prefira itens de TIPO diferente que se completam. Evite repetir o mesmo tipo de item do produto (ex.: não sugira outro shampoo para um shampoo), exceto se faltar opção.
- Não escolha nada que seja medicamento, vitamina, suplemento ou alimento.
- Se menos de 3 candidatos combinarem de verdade, devolva só os que combinam (pode ser lista vazia []).
Responda SOMENTE com JSON: {"1":["a1","a4","a7"],"2":[...]} com todos os números de produto recebidos.`;

const PARES_DE_TIPO = [
  [/\bSH(AMPOO)?\b|\bSHAMP/, /\bCOND(ICIONADOR)?\b|\bMASC(ARA)?\b|\bATIVADOR|\bCR(EME)? (P|PENT)|\bFINALIZ|\bOLEO CAPILAR|\bAMPOLA/],
  [/\bCOND(ICIONADOR)?\b/, /\bSH(AMPOO)?\b|\bMASC(ARA)?\b|\bATIVADOR|\bCR(EME)? (P|PENT)/],
  [/\bESC(OVA)? (DENT|DE DENT)|\bESCOVA DENTAL|\bESC DENT/, /\bCR(EME)? DENT|\bGEL DENT|\bGEN DENT|\bFIO DENT|\bENX|\bANTISEPT|\bCREME DENTAL|\bDENTAL/],
  [/\bCR(EME)? DENT|\bGEL DENT|\bGEN DENT|\bCREME DENTAL/, /\bESC(OVA)?\b|\bFIO DENT|\bENX|\bANTISEPT/],
  [/\bPROT(ETOR)? SOL|\bBLOQ SOLAR|\bFPS/, /\bHID|\bLOC|\bSABONETE|\bAGUA MICELAR|\bPROT(ETOR)? LABIAL|\bAFTER SUN|\bPOS SOL/],
  [/(^|\s)FRALDA(?!S? ?(CREMER|COMUM))/, /\bLENCO|\bLENÇO|\bSAB(ONETE)?\b.*\b(BEBE|BABY)|\bSH(AMPOO)?\b.*\b(BEBE|BABY|KIDS)|\bCOLONIA|\bTALCO|\bALGODAO/],
  [/\bABS(ORVENTE)?\b/, /\bPROT(ETOR)? DIARIO|\bSAB(ONETE)? INTIMO|\bINTIMO|\bDES(ODORANTE)? INTIM|\bLENCO/],
  [/\bTINT(URA)?\b/, /\bSH(AMPOO)?\b|\bMASC(ARA)?\b|\bCOND(ICIONADOR)?\b|\bLUVA/],
  [/\bESMALTE\b/, /\bREMOVEDOR|\bBASE\b|\bALGODAO|\bTOP COAT|\bCUTICULA|\bALICATE|\bLIXA/],
  [/\bDES(ODORANTE)?\b/, /\bSAB(ONETE)?\b|\bTALCO|\bHID|\bLOC/],
  [/\bSAB(ONETE)?\b/, /\bBUCHA|\bESPONJA|\bHID|\bLOC|\bDES(ODORANTE)?\b/],
  [/\bAGUA MICELAR|\bLOCAO DE LIMPEZA|\bGEL DE LIMPEZA/, /\bHID|\bPROT(ETOR)? SOL|\bSERUM|\bALGODAO|\bDISCO/],
  [/\bHID(RATANTE)?\b|\bLOC(AO)? HID|\bCR(EME)? (CORP|FAC)/, /\bPROT(ETOR)? SOL|\bSAB|\bSERUM|\bAGUA MICELAR/],
  [/\bLAMINA|\bAPARELHO DE BARBEAR|\bBARBEAR/, /\bESPUMA|\bGEL DE BARBA|\bLOCAO POS|\bPOS BARBA|\bDES(ODORANTE)?\b/],
  [/\bCERA\b|\bDEPIL/, /\bLOCAO|\bHID|\bPOS DEPIL/],
  [/\bCOTONETE|\bALGODAO/, /\bESMALTE|\bREMOVEDOR|\bAGUA MICELAR|\bLENCO/],
];

function semAcento(t) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

const GRUPOS_DE_TIPO = [
  [/^(DESODORANTE|DEO|DES|AEROSOL|ROLL|REXONA CLINICAL)\b/, "DES"], [/^(SABONETE|SAB|RFL SABONETE)\b/, "SAB"], [/^(SHAMPOO|SH|SH\+COND)\b/, "SH"],
  [/^(CONDICIONADOR|COND)\b/, "COND"], [/^(ABS|ABSORVENTE|ABSORVENTES)\b/, "ABS"], [/^(HID|HIDR|HIDRATANTE|LOCAO|LOC|CREME NIVEA)\b/, "HID"],
  [/^(ESMALTE|ESM)\b/, "ESM"], [/^(TINT|TINTURA|COLORACAO|TONALIZANTE|DESCOLORANTE)\b/, "TINT"], [/^(ESCOVA|ESC)\b/, "ESC"],
  [/^(CR DENT|CREME DENTAL|GEN DENTAL|GEL DENTAL)\b/, "CREMEDENT"], [/^(MASC|MASCARA)\b/, "MASC"],
];

function tipoDe(nomeNormal) {
  for (const [re, tipo] of GRUPOS_DE_TIPO) if (re.test(nomeNormal)) return tipo;
  return nomeNormal.split(" ")[0];
}

const STOP = new Set(["DE", "DA", "DO", "E", "COM", "SEM", "PARA", "EM", "C", "S", "UN", "UND", "ML", "G", "GR", "KG", "L", "MG", "DESC", "KIT", "EXTRA", "PLUS", "MAX", "ORIGINAL", "LIQ", "LIQUIDO", "INT", "TRAD", "NEUTRO", "UNID", "UNIDADE", "UNIDADES", "COCO", "OLEO", "MEL", "LITRO", "CAIXA", "CX"]);

function palavras(nome) {
  return semAcento(nome)
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !STOP.has(p) && !/^\d/.test(p));
}

export function elegiveis(itens) {
  return itens.filter((i) => elegivelParaPares(i));
}

function pontuar(a, b, palA, palB) {
  let nota = 0;
  const setB = new Set(palB);
  const comuns = palA.filter((p) => setB.has(p));
  nota += Math.min(comuns.length, 3) * 2;
  if (a.categoria === b.categoria) nota += 1;
  const nA = semAcento(a.nome);
  const nB = semAcento(b.nome);
  let casouTipo = false;
  for (const [origem, destino] of PARES_DE_TIPO) {
    if (origem.test(nA) && destino.test(nB)) {
      nota += 6;
      casouTipo = true;
    }
  }
  // Mesmo tipo de produto (primeira palavra igual, ex.: dois "SAB" ou dois "SH") não é combinação.
  if (!casouTipo && tipoDe(nA) === tipoDe(nB)) nota -= 5;
  // A mesma linha de produto (primeira palavra costuma ser a marca) pesa a favor.
  if (palA[0] && palA[0] === palB[0]) nota += 3;
  return nota;
}

/** Até `max` candidatos por item: os de maior nota por regra/palavras, mais alguns da mesma categoria para dar variedade. */
export const NOTA_MINIMA = 3;

export function candidatosDe(item, todos, max = 16) {
  const palA = palavras(item.nome);
  const lista = todos
    .filter((o) => o.slug !== item.slug)
    .map((o) => ({ o, nota: pontuar(item, o, palA, palavras(o.nome)) }));
  lista.sort((x, y) => y.nota - x.nota || x.o.slug.localeCompare(y.o.slug));
  // Só entra candidato com alguma ligação real (palavra em comum + mesma categoria, ou par de tipos): nada de completar lista com item qualquer.
  return lista.filter((x) => x.nota >= NOTA_MINIMA).slice(0, max).map((x) => x.o);
}

/** Valida a escolha da IA: só códigos que existem, sem repetir, de 3 a 6. Menos de 3 volta como null (cai na regra). */
export function validarEscolha(codigos, candidatos) {
  if (!Array.isArray(codigos)) return null;
  const porCodigo = new Map(candidatos.map((c, i) => [`a${i + 1}`, c]));
  const vistos = new Set();
  const saida = [];
  for (const c of codigos) {
    const item = porCodigo.get(String(c).trim().toLowerCase());
    if (item && !vistos.has(item.slug)) {
      vistos.add(item.slug);
      saida.push(item.slug);
    }
  }
  return saida.length >= 3 ? saida.slice(0, 6) : null;
}

/** Reserva sem IA: os melhores por regra (precisam ter nota de regra, não só ser da mesma categoria). */
export function escolhaPorRegra(item, todos) {
  const palA = palavras(item.nome);
  const pontuados = todos
    .filter((o) => o.slug !== item.slug)
    .map((o) => ({ o, nota: pontuar(item, o, palA, palavras(o.nome)) }))
    .filter((x) => x.nota >= 6)
    .sort((x, y) => y.nota - x.nota || x.o.slug.localeCompare(y.o.slug))
    .slice(0, 4)
    .map((x) => x.o.slug);
  return pontuados.length >= 3 ? pontuados : [];
}

/** Nota de ligação entre dois itens (regra de tipo, palavras e marca em comum). */
export function notaDoPar(a, b, todos = null) {
  return pontuar(a, b, palavras(a.nome), palavras(b.nome));
}
export const NOTA_PARA_EXIBIR = 5;
