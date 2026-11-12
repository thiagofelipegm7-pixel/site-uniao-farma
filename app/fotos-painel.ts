/**
 * Painel interno "Fotos dos produtos": junta o estoque de agora (export do DMaster) com o que já tem foto no site,
 * para ver o que está pronto e o que falta, começando pelo que mais vale parado no estoque. Funções puras (sem rede).
 */
import { marcaDoItem } from "./nacoes-unidas/produtos/marca";

export type LinhaFoto = {
  sistemaRestrito?: boolean;
  ean: string;
  nome: string;
  lab: string;
  classe: string;
  estoque: number;
  preco: number;
  /** estoque x preço (0 se estoque <= 0) */
  valor: number;
  controlado: boolean;
  antimicrobiano: boolean;
  categoria: string;
  noSite: boolean;
  /** O estoque não tem código de barras: o código acima é gerado do nome (começa com 99) só para guardar a foto. */
  semCodigo?: boolean;
};

export const SEM_CATEGORIA = "Fora do site";

/** Nome sem acento, em maiúsculas e sem espaço repetido: chave para cruzar o estoque com o catálogo do site. */
export function chaveDeNome(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

const LAB_VAZIO = /^(diversos|china|)$/i;

type ExportItem = Record<string, unknown>;

/**
 * Item sem código de barras no estoque: gera um código numérico fixo a partir do nome (13 dígitos, começa com 99, prefixo que
 * nenhum produto real usa) para a foto ter onde ficar (public/produtos/<código>.webp). O mesmo nome sempre dá o mesmo código.
 */
export function codigoDoNome(nome: string): string {
  const base = chaveDeNome(nome);
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < base.length; i += 1) {
    const c = base.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c ^ (i & 0xff), 0x85ebca6b) >>> 0;
  }
  return `99${String(a).padStart(10, "0").slice(-6)}${String(b).padStart(10, "0").slice(-5)}`;
}

/** Converte o export do DMaster nas linhas do painel. `categorias` vai de chave de nome -> categoria do site. */
export function montarLinhas(itens: readonly ExportItem[], eansComFoto: ReadonlySet<string>, categorias: ReadonlyMap<string, string>): LinhaFoto[] {
  const linhas: LinhaFoto[] = [];
  const vistos = new Set<string>();
  for (const it of itens) {
    const nome = typeof it.Produto === "string" ? it.Produto.replace(/\s+/g, " ").trim() : "";
    const eanReal = String(it.CodigoDeBarras ?? "").trim();
    if (!nome) continue;
    if (/TAXA DE ENTREGA|APLICACAO|AFERIMENTO|XEROX|MANIPULACAO/i.test(nome)) continue;
    const ean = eanReal || codigoDoNome(nome);
    if (vistos.has(ean)) continue;
    vistos.add(ean);
    const estoque = typeof it.Estoque === "number" && Number.isFinite(it.Estoque) ? Math.floor(it.Estoque) : 0;
    const preco = typeof it.Pvenda === "number" && it.Pvenda > 0 ? it.Pvenda : 0;
    const lab = typeof it.Laboratorio === "string" ? it.Laboratorio.trim() : "";
    linhas.push({
      ean,
      nome,
      lab: marcaDoItem(nome, LAB_VAZIO.test(lab) ? "" : lab),
      classe: typeof it.Classe === "string" ? it.Classe.trim() : "",
      estoque,
      preco,
      valor: estoque > 0 ? Math.round(estoque * preco * 100) / 100 : 0,
      controlado: it.ProdutoControlado === true || it.ProdutoControlado === 1,
      antimicrobiano: it.ProdutoAntimicrobiano === true || it.ProdutoAntimicrobiano === 1,
      categoria: categorias.get(chaveDeNome(nome)) ?? SEM_CATEGORIA,
      noSite: eansComFoto.has(ean),
      ...(eanReal ? {} : { semCodigo: true }),
    });
  }
  return linhas;
}

export type ResumoFotos = {
  total: number;
  comFoto: number;
  faltam: number;
  faltamComEstoque: number;
  valorSemFoto: number;
  comEstoque: number;
  comEstoqueComFoto: number;
  /** Só o que o cliente vê com foto no site: fora medicamentos com receita, controlados e itens que não estão no site. */
  aVenda: number;
  aVendaComFoto: number;
  aVendaFaltamComEstoque: number;
  aVendaValorSemFoto: number;
  aVendaComEstoque: number;
  aVendaComEstoqueComFoto: number;
  /** Itens que não entram na conta de foto (receita, controlados, fora do site). */
  fora: number;
};

