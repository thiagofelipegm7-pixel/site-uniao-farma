#!/usr/bin/env node
/**
 * Gera assets estáticos pré-computados do catálogo a partir dos JSONs de ops/app dados.
 * Roda no build (ou manualmente) para que o Worker só leia fatias, sem localeCompare/toLocaleString/regex por item.
 * Saída: public/dados/nacoes/...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, "..");
const DADOS = path.join(RAIZ, "app/nacoes-unidas/produtos/dados");
const PUBLIC = path.join(RAIZ, "public/dados/nacoes");

function normalizarBusca(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizarBusca(value).replace(/\s+/g, "-");
}

function formatBRL(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Fotos por nome: lê o mapa direto de imagens.ts (fonte única), para que o catálogo e a busca nunca fiquem para trás.
const imagensTs = fs.readFileSync(path.join(DADOS, "..", "imagens.ts"), "utf8");
const FOTOS_NACOES = Object.fromEntries(
  [...imagensTs.split("function normalizarNome")[0].matchAll(/^\s*"([^"]+)":\s*"(\d+)",?\s*$/gm)].map((m) => [m[1], m[2]]),
);
if (Object.keys(FOTOS_NACOES).length < 20) throw new Error("Mapa de fotos de imagens.ts não encontrado.");

function fotoDoProduto(nome) {
  const n = nome.trim().replace(/\s+/g, " ");
  const ean = FOTOS_NACOES[n];
  return ean ? `/produtos/${ean}.webp` : null;
}

// Replicado de nome-exibicao.ts (simplificado, suficiente para pré-computar)
const PALAVRAS = {
  "roll-on": "roll-on", gr: "g", g: "g", ml: "ml", des: "Desodorante", desod: "Desodorante", cr: "Creme", sab: "Sabonete", prot: "Protetor", hidrat: "Hidratante",
  locao: "Loção", shamp: "Shampoo", cond: "Condicionador", enx: "Enxaguante", esc: "Escova", cap: "cápsulas", caps: "cápsulas",
  comp: "comprimidos", cpr: "comprimidos", mastigavel: "mastigável", glic: "Glicerinado", trad: "Tradicional", bebe: "bebê",
  "s/frag": "sem fragrância", "c/": "com", "s/": "sem", maca: "Maçã", peruana: "Peruana", po: "pó", omega: "Ômega",
  vitamina: "Vitamina", dental: "dental", aero: "Aerosol", hidratante: "Hidratante", corporal: "corporal", facial: "facial",
  oleosidade: "oleosidade", controle: "controle", refil: "refil", granado: "Granado", rosa: "rosa", radiant: "Radiant", glow: "Glow",
};
const MINUSCULAS = new Set(["de", "da", "do", "e", "com", "sem", "para", "em", "na", "no", "a", "o"]);

function nomeDeExibicao(nomeBruto) {
  const limpo = nomeBruto.replace(/[*]+$/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return nomeBruto;
  return limpo
    .split(/\s+/)
    .map((bruta) => {
      const p = bruta.toLowerCase();
      const med = /^(\d+(?:[.,]\d+)?)(ml|mg|g|gr|kg|l|mcg|mts|mt)$/.exec(p);
      if (med) return `${med[1]}${med[2] === "gr" ? "g" : med[2] === "mts" || med[2] === "mt" ? "m" : med[2]}`;
      const comPre = /^c\/(\d+)$/.exec(p);
      if (comPre) return `com ${comPre[1]}`;
      if (PALAVRAS[p]) return PALAVRAS[p];
      if (MINUSCULAS.has(p)) return p;
      if (/^\d/.test(p) || /^fps\d*$/.test(p)) return p.toUpperCase().replace(/^FPS/, "FPS");
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

// Replicado de receita.ts
const CONCENTRACAO = /\d+(?:[.,]\d+)?(?:\s?[+/]\s?\d+(?:[.,]\d+)?)*\s?(?:mg|mcg|g|ml|ui|%)(?:\s?\/\s?(?:ml|g|dose))?/i;

function lerNome(nome, lab) {
  let texto = nome.replace(/\s+/g, " ").trim();
  const l = lab.trim();
  if (l && texto.toUpperCase().endsWith(" " + l.toUpperCase())) texto = texto.slice(0, -l.length).trim();
  const m = CONCENTRACAO.exec(texto);
  if (!m) return { concentracao: null, apresentacao: null };
  const resto = texto.slice(m.index + m[0].length).replace(/^[\s,;-]+/, "").trim();
  return { concentracao: m[0].replace(/\s+/g, " ").toLowerCase(), apresentacao: resto.length > 0 ? resto : null };
}

function tarjaDaLista(lista) {
  if (/^[AB]/i.test(lista)) return "preta";
  if (/^C/i.test(lista)) return "vermelha-retencao";
  return null;
}

const AVISO_RECEITA = "Venda sob prescrição médica";
const AVISO_RETENCAO = "Venda sob prescrição médica com retenção da receita";
const AVISO_CONTROLADO = "Venda sob prescrição médica com retenção da receita";
const AVISO_CONSULTE = "Consulte o farmacêutico";

/**
 * Tarja dos controlados pela lista da Portaria 344/98 (a substância manda): A e B → preta; C → vermelha com retenção.
 * Exceções do adendo: associações de codeína com paracetamol e o elixir paregórico saem como vermelha com retenção.
 * Vale mais que o cruzamento por nome com a CMED, que errou em itens como alprazolam (B1) e pregabalina (C1).
 */
