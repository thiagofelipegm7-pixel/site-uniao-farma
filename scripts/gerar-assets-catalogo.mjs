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

// Réplica de SINONIMOS_BUSCA/sinonimosDe de busca.ts (palavras que o cliente usa e que não estão no nome); um teste confere que as duas saem iguais.
const SINONIMOS_BUSCA = [[/covid|sars/i, "teste rapido antigeno coronavirus sars cov 2 autoteste"]];
function sinonimosDe(nome) {
  return SINONIMOS_BUSCA.filter(([rx]) => rx.test(nome)).map(([, extra]) => extra).join(" ");
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

// Réplica de formaReconhecida/ilustracaoSemReceita de receita.ts (sem ativo nem apresentação); um teste confere que as duas saem iguais.
const pal = (alt) => new RegExp(`(?<![A-Z])(?:${alt})(?![A-Z])`);
const OTC_RX = [
  ["inal", pal("INAL[A-Z]*|AEROSS?OL|AER|HFA|DISCUS|TURBUHALER|SPRAY ORAL|AERODIN[A-Z]*|AEROLIN|BEROTEC|FOSTAIR|SPIOLTO|TRIMBOW|SYMBICORT|SERETIDE|SPIRIVA|ONBRIZE|CLENIL|ALENIA|LUGANO|FORASEQ|FLUIR|ATROVENT")],
  ["inj", pal("INJ[A-Z]*|AMP[A-Z]*|CANETA?|SERINGA|LIOF[A-Z]*|REFIL")],
  ["spr", pal("SPRAY|NASAL|SOL NAS[A-Z]*|JATO")],
  ["got", pal("GOTAS?|GTS?|COLIRIO|OFT[A-Z]*|OTO[A-Z]*")],
  ["cap", pal("CAPS?|CPS|CAPSULAS?")],
  ["cpr", pal("CPRS?|CP|COMP[A-Z]*|DRG|DRAGEAS?|CARTELA")],
  ["tub", pal("CR|CREME|CREM|POM|POMADA|GEL|BG|BISNAGAS?|DERM|LOCAO|PAST|VAG|APLIC?")],
  ["liq", pal("XPE|XAROPE|SUS|SUSP[A-Z]*|SOL|SOLUCAO|LIQ|EMULS[A-Z]*|ELIXIR|\\d+ ?ML")],
];
function ilustracaoSemReceita(nome) {
  const t = ` ${nome} `.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const achada = OTC_RX.find(([, rx]) => rx.test(t));
  const forma = achada ? (achada[0] === "inal" ? "spr" : achada[0]) : null;
  return forma && ["cpr", "cap", "liq", "got", "tub", "spr"].includes(forma) ? `/ilustrativas/otc-${forma}.webp` : "/ilustrativas/neutra.webp";
}

function fotoDoProduto(nome) {
  const n = nome.trim().replace(/\s+/g, " ");
  const ean = FOTOS_NACOES[n];
  return ean ? `/produtos/${ean}.webp` : null;
}

// Replicado de nome-exibicao.ts (simplificado, suficiente para pré-computar)
const PALAVRAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "app", "nome-exibicao-palavras.json"), "utf8"));
const MINUSCULAS = new Set(["de", "da", "do", "e", "com", "sem", "para", "em", "na", "no", "a", "o"]);
// Nomes corrigidos à mão no painel interno (mesma regra de app/nome-exibicao.ts).
const CORRIGIDOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados", "nomes-corrigidos.json"), "utf8"));
const chaveDoNome = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