/** Item que aparece com foto na loja: está no catálogo do site e não é medicamento de receita ou controlado (esses só mostram preço). */
export function ehAVenda(l: Pick<LinhaFoto, "categoria">): boolean {
  return l.categoria !== SEM_CATEGORIA && l.categoria !== "Com receita" && l.categoria !== "Controlados";
}

export function resumirFotos(linhas: readonly LinhaFoto[]): ResumoFotos {
  const comEstoque = linhas.filter((l) => l.estoque > 0);
  const faltam = linhas.filter((l) => !l.noSite);
  const faltamComEstoque = faltam.filter((l) => l.estoque > 0);
  const venda = linhas.filter(ehAVenda);
  const vendaComEstoque = venda.filter((l) => l.estoque > 0);
  const vendaFaltam = vendaComEstoque.filter((l) => !l.noSite);
  return {
    aVenda: venda.length,
    aVendaComFoto: venda.filter((l) => l.noSite).length,
    aVendaFaltamComEstoque: vendaFaltam.length,
    aVendaValorSemFoto: Math.round(vendaFaltam.reduce((s, l) => s + l.valor, 0) * 100) / 100,
    aVendaComEstoque: vendaComEstoque.length,
    aVendaComEstoqueComFoto: vendaComEstoque.filter((l) => l.noSite).length,
    fora: linhas.length - venda.length,
    total: linhas.length,
    comFoto: linhas.length - faltam.length,
    faltam: faltam.length,
    faltamComEstoque: faltamComEstoque.length,
    valorSemFoto: Math.round(faltamComEstoque.reduce((s, l) => s + l.valor, 0) * 100) / 100,
    comEstoque: comEstoque.length,
    comEstoqueComFoto: comEstoque.filter((l) => l.noSite).length,
  };
}

export type FiltroFotos = {
  busca?: string;
  categoria?: string;
  estoque?: "" | "com" | "zero";
  fotos?: "" | "faltam" | "site" | "pc";
  tipo?: "" | "controlado" | "antimicrobiano" | "semcodigo";
  /** EANs que o usuário marcou como "tenho a foto no PC" (guardado só no navegador dele). */
  marcados?: ReadonlySet<string>;
};

export function filtrarLinhas(linhas: readonly LinhaFoto[], f: FiltroFotos): LinhaFoto[] {
  const q = f.busca ? chaveDeNome(f.busca) : "";
  return linhas.filter((l) => {
    if (q && !chaveDeNome(`${l.ean} ${l.nome} ${l.lab}`).includes(q)) return false;
    if (f.categoria && l.categoria !== f.categoria) return false;
    if (f.estoque === "com" && l.estoque <= 0) return false;
    if (f.estoque === "zero" && l.estoque > 0) return false;
    if (f.fotos === "faltam" && l.noSite) return false;
    if (f.fotos === "site" && !l.noSite) return false;
    if (f.fotos === "pc" && !(f.marcados?.has(l.ean) && !l.noSite)) return false;
    if (f.tipo === "controlado" && !l.controlado) return false;
    if (f.tipo === "antimicrobiano" && !l.antimicrobiano) return false;
    if (f.tipo === "semcodigo" && !l.semCodigo) return false;
    return true;
  });
}

const reais = (n: number) => n.toFixed(2).replace(".", ",");

/** CSV (separador ;) com BOM para abrir certo no Excel. */
export function csvDasLinhas(linhas: readonly LinhaFoto[], marcados?: ReadonlySet<string>): string {
  const cab = ["Código de barras", "Produto", "Laboratório", "Categoria", "Estoque", "Preço", "Valor em estoque", "Foto no site", "Marcado (tenho no PC)"];
  const aspas = (t: string) => `"${t.replace(/"/g, '""')}"`;
  const corpo = linhas.map((l) => [l.semCodigo ? "" : l.ean, aspas(l.nome), aspas(l.lab), aspas(l.categoria), l.estoque, reais(l.preco), reais(l.valor), l.noSite ? "sim" : "não", marcados?.has(l.ean) ? "sim" : "não"].join(";"));
  return "﻿" + [cab.join(";"), ...corpo].join("\n");
}

