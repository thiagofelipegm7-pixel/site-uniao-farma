import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

register(new URL("./resolve-ts.mjs", import.meta.url));

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
const json = async (f) => JSON.parse(await read(f));
const D = "app/nacoes-unidas/produtos/dados";
const rmod = () => import("../app/nacoes-unidas/produtos/receita.ts");

test("dados estáticos: sem estoque, código de barras ou segredos", async () => {
  for (const f of [`${D}/catalogo-nacoes.json`, `${D}/receita-nacoes.json`]) {
    const raw = await read(f);
    const chaves = new Set();
    JSON.stringify(JSON.parse(raw), (k, v) => (chaves.add(k), v));
    for (const proibida of ["estoque", "Estoque", "CodigoDeBarras", "barras", "token", "senha", "password"]) {
      assert.ok(!chaves.has(proibida), `${f} tem o campo ${proibida}`);
    }
    assert.doesNotMatch(raw, /\b[A-Za-z0-9_-]{32,}\b/, `${f} parece conter token`);
  }
});

test("dados estáticos: data dos dados é 31/10/2026 e totais batem", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  assert.match(cat.geradoEm, /^2026-10-31/);
  assert.match(rx.geradoEm, /^2026-10-31/);
  assert.equal(rx.totalReceita, rx.receita.length);
  assert.equal(rx.totalControlados, rx.controlados.length);
  assert.equal(rx.totalConsulte, rx.consulte.length);
  assert.ok(cat.itens.length > 1000);
});

test("receita e controlados não aparecem no catálogo principal", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  const normal = new Set(cat.itens.map((i) => `${i.nome}|${i.lab}|${i.preco}`));
  for (const i of [...rx.receita, ...rx.controlados, ...rx.consulte]) {
    assert.ok(!normal.has(`${i.nome}|${i.lab}|${i.preco}`), `${i.nome} está no catálogo normal`);
  }
});

test("todo item restrito tem nome; preço positivo ou ausente (nunca inventado); controlado tem lista da Portaria 344", async () => {
  const rx = await json(`${D}/receita-nacoes.json`);
  for (const i of [...rx.receita, ...rx.controlados, ...rx.consulte]) {
    assert.ok(i.nome && i.nome.trim());
    assert.ok(i.preco === null || (typeof i.preco === "number" && i.preco > 0), i.nome);
    if (i.rms !== undefined) assert.match(i.rms, /^\d\.\d{4}\.\d{4}$/, i.nome);
    if (i.tarja !== undefined) assert.ok(["preta", "vermelha", "vermelha-retencao"].includes(i.tarja), i.nome);
  }
  for (const i of rx.controlados) assert.match(i.lista, /^(A1|A2|A3|B1|B2|C1|C2|C3|C4|C5|A\/B)$/, i.nome);
  assert.ok(rx.consulte.length > 100, "lista consulte-o-farmacêutico vazia");
});

test("avisos, selo e imagem genérica", async () => {
  const r = await rmod();
  assert.equal(r.AVISO_RECEITA, "Venda sob prescrição médica");
  assert.equal(r.AVISO_CONTROLADO, "Venda sob prescrição médica com retenção da receita");
  assert.equal(r.AVISO_CONSULTE, "Consulte o farmacêutico");
  assert.equal(r.SELO_CONTROLADO, "Controlado");
  const img = await readFile(new URL(`../public${r.IMAGEM_GENERICA}`, import.meta.url));
  assert.ok(img.length > 1000);
});