function tarjaControlado(base) {
  const lista = String(base.lista || "");
  if (!lista) return base.tarja ?? null;
  const texto = `${base.nome} ${base.ativo ?? ""}`.toLowerCase();
  if (/^A/i.test(lista) && (/paregoric|paregórico/.test(texto) || (/code[ií]n/.test(texto) && /paracetamol|\+/.test(texto)))) return "vermelha-retencao";
  return tarjaDaLista(lista);
}

function paraRestrito(base, tipo) {
  const { concentracao, apresentacao } = lerNome(base.nome, base.lab);
  const controlado = tipo === "controlados";
  const tarja = controlado ? tarjaControlado(base) : (base.tarja ?? null);
  let retencao = null;
  if (controlado || base.retencao === true || tarja === "preta" || tarja === "vermelha-retencao") retencao = true;
  else if (tarja === "vermelha") retencao = false;
  const aviso = tipo === "consulte" ? AVISO_CONSULTE : controlado ? AVISO_CONTROLADO : retencao === true ? AVISO_RETENCAO : AVISO_RECEITA;
  return {
    nome: base.nome,
    lab: base.lab,
    preco: typeof base.preco === "number" && base.preco > 0 ? base.preco : null,
    precoFmt: formatBRL(base.preco),
    tipo,
    ativo: base.ativo ? base.ativo.trim() || null : null,
    rms: base.rms ?? null,
    tarja,
    retencao,
    concentracao,
    apresentacao,
    aviso,
    controlado,
    generico: base.generico === true,
    busca: normalizarBusca(`${base.nome} ${base.lab} ${base.ativo ?? ""}`),
    nomeExibicao: nomeDeExibicao(base.nome),
    slug: slugify(base.nome),
  };
}

function writeJson(rel, data) {
  const full = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data));
  const size = fs.statSync(full).size;
  console.log(`Wrote ${rel} (${size} bytes)`);
  return size;
}

// ---- Catálogo sem receita ----
const cat = JSON.parse(fs.readFileSync(path.join(DADOS, "catalogo-nacoes.json"), "utf8"));
const itens = cat.itens || [];

const CATEGORIAS_ORDEM = [
  "Medicamentos",
  "Dermocosméticos",
  "Perfumes",
  "Infantil e Gestante",
  "Beleza",
  "Cuidado Diário",
  "Bem Estar",
  "Categoria a conferir",
];

function rank(cat) {
  const i = CATEGORIAS_ORDEM.indexOf(cat);
  return i >= 0 ? i : 99;
}

const gruposMap = new Map();
for (const item of itens) {
  if (!gruposMap.has(item.categoria)) gruposMap.set(item.categoria, []);
  gruposMap.get(item.categoria).push(item);
}