/** Serviços que o PC vende mas não são produto (igual a NAO_PRODUTO em ops/catalogo-nacoes/gerar.py). */
const SERVICOS = /TAXA DE ENTREGA|APLICACAO|AFERIMENTO|XEROX|MANIPULACAO/;
const BIJUTERIAS_PAINEL = /^(BRINCO |PIERCING |ANEL |COLAR |PULSEIRA |PINGENTE )/i;

export type Reconciliacao = {
  /** Linhas do export do PC. */
  pc: number;
  /** Serviços (taxa de entrega, aferição, xerox...): não são produto e não vão ao site. */
  servicos: number;
  /** Sem preço de venda no PC (zero ou vazio): a sincronização não publica até ter preço. */
  semPreco: number;
  /** Mesmo nome, laboratório e preço de outro item: o site mostra um só. */
  repetidos: number;
  /** Produtos que o site lista (pc − serviços − sem preço − repetidos), calculado agora com as regras do sincronizador. */
  noSite: number;
  /** Quantos produtos o site lista de fato nos arquivos publicados (receita, controlados e comuns). Sem valor quando não foi informado. */
  listadosNoSite: number | null;
  /** Bijuterias que o painel de fotos não conta. */
  bijuterias: number;
  /** Itens com o mesmo código de barras (ou sem código e mesmo nome): o painel de fotos conta uma linha só. */
  codigosRepetidos: number;
  /** Linhas que o painel de fotos conta (depois de tirar bijuterias e juntar códigos repetidos). */
  noPainel: number;
  /** Dessas, as sem preço de venda: ficam em "Fora do site" no painel. */
  semPrecoNoPainel: number;
  /** O que o painel mostra como "itens à venda no site" (noPainel − semPrecoNoPainel). */
  aVendaNoPainel: number;
};

/**
 * Faz as três contagens (PC, site, painel de fotos) fecharem: cada linha do PC cai em uma só conta.
 * Aproximação das regras do sincronizador (nome, laboratório e preço); `listadosNoSite` traz o número real publicado para comparar.
 */
export function reconciliarContagens(itens: readonly ExportItem[], listadosNoSite: number | null = null): Reconciliacao {
  let servicos = 0;
  let semPreco = 0;
  let semPrecoNoPainel = 0;
  let noSite = 0;
  let bijuterias = 0;
  const chavesSite = new Set<string>();
  const codigos = new Set<string>();
  let noPainel = 0;
  for (const it of itens) {
    const nome = typeof it.Produto === "string" ? it.Produto.replace(/\s+/g, " ").trim() : "";
    const classe = typeof it.Classe === "string" ? it.Classe.trim() : "";
    if (!nome || classe === "SERVICOS" || SERVICOS.test(chaveDeNome(nome))) {
      servicos += 1;
      continue;
    }
    const lab = typeof it.Laboratorio === "string" ? it.Laboratorio.trim() : "";
    const preco = typeof it.Pvenda === "number" && it.Pvenda > 0 ? it.Pvenda : 0;
    const chave = `${chaveDeNome(nome)}|${LAB_VAZIO.test(lab) ? "" : lab.toUpperCase()}|${preco}`;
    if (preco <= 0) semPreco += 1;
    else if (!chavesSite.has(chave)) {
      chavesSite.add(chave);
      noSite += 1;
    }
    if (BIJUTERIAS_PAINEL.test(nome)) {
      bijuterias += 1;
      continue;
    }
    const codigo = String(it.CodigoDeBarras ?? "").trim() || codigoDoNome(nome);
    if (!codigos.has(codigo)) {
      codigos.add(codigo);
      noPainel += 1;
      if (preco <= 0) semPrecoNoPainel += 1;
    }
  }
  const naoServico = itens.length - servicos;
  return {
    pc: itens.length,
    servicos,
    semPreco,
    repetidos: naoServico - semPreco - noSite,
    noSite,
    listadosNoSite,
    bijuterias,
    codigosRepetidos: naoServico - bijuterias - noPainel,
    noPainel,
    semPrecoNoPainel,
    aVendaNoPainel: noPainel - semPrecoNoPainel,
  };
}
