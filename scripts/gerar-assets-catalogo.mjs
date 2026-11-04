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

// Replicado de imagens.ts (fotos por nome)
const FOTOS_NACOES = {
  "BIOTINA MASTIGAVEL 45MCG C/60 COMP QUALY": "7898767762353",
  "CR NIVEA 56 GR LATA": "78906617",
  "CR NIVEA FACIAL CONTROLE OLEOSIDADE 100 G": "42495727",
  "CREATINA MONOHIDRATADA 300G QUALYNUTRI": "7895143226973",
  "DES AERO MONANGE HIDRAT INTENSIVA C/150 ML": "7891350034646",
  "DES HERBISSIMO TRAD 55G": "7896049528512",
  "DES REXONA COTTON DRY 150 ML": "7791293032467",
  "DES ROLL ON NIVEA PROTECT 50ML": "4005900130785",
  "FIO DENTAL HILLO 100 MTS": "7896444211118",
  "HIDRAT CORPORAL BIOEXTRATUS 200G": "7898132988166",
  "LISTERINE COOL MINT 500ML*": "7891010256753",
  "LOCAO NIVEA SOFT MILK 200ML": "4005808335435",
  "MACA PERUANA EM PO SEM SABOR 100G QUALYN": "7898767762827",
  "MAG FORCE 600MG C/60 CAPS QUALYNUTRI": "7898767760489",
  "METIL B12 600MG C/60 CAPS QUALYNUTRI": "7898767760540",
  "OMEGA 3 1000MG C/120 CAPS QUALYNUTRI": "7898767760632",
  "SAB DOVE RADIANT GLOW 135G": "7891150103672",
  "SAB GRANADO BEBE REFIL 250 ML TRAD": "7896512922373",
  "SAB GRANADO GLIC ROSA 90G": "7896512959898",
  "VASENOL REPAIRING S/FRAG 200ML": "7891150028470",
};

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

function paraRestrito(base, tipo) {
  const { concentracao, apresentacao } = lerNome(base.nome, base.lab);
  const controlado = tipo === "controlados";
  const tarja = base.tarja ?? (controlado && base.lista ? tarjaDaLista(base.lista) : null);
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
const consulteFmt = gerarRestrito(rec.consulte, "consulte");

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
const conInfo = paginarEEscrever(consulteFmt, "consulte");

writeJson("restritos-index.json", {
  geradoEm: rec.geradoEm,
  receita: recInfo,
  controlados: ctlInfo,
  consulte: conInfo,
});

console.log("Assets gerados com sucesso.");
console.log("Contagens: catálogo", itens.length, "receita", receitaFmt.length, "controlados", controladosFmt.length, "consulte", consulteFmt.length);