function nomeDeExibicao(nomeBruto) {
  if (CORRIGIDOS[chaveDoNome(nomeBruto)]) return CORRIGIDOS[chaveDoNome(nomeBruto)];
  const limpo = nomeBruto.replace(/[*]+$/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return nomeBruto;
  // Mesma regra de app/nome-exibicao.ts (um teste confere que as duas saem iguais).
  const juntado = limpo.replace(/\broll on\b/gi, "roll-on");
  const brutas = juntado.split(" ");
  const partes = brutas.map((bruta, i) => {
    const anterior = brutas[i - 1] ?? "";
    const p = bruta.toLowerCase();
    if ((p === "g" || p === "gr") && !/^\d/.test(anterior)) return "G";
    const colada = /^(\d+)(cpr|comp|caps|cap|cps|drg|env)$/.exec(p);
    if (colada) return `${colada[1]} ${PALAVRAS[colada[2]] ?? colada[2]}`;
    const med = /^(\d+(?:[.,]\d+)?)(ml|mg|g|gr|kg|l|mcg|mts|mt)$/.exec(p);
    if (med) return `${med[1]}${med[2] === "gr" ? "g" : med[2] === "mts" || med[2] === "mt" ? "m" : med[2]}`;
    const comPre = /^c\/(\d+)$/.exec(p);
    if (comPre) return `com ${comPre[1]}`;
    if (PALAVRAS[p]) return PALAVRAS[p];
    if (MINUSCULAS.has(p)) return p;
    if (/^\d/.test(p) || /^fps\d*$/.test(p)) return p.toUpperCase().replace(/^FPS/, "FPS");
    return p.charAt(0).toUpperCase() + p.slice(1);
  });
  const texto = partes.join(" ").replace(/\s+/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Árvore de categorias (mesma regra de app/nacoes-unidas/produtos/arvore-categorias.ts; um teste confere que saem iguais).
const REGRAS_ARVORE = JSON.parse(fs.readFileSync(path.join(RAIZ, "app", "nacoes-unidas", "produtos", "arvore-categorias.json"), "utf8")).map((r) => ({ ...r, rx: new RegExp(r.padrao) }));
function tipoDoProduto(nome, departamento) {
  const n = nome.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  for (const r of REGRAS_ARVORE) if (r.departamento === departamento && r.rx.test(n)) return r.categoria;
  return "Outros";
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
  const lab = marcaDoItem(base.nome, base.lab);
  const { concentracao, apresentacao } = lerNome(base.nome, lab);
  const controlado = tipo === "controlados";
  const tarja = controlado ? tarjaControlado(base) : (base.tarja ?? null);
  let retencao = null;
  if (controlado || base.retencao === true || tarja === "preta" || tarja === "vermelha-retencao") retencao = true;
  else if (tarja === "vermelha") retencao = false;
  const aviso = tipo === "consulte" ? AVISO_CONSULTE : controlado ? AVISO_CONTROLADO : retencao === true ? AVISO_RETENCAO : AVISO_RECEITA;
  return {
    nome: base.nome,
    lab,
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
    busca: normalizarBusca(`${base.nome} ${lab} ${base.ativo ?? ""}`),
    nomeExibicao: nomeDeExibicao(base.nome),
    slug: slugify(base.nome),
    ...(typeof base.restam === "number" ? { restam: base.restam } : {}),
    ...(base.esgotado === true ? { esgotado: true } : {}),
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
// Esgotado (estoque zero): aparece nas listas com o selo "Esgotado" e sem botão de cesta, depois dos que têm estoque.
// Fica fora das sugestões da busca do cabeçalho e da cesta (catalogo-busca.json), que só oferecem o que dá para reservar.
// Réplica de marcaDoItem (marca.ts): marca preenchida no painel, senão o laboratório do sistema, senão a que o nome cita. Um teste confere as duas.
const REGRAS_MARCA = JSON.parse(fs.readFileSync(path.join(DADOS, "marcas-pelo-nome.json"), "utf8")).map(([padrao, marca]) => ({ rx: new RegExp(padrao), marca }));
const MARCAS_CORRIGIDAS = JSON.parse(fs.readFileSync(path.join(DADOS, "marcas-corrigidas.json"), "utf8"));
function semAcentoMaiusculo(t) {
  return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
function marcaDoItem(nome, lab) {
  const preenchida = MARCAS_CORRIGIDAS[semAcentoMaiusculo(nome).replace(/\s+/g, " ").trim()];
  if (preenchida) return preenchida;
  const l = String(lab ?? "").trim();
  if (l) return l;
  const n = semAcentoMaiusculo(nome);
  return REGRAS_MARCA.find((r) => r.rx.test(n))?.marca ?? "";
}
const itens = (cat.itens || []).map((i) => ({ ...i, lab: marcaDoItem(i.nome, i.lab) }));

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
    itens: list.sort((a, b) => Number(a.esgotado === true) - Number(b.esgotado === true) || a.nome.localeCompare(b.nome, "pt-BR")),
  }));

const POR_PAGINA = 48;

/** Cartão sem receita no índice da busca: mesmos campos das páginas, sem `busca`/`categoria` (a lista recalcula) e sem o nome bruto quando há nome de exibição. */
function itemOtcCompacto(i) {
  return {
    nomeExibicao: i.nomeExibicao || i.nome,
    lab: i.lab,
    ...(i.tipo ? { tipo: i.tipo } : {}),
    preco: i.preco,
    precoFmt: i.precoFmt,
    isMIP: i.isMIP,
    ...(typeof i.restam === "number" ? { restam: i.restam } : {}),
    ...(i.esgotado === true ? { esgotado: true } : {}),
    slug: i.slug,
    foto: i.foto,
  };
}

/** Cartão com receita/controlado no índice da busca: o que o cartão restrito e a ilustração da caixa leem (sem RMS, concentração e texto de busca). */
function itemRestritoCompacto(i) {
  return {
    nome: i.nome,
    nomeExibicao: i.nomeExibicao,
    slug: i.slug,
    lab: i.lab,
    preco: i.preco,
    tipo: i.tipo,
    ativo: i.ativo,
    tarja: i.tarja,
    retencao: i.retencao,
    apresentacao: i.apresentacao,
    aviso: i.aviso,
    controlado: i.controlado,
    generico: i.generico,
    ...(typeof i.restam === "number" ? { restam: i.restam } : {}),
    ...(i.esgotado === true ? { esgotado: true } : {}),
  };
}
const buscaIndex = [];
const esgotadosBusca = [];
const paginasIndex = []; // for client to know pages
// Índice único da página de produtos (busca-index.json): só o que a lista precisa para casar a busca e desenhar o cartão.
const buscaGrupos = [];

for (const g of grupos) {
  const slugCat = slugify(g.categoria);
  const itensFmt = g.itens.map((item) => {
    const precoFmt = formatBRL(item.preco);
    const nomeEx = nomeDeExibicao(item.nome);
    const slug = slugify(item.nome);
    const foto = fotoDoProduto(item.nome) ?? (item.categoria === "Medicamentos" ? ilustracaoSemReceita(item.nome) : null);
    const busca = normalizarBusca(`${nomeEx} ${item.nome} ${item.lab} ${item.categoria} ${sinonimosDe(item.nome)}`);
    const fmt = {
      nome: item.nome,
      nomeExibicao: nomeEx,
      lab: item.lab,
      categoria: item.categoria,
      tipo: tipoDoProduto(item.nome, item.categoria),
      preco: item.preco,
      precoFmt,
      isMIP: item.isMIP === true,
      ...(typeof item.restam === "number" ? { restam: item.restam } : {}),
      ...(item.esgotado === true ? { esgotado: true } : {}),
      slug,
      foto,
      busca,
    };
    if (item.esgotado === true) {
      // Só o painel de busca do cabeçalho lê esta lista (mostra "Esgotado"); a cesta e a leitura de receita continuam sem esgotados.
      esgotadosBusca.push({ nome: nomeEx, slug, foto, busca });
    }
    if (item.esgotado !== true) {
      buscaIndex.push({
        nome: nomeEx,
        slug,
        precoCentavos: Math.round(item.preco * 100),
        foto,
        busca,
      });
    }
    return fmt;
  });

  const paginas = Math.ceil(itensFmt.length / POR_PAGINA);
  for (let p = 0; p < paginas; p++) {
    const slice = itensFmt.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
    writeJson(`catalogo/${slugCat}/p${p + 1}.json`, slice);
  }
  buscaGrupos.push({
    categoria: g.categoria,
    slug: slugCat,
    itens: itensFmt.map(itemOtcCompacto),
  });
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
  // Esgotados ficam na lista (selo "Esgotado"), depois dos que têm estoque; só saem da busca do cabeçalho.
  return (lista || []).map((base) => paraRestrito(base, tipo)).sort((a, b) => Number(a.esgotado === true) - Number(b.esgotado === true));
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

// Esgotados (sem receita, receita e controlados) para o painel de busca avisar "Esgotado". Arquivo separado: não entra na cesta nem na leitura de receita.
for (const i of [...receitaFmt, ...controladosFmt]) {
  if (i.esgotado === true) esgotadosBusca.push({ nome: i.nomeExibicao, slug: i.slug, foto: null, busca: i.busca });
}
writeJson("esgotados-busca.json", esgotadosBusca);

const recInfo = paginarEEscrever(receitaFmt, "receita");
const ctlInfo = paginarEEscrever(controladosFmt, "controlados");
const conInfo = { total: 0, paginas: 0 };

// Índice leve para a busca do cabeçalho achar também os medicamentos com receita, os controlados e os "consulte o farmacêutico".
writeJson(
  "restritos-busca.json",
  [...receitaFmt, ...controladosFmt, ...consulteFmt].filter((i) => i.esgotado !== true).map((i) => ({
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

// Índice único da página de produtos: uma requisição em vez de todas as fatias (catálogo + receita + controlados).
// Mesma ordem das fatias, para a lista sair igual; os restritos vêm na ordem receita → controlados (a lista reordena).
writeJson("busca-index.json", {
  geradoEm: cat.geradoEm,
  grupos: buscaGrupos,
  restritos: [...receitaFmt, ...controladosFmt].map(itemRestritoCompacto),
});

console.log("Assets gerados com sucesso.");
console.log("Contagens: catálogo", itens.length, "receita", receitaFmt.length, "controlados", controladosFmt.length, "consulte", consulteFmt.length);