test("lista restrita: sem oferta, % OFF, preço riscado ou destaque; cesta só para retirada com receita", async () => {
  for (const f of [
    "app/nacoes-unidas/produtos/ListaRestrita.tsx",
    "app/nacoes-unidas/produtos/receita/page.tsx",
    "app/nacoes-unidas/produtos/controlados/page.tsx",
    "app/nacoes-unidas/produtos/consulte-o-farmaceutico/page.tsx",
    "app/nacoes-unidas/produtos/receita.ts",
  ]) {
    const src = (await read(f)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /ReservaFluxo|Adicionar|<del|<s>|line-through|% ?OFF|desconto|destaque|banner|isMIP/i, f);
  }
  const lista = await read("app/nacoes-unidas/produtos/ListaRestrita.tsx");
  assert.match(lista, /\{item\.aviso\}/);
  assert.match(lista, /SELO_CONTROLADO/);
  // Cesta nos itens com receita e controlados (retirada na loja); "consulte o farmacêutico" fica sem cesta.
  assert.match(lista, /item\.tipo !== "consulte" && item\.preco !== null/);
  assert.match(lista, /receita=\{item\.controlado \? "controlado" : "receita"\}/);
  const { carregarRestritos, AVISO_CONTROLADO, AVISO_RECEITA, AVISO_RETENCAO, AVISO_CONSULTE } = await rmod();
  const c = carregarRestritos();
  assert.ok(c.controlados.length > 100 && c.receita.length > 100 && c.consulte.length > 100);
  for (const i of c.controlados) {
    assert.equal(i.aviso, AVISO_CONTROLADO, i.nome);
    assert.equal(i.controlado, true);
    assert.equal(i.retencao, true);
    assert.ok(i.rms === null || /^\d\.\d{4}\.\d{4}$/.test(i.rms), i.nome);
  }
  for (const i of c.receita) {
    assert.ok([AVISO_RECEITA, AVISO_RETENCAO].includes(i.aviso), i.nome);
    assert.equal(i.controlado, false);
    assert.equal(i.aviso === AVISO_RETENCAO, i.retencao === true, i.nome);
  }
  for (const i of c.consulte) {
    assert.equal(i.aviso, AVISO_CONSULTE, i.nome);
    assert.equal(i.controlado, false);
  }
  assert.match(await read("app/nacoes-unidas/produtos/CartaoPanvel.tsx"), /Consultar/);
  assert.match(await read("app/nacoes-unidas/produtos/restritos-meta.ts"), /index: false/);
  const rxPage = await read("app/nacoes-unidas/produtos/receita/page.tsx");
  const ctPage = await read("app/nacoes-unidas/produtos/controlados/page.tsx");
  assert.match(rxPage, /ListaRestrita/);
  assert.match(ctPage, /ListaRestrita/);
  assert.match(await read("app/nacoes-unidas/produtos/consulte-o-farmaceutico/page.tsx"), /ListaRestrita/);
  // campos da ficha (tarja, RMS, princípio ativo, fabricante, retenção, como comprar) sem texto de preço promocional
  for (const campo of ["Princípio ativo", "Fabricante", "Registro MS (RMS)", "Tarja", "Retenção da receita", "COMO_COMPRAR"]) assert.ok(lista.includes(campo), campo);
});

test("tarja pela lista da Portaria 344 e retenção nunca afirmada sem fonte", async () => {
  const { tarjaDaLista, carregarRestritos } = await rmod();
  assert.equal(tarjaDaLista("B1"), "preta");
  assert.equal(tarjaDaLista("A2"), "preta");
  assert.equal(tarjaDaLista("C1"), "vermelha-retencao");
  assert.equal(tarjaDaLista("D1"), null);
  for (const i of carregarRestritos().receita) if (i.retencao === false) assert.equal(i.tarja, "vermelha", i.nome);
});

test("lerNome: concentração e apresentação só quando legíveis", async () => {
  const { lerNome } = await rmod();
  const a = lerNome("ALPRAZOLAM 0.5MG CX 30CPR EMS", "EMS GENERI");
  assert.match(a.concentracao ?? "", /0[.,]5\s?mg/i);
  const b = lerNome("PRODUTO SEM NADA", "X");
  assert.equal(b.concentracao, null);
});

test("paginar e filtrarRestritos", async () => {
  const { paginar, filtrarRestritos } = await rmod();
  const itens = Array.from({ length: 100 }, (_, i) => ({ nome: `ITEM ${i}`, lab: "L", preco: 1 }));
  const p = paginar(itens, 3, 48);
  assert.equal(p.paginas, 3);
  assert.equal(p.itens.length, 4);
  assert.equal(paginar(itens, 99, 48).pagina, 3);
  assert.equal(filtrarRestritos(itens, "item 7").length >= 1, true);
});

test("CSV de controlados e duvidosos existe, sem barras vazias e sem segredos", async () => {
  const csv = await read("ops/catalogo-nacoes/relatorio-controlados-e-duvidosos.csv");
  const linhas = csv.trim().split(/\r?\n/);
  assert.match(linhas[0], /categoria;Produto;Laboratorio;Classe;Pvenda;ativo;lista;motivo;CodigoDeBarras/);
  assert.ok(linhas.some((l) => l.startsWith("controlado_publicado;")));
  assert.ok(linhas.some((l) => l.startsWith("duvidoso;")));
  assert.doesNotMatch(csv, /token|senha|password/i);
});