const grupos = [...gruposMap.entries()]
  .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"))
  .map(([categoria, list]) => ({
    categoria,
    itens: list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  }));

const POR_PAGINA = 48;
const buscaIndex = [];
const paginasIndex = []; // for client to know pages

for (const g of grupos) {
  const slugCat = slugify(g.categoria);
  const itensFmt = g.itens.map((item) => {
    const precoFmt = formatBRL(item.preco);
    const nomeEx = nomeDeExibicao(item.nome);
    const slug = slugify(item.nome);
    const foto = fotoDoProduto(item.nome);
    const busca = normalizarBusca(`${nomeEx} ${item.nome} ${item.lab} ${item.categoria}`);
    const fmt = {
      nome: item.nome,
      nomeExibicao: nomeEx,
      lab: item.lab,
      categoria: item.categoria,
      preco: item.preco,
      precoFmt,
      isMIP: item.isMIP === true,
      slug,
      foto,
      busca,
    };
    buscaIndex.push({
      nome: nomeEx,
      slug,
      precoCentavos: Math.round(item.preco * 100),
      foto,
      busca,
    });
    return fmt;
  });

  const paginas = Math.ceil(itensFmt.length / POR_PAGINA);
  for (let p = 0; p < paginas; p++) {
    const slice = itensFmt.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
    writeJson(`catalogo/${slugCat}/p${p + 1}.json`, slice);
  }
  paginasIndex.push({
    categoria: g.categoria,
    slug: slugCat,
    total: itensFmt.length,
    paginas,
  });
}

writeJson("catalogo-busca.json", buscaIndex);
writeJson("catalogo-index.json", { geradoEm: cat.geradoEm, grupos: paginasIndex, total: itens.length });

// ---- Restritos ----
const rec = JSON.parse(fs.readFileSync(path.join(DADOS, "receita-nacoes.json"), "utf8"));

function gerarRestrito(lista, tipo) {
  return (lista || []).map((base) => paraRestrito(base, tipo));
}

const receitaFmt = gerarRestrito(rec.receita, "receita");
const controladosFmt = gerarRestrito(rec.controlados, "controlados");
// A lista "consulte o farmacêutico" não existe mais: esses itens entram no catálogo comum (ver ops/catalogo-nacoes/categorias_novas.py).
const consulteFmt = [];

function paginarEEscrever(itensFmt, prefixo) {
  const paginas = Math.ceil(itensFmt.length / POR_PAGINA);
  for (let p = 0; p < paginas; p++) {
    const slice = itensFmt.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
    writeJson(`restritos/${prefixo}/p${p + 1}.json`, slice);
  }
  return { total: itensFmt.length, paginas };
}

const recInfo = paginarEEscrever(receitaFmt, "receita");
const ctlInfo = paginarEEscrever(controladosFmt, "controlados");
const conInfo = { total: 0, paginas: 0 };

// Índice leve para a busca do cabeçalho achar também os medicamentos com receita, os controlados e os "consulte o farmacêutico".
writeJson(
  "restritos-busca.json",
  [...receitaFmt, ...controladosFmt, ...consulteFmt].map((i) => ({
    nome: i.nomeExibicao,
    tipo: i.tipo,
    precoCentavos: i.preco === null ? null : Math.round(i.preco * 100),
    busca: i.busca,
    // Palavras iniciais do nome original: levam à lista já filtrada neste medicamento.
    q: normalizarBusca(i.nome).split(" ").slice(0, 6).join(" "),
    // Dados da ilustração da caixa (ver imagemIlustrativa em receita.ts).
    apresentacao: i.apresentacao,
    tarja: i.tarja,
    retencao: i.retencao,
    controlado: i.controlado,
    generico: i.generico,
    ativo: i.ativo,
    nomeOriginal: i.nome,
  })),
);

writeJson("restritos-index.json", {
  geradoEm: rec.geradoEm,
  receita: recInfo,
  controlados: ctlInfo,
  consulte: conInfo,
});

console.log("Assets gerados com sucesso.");
console.log("Contagens: catálogo", itens.length, "receita", receitaFmt.length, "controlados", controladosFmt.length, "consulte", consulteFmt.length);