test("CSV de revisão do Thiago: 972 duvidosos originais, coluna categoria_final em branco, sem segredos", async () => {
  const csv = await read("ops/catalogo-nacoes/revisao-thiago.csv");
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (const ch of csv.replace(/^\uFEFF/, "")) {
    if (ch === '"') aspas = !aspas;
    else if (ch === ";" && !aspas) {
      linha.push(campo);
      campo = "";
    } else if (ch === "\n" && !aspas) {
      linha.push(campo.replace(/\r$/, ""));
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  const cab = linhas[0];
  for (const c of ["Produto", "origem", "onde_esta_no_site", "confianca", "evidencia", "categoria_final", "observacao"]) assert.ok(cab.includes(c), c);
  const iFinal = cab.indexOf("categoria_final");
  const iOrig = cab.indexOf("origem");
  const dados = linhas.slice(1).filter((l) => l.length > 1);
  assert.equal(dados.filter((l) => l[iOrig] === "um dos 972 duvidosos").length, 972);
  for (const l of dados) {
    assert.equal(l.length, cab.length);
    assert.equal(l[iFinal], "");
  }
  assert.doesNotMatch(csv, /token|senha|password/i);
});

test("selo/etiqueta 'Sem receita' removido de todos os cards de produto e ofertas", async () => {
  for (const f of [
    "app/nacoes-unidas/produtos/CatalogoLista.tsx",
    "app/nacoes-unidas/produtos/[slug]/page.tsx",
    "app/shop/DestaquesSemana.tsx",
    "app/HomeReasons.tsx",
    "app/PublicOffersGrid.tsx",
    "app/visual-fase2.tsx",
    "app/nacoes-unidas/produtos/ListaRestrita.tsx",
    "app/nacoes-unidas/produtos/consulte-o-farmaceutico/page.tsx",
  ]) {
    const src = await read(f);
    assert.doesNotMatch(src, /SeloSemReceita|selo-sem-receita|<p className="produto-selo"|>\s*Sem receita\s*</, f);
  }
});

test("catálogo Nações: todos os itens estão nas 8 categorias da loja", async () => {
  const { carregarCatalogoNacoes, CATEGORIAS_ORDEM } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const validas = new Set(CATEGORIAS_ORDEM);
  assert.equal(CATEGORIAS_ORDEM.length, 8);
  const itens = carregarCatalogoNacoes().itens;
  assert.ok(itens.length > 1000);
  for (const item of itens) assert.ok(validas.has(item.categoria), `${item.nome}: ${item.categoria}`);
});

test("catálogo Nações: busca e páginas trazem todas as fotos do mapa de imagens.ts", async () => {
  const { FOTOS_NACOES } = await import("../app/nacoes-unidas/produtos/imagens.ts");
  const busca = await json("public/dados/nacoes/catalogo-busca.json");
  assert.equal(busca.filter((i) => i.foto).length, Object.keys(FOTOS_NACOES).length);
});

test("departamentos: cada categoria do catálogo tem a sua página e o menu aponta para ela", async () => {
  const { DEPARTAMENTOS, acharDepartamento } = await import("../app/nacoes-unidas/produtos/departamentos.ts");
  const { CATEGORIAS_ORDEM, slugify, carregarCatalogoNacoes } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  assert.deepEqual(DEPARTAMENTOS.map((d) => d.nome), CATEGORIAS_ORDEM);
  for (const d of DEPARTAMENTOS) assert.equal(d.slug, slugify(d.nome));
  assert.equal(acharDepartamento("beleza")?.nome, "Beleza");
  assert.equal(acharDepartamento("nao-existe"), null);
  for (const item of carregarCatalogoNacoes().itens) assert.ok(acharDepartamento(slugify(item.categoria)), item.categoria);
  const gaveta = await read("app/shop/DepartamentosGaveta.tsx");
  const tiles = await read("app/shop/ShopSections.tsx");
  for (const d of DEPARTAMENTOS.filter((x) => !x.provisorio)) {
    assert.ok(gaveta.includes(`/departamentos/${d.slug}`), `gaveta: ${d.slug}`);
    assert.ok(tiles.includes(`/departamentos/${d.slug}`), `carrossel: ${d.slug}`);
  }
  const provisorios = DEPARTAMENTOS.filter((x) => x.provisorio);
  assert.ok(provisorios.some((d) => d.slug === "categoria-a-conferir"));
  const paginaDep = await read("app/departamentos/[slug]/page.tsx");
  for (const d of provisorios) {
    assert.equal(gaveta.includes(`/departamentos/${d.slug}`), false, `gaveta não deve ter ${d.slug}`);
    assert.equal(tiles.includes(`/departamentos/${d.slug}`), false, `carrossel não deve ter ${d.slug}`);
  }
  assert.match(paginaDep, /departamentosPublicos\(\)\.map/);
  assert.match(paginaDep, /dep\.provisorio\) notFound/);
  assert.equal(existsSync(new URL("../public/dados/nacoes/catalogo/categoria-a-conferir", import.meta.url)), false);
});

test("catálogo Nações: o slug de cada cartão leva à página do produto", async () => {
  const { carregarCatalogoNacoes, acharPorSlug } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const itens = carregarCatalogoNacoes().itens;
  const busca = await json("public/dados/nacoes/catalogo-busca.json");
  for (const entrada of busca) assert.ok(acharPorSlug(itens, entrada.slug), `sem página: ${entrada.slug}`);
  const pagina = await json("public/dados/nacoes/catalogo/cuidado-diario/p1.json");
  for (const item of pagina) assert.ok(acharPorSlug(itens, item.slug), `sem página: ${item.slug}`);
});

test("receita e controlados: cada medicamento recebe a ilustração da sua forma e faixa", async () => {
  const { imagemIlustrativa, formaDoMedicamento, ILUSTRACOES } = await import("../app/nacoes-unidas/produtos/receita.ts");
  for (const i of ILUSTRACOES) await readFile(new URL(`../public/ilustrativas/${i.arquivo}.webp`, import.meta.url));
  assert.equal(formaDoMedicamento("AAS PROTECT 100MG C 30 COMP", null), "cpr");
  assert.equal(formaDoMedicamento("VERUTEX B 20+1MG CREME DERM BG 15G", "CREME DERM BG 15G"), "tub");
  assert.equal(formaDoMedicamento("FOSTAIR 200+6mcg SPRAY ORAL 120 DOSES", null), "inal");
  assert.equal(formaDoMedicamento("OZIVY 1.34MG/ML 3ML 1CANET 4AGLH", null), "inj");
  const base = { apresentacao: null, tipo: "receita", tarja: "vermelha", retencao: false, controlado: false, generico: false };
  assert.equal(imagemIlustrativa({ ...base, nome: "X 500MG CX 30 COMP" }), "/ilustrativas/cpr-ref-vermelha.webp");
  assert.equal(imagemIlustrativa({ ...base, nome: "X 500MG CX 30 COMP", generico: true }), "/ilustrativas/cpr-gen-vermelha.webp");
  assert.equal(imagemIlustrativa({ ...base, nome: "X 500MG CX 30 COMP", tarja: "vermelha-retencao", retencao: true }), "/ilustrativas/cpr-ref-retencao.webp");
  assert.equal(imagemIlustrativa({ ...base, nome: "ALPRAZOLAM 0.5MG CX 30CPR", tipo: "controlados", tarja: "preta", retencao: true, controlado: true, generico: true }), "/ilustrativas/cpr-gen-preta.webp");
  assert.equal(imagemIlustrativa({ ...base, nome: "X GOTAS 20ML", tipo: "controlados", tarja: "preta", retencao: true, controlado: true }), "/ilustrativas/got-ref-preta.webp");
  assert.equal(imagemIlustrativa({ ...base, nome: "QUALQUER", tipo: "consulte", tarja: null, retencao: null }), "/produtos/generica-ilustrativa.webp");
});

test("acesso livre: a busca do cabeçalho e o menu levam aos medicamentos com receita e controlados", async () => {
  const idx = await json("public/dados/nacoes/restritos-index.json");
  const busca = await json("public/dados/nacoes/restritos-busca.json");
  assert.equal(busca.length, idx.receita.total + idx.controlados.total);
  assert.ok(busca.every((i) => (i.tipo === "receita" || i.tipo === "controlados") && typeof i.busca === "string"));
  const header = await read("app/shop/ShopHeader.tsx");
  assert.match(header, /restritos-busca\.json/);
  assert.match(header, /ROTA_RESTRITA\[item\.tipo\]/);
  const gaveta = await read("app/shop/DepartamentosGaveta.tsx");
  assert.ok(gaveta.includes("/nacoes-unidas/produtos/receita") && gaveta.includes("/nacoes-unidas/produtos/controlados"));
  const pagina = await read("app/departamentos/[slug]/page.tsx");
  assert.ok(pagina.includes('dep.slug === "medicamentos"') && pagina.includes("/nacoes-unidas/produtos/receita"));
});

test("medicamentos: o departamento reúne sem receita, com receita, controlados e consulte numa lista só", async () => {
  const pagina = await read("app/departamentos/[slug]/page.tsx");
  assert.ok(pagina.includes('dep.slug === "medicamentos"') && pagina.includes("<MedicamentosTodos"));
  const comp = await read("app/nacoes-unidas/produtos/MedicamentosTodos.tsx");
  for (const tipo of ["receita", "controlados", "consulte"]) assert.ok(comp.includes(`"${tipo}"`), tipo);
  assert.match(comp, /restritos-index\.json/);
  assert.match(comp, /restritos\/\$\{tipo\}\/p\$\{p\}\.json/);
  const idx = await json("public/dados/nacoes/restritos-index.json");
  const cat = await json("public/dados/nacoes/catalogo-index.json");
  const otc = cat.grupos.find((g) => g.slug === "medicamentos").total;
  assert.equal(otc + idx.receita.total + idx.controlados.total + idx.consulte.total, 1716);
});

test("cartão de produto no padrão da Panvel: um componente só, com as medidas do cards.htm", async () => {
  const comp = await read("app/nacoes-unidas/produtos/CartaoPanvel.tsx");
  for (const c of ["pv-cesta", "pv-corpo", "pv-img", "pv-nome", "pv-marca", "pv-apres", "pv-preco"]) assert.ok(comp.includes(c), c);
  const { partesPreco } = await import("../app/nacoes-unidas/produtos/preco.ts");
  assert.deepEqual(partesPreco("R$ 19,49"), { reais: "19", centavos: "49" });
  assert.deepEqual(partesPreco("R$ 1.234,50"), { reais: "1.234", centavos: "50" });
  assert.equal(partesPreco("Consultar"), null);
  const css = await read("app/shop/shop.css");
  assert.match(css, /grid-template-columns: repeat\(auto-fill, 229px\); gap: 20px/);
  assert.match(css, /\.pv-preco b \{ font-size: 26px; font-weight: 900/);
  for (const f of ["app/nacoes-unidas/produtos/CatalogoLista.tsx", "app/nacoes-unidas/produtos/MedicamentosTodos.tsx", "app/nacoes-unidas/produtos/ListaRestrita.tsx", "app/shop/DestaquesSemana.tsx"]) {
    assert.match(await read(f), /CartaoPanvel|<Cartao /, f);
  }
});

test("ilustração: inaladores usam a caixa com o inalador; spray nasal usa a de spray", async () => {
  const { imagemIlustrativa } = await rmod();
  const base = { apresentacao: null, tipo: "receita", tarja: "vermelha", retencao: false, controlado: false, generico: false };
  for (const [nome, ativo] of [["SYMBICORT 6mcg/dos+200mcg/dos 120 DOSES", "budesonida;fumarato de formoterol"], ["AEROLIN spray cx c/200 DOSES", "sulfato de salbutamol"], ["SERETIDE 25+125mcg spray", "propionato de fluticasona;xinafoato de salmeterol"], ["ALENIA 6+200mcg REFIL 60CAPS", "budesonida;formoterol"], ["BEROTEC SPRAY 100 MCG", "bromidrato de fenoterol"], ["AERODINI SPRAY", null], ["AERODINI 100MCG SPRAY 200 DOSES", ""]]) {
    assert.match(imagemIlustrativa({ ...base, nome, ativo }), /inal-ref-vermelha/, nome);
  }
  for (const [nome, ativo] of [["MOMETASONA 50MCG 120 DOSES NEO QUIMICA", "furoato de mometasona"], ["BUSONID 64MCG 120 DOSES 6ML", "budesonida"], ["NASONEX SPRAY NASAL 120 D", "furoato de mometasona"]]) {
    assert.match(imagemIlustrativa({ ...base, nome, ativo }), /spr-/, nome);
  }
});

test("paginação: 24 por página e números como na Panvel (1 2 3 4 … última)", async () => {
  const { paginasVisiveis } = await import("../app/nacoes-unidas/produtos/Paginacao.tsx").catch(() => ({ paginasVisiveis: null }));
  assert.equal(paginasVisiveis, null); // .tsx não carrega no teste: a regra é conferida pelo texto abaixo
  const fonte = await read("app/nacoes-unidas/produtos/Paginacao.tsx");
  assert.match(fonte, /POR_PAGINA = 24/);
  assert.match(fonte, /if \(atual <= 3\) \[2, 3, 4\]/);
  for (const f of ["CatalogoLista.tsx", "MedicamentosTodos.tsx", "ListaRestrita.tsx"]) {
    const src = await read(`app/nacoes-unidas/produtos/${f}`);
    assert.match(src, /<Paginacao /, f);
    assert.match(src, /POR_PAGINA/, f);
  }
  assert.match(await read("app/departamentos/[slug]/page.tsx"), /paginaInicial=\{paginaPedida\}/);
});
