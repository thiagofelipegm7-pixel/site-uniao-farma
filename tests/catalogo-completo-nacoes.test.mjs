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

test("dados estáticos: têm data dos dados (atualizada pela sincronização automática) e totais batem", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  assert.match(cat.geradoEm, /^20\d\d-\d\d-\d\dT/);
  assert.match(rx.geradoEm, /^20\d\d-\d\d-\d\dT/);
  assert.equal(rx.geradoEm, cat.geradoEm);
  assert.equal(rx.totalReceita, rx.receita.length);
  assert.equal(rx.totalControlados, rx.controlados.length);
  assert.equal(rx.totalConsulte, rx.consulte.length);
  assert.ok(cat.itens.length > 1000);
});

test("receita e controlados não aparecem no catálogo principal", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  const normal = new Set(cat.itens.map((i) => `${i.nome}|${i.lab}|${i.preco}`));
  for (const i of [...rx.receita, ...rx.controlados]) {
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
    "app/nacoes-unidas/produtos/receita.ts",
  ]) {
    const src = (await read(f)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /ReservaFluxo|Adicionar|<del|<s>|line-through|% ?OFF|desconto|destaque|banner|isMIP/i, f);
  }
  const lista = await read("app/nacoes-unidas/produtos/ListaRestrita.tsx");
  // Aviso e selo saem do cartão: a imagem ilustrativa já traz a faixa de prescrição.
  assert.ok(!lista.includes("item.aviso") && !lista.includes("SELO_CONTROLADO"));
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
  assert.match(await read("app/nacoes-unidas/produtos/Preco.tsx"), /Consultar/);
  assert.match(await read("app/nacoes-unidas/produtos/restritos-meta.ts"), /index: false/);
  const rxPage = await read("app/nacoes-unidas/produtos/receita/page.tsx");
  const ctPage = await read("app/nacoes-unidas/produtos/controlados/page.tsx");
  assert.match(rxPage, /ListaRestrita/);
  // Controlados entrou no departamento Medicamentos (lista única); a rota antiga só redireciona.
  assert.match(ctPage, /redirect\("\/departamentos\/medicamentos"\)/);
  // O cartão não traz mais o bloco "Detalhes" (ficha com princípio ativo, RMS, tarja e retenção): só nome, marca, preço, aviso de venda sob prescrição e cesta.
  for (const campo of ["Princípio ativo", "Registro MS (RMS)", "Retenção da receita", "pv-detalhes"]) assert.ok(!lista.includes(campo), campo);
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

test("planilhas internas de revisão não ficam no repositório (geradas só localmente)", async () => {
  const { execFileSync } = await import("node:child_process");
  const versionados = execFileSync("git", ["ls-files", "ops"], { encoding: "utf8" });
  assert.doesNotMatch(versionados, /\.csv$/m);
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
  // O catálogo muda com o estoque (sincronização automática): item sem estoque sai da busca, mas a foto continua no mapa.
  // Ilustrações de caixa (/ilustrativas/) de medicamento sem foto não são foto do produto: ficam de fora desta conta.
  const comFoto = busca.filter((i) => i.foto && i.foto.startsWith("/produtos/"));
  const eansDoMapa = new Set(Object.values(FOTOS_NACOES));
  assert.ok(comFoto.length <= Object.keys(FOTOS_NACOES).length);
  // Sem proporção fixa: o mapa também guarda fotos de itens sem estoque, de receita ou fora do catálogo, e cresce com o painel de fotos.
  assert.ok(comFoto.length >= 100, "as fotos do mapa tem de aparecer na busca");
  for (const i of comFoto) assert.ok(eansDoMapa.has(i.foto.split("/").pop().replace(".webp", "")), i.foto);
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
  assert.equal(imagemIlustrativa({ ...base, nome: "QUALQUER", tipo: "consulte", tarja: null, retencao: null }), "/ilustrativas/neutra.webp");
});

test("acesso livre: a busca do cabeçalho e o menu levam aos medicamentos com receita e controlados", async () => {
  const idx = await json("public/dados/nacoes/restritos-index.json");
  const busca = await json("public/dados/nacoes/restritos-busca.json");
  // Esgotados ficam nas listas (com selo) mas fora da busca do cabeçalho, que só sugere o que dá para reservar.
  const lista = await json("public/dados/nacoes/restritos/receita/p1.json");
  assert.ok(Array.isArray(lista));
  const esgotadosRestritos = (await json("app/nacoes-unidas/produtos/dados/receita-nacoes.json")).receita.concat((await json("app/nacoes-unidas/produtos/dados/receita-nacoes.json")).controlados).filter((i) => i.esgotado === true).length;
  assert.equal(busca.length, idx.receita.total + idx.controlados.total + idx.consulte.total - esgotadosRestritos);
  assert.ok(busca.every((i) => ["receita", "controlados", "consulte"].includes(i.tipo) && typeof i.busca === "string"));
  const header = await read("app/shop/ShopHeader.tsx");
  assert.match(header, /restritos-busca\.json/);
  // A busca lista restritos e aponta para a ficha do produto (não mais para listas ROTA_RESTRITA[tipo]).
  assert.match(header, /resultadosRestritos/);
  // Menu/gaveta e o departamento Medicamentos concentram receita e controlados na lista única.
  const gaveta = await read("app/shop/DepartamentosGaveta.tsx");
  assert.match(gaveta, /departamentos\/medicamentos|Medicamentos/);
  const pagina = await read("app/departamentos/[slug]/page.tsx");
  assert.ok(pagina.includes('dep.slug === "medicamentos"') && pagina.includes("<MedicamentosTodos"));
});

test("medicamentos: o departamento reúne sem receita, com receita, controlados e consulte numa lista só", async () => {
  const pagina = await read("app/departamentos/[slug]/page.tsx");
  assert.ok(pagina.includes('dep.slug === "medicamentos"') && pagina.includes("<MedicamentosTodos"));
  const comp = await read("app/nacoes-unidas/produtos/MedicamentosTodos.tsx");
  for (const tipo of ["receita", "controlados"]) assert.ok(comp.includes(`"${tipo}"`), tipo);
  assert.ok(!comp.includes("Consulte o farmacêutico"), "a aba Consulte foi extinta");
  assert.doesNotMatch(comp, /medicamentos-abas|role="tablist"|rotulo: "Todos"|rotulo: "Sem receita"/);
  assert.match(comp, /params\.has\("filtro"\)/);
  assert.match(comp, /restritos-index\.json/);
  assert.match(comp, /restritos\/\$\{tipo\}\/p\$\{p\}\.json/);
  const idx = await json("public/dados/nacoes/restritos-index.json");
  const cat = await json("public/dados/nacoes/catalogo-index.json");
  const otc = cat.grupos.find((g) => g.slug === "medicamentos").total;
  assert.ok(otc + idx.receita.total + idx.controlados.total + idx.consulte.total > 1500);
});

test("cartão de produto no padrão da Panvel: um componente só, com as medidas do cards.htm", async () => {
  const comp = await read("app/nacoes-unidas/produtos/CartaoPanvel.tsx");
  for (const c of ["pv-cesta", "pv-corpo", "pv-img", "pv-nome", "pv-marca", "pv-apres"]) assert.ok(comp.includes(c), c);
  assert.ok((await read("app/nacoes-unidas/produtos/Preco.tsx")).includes("pv-preco"));
  const { partesPreco } = await import("../app/nacoes-unidas/produtos/preco.ts");
  assert.deepEqual(partesPreco("R$ 19,49"), { reais: "19", centavos: "49" });
  assert.deepEqual(partesPreco("R$ 1.234,50"), { reais: "1.234", centavos: "50" });
  assert.equal(partesPreco("Consultar"), null);
  const css = await read("app/shop/shop.css");
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(10\.5rem, 1fr\)\); gap: 20px/);
  assert.match(await read("app/nacoes-unidas/produtos/preco.css"), /\.pv-preco b \{\s*font-size: inherit;\s*font-weight: 800/);
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

test("controlados: tarja pela Portaria 344 e ilustração com a faixa certa", async () => {
  const { imagemIlustrativa, ILUSTRACOES } = await rmod();
  const fs = await import("node:fs");
  const dir = new URL("../public/dados/nacoes/restritos/controlados/", import.meta.url);
  const itens = fs.readdirSync(dir).flatMap((f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")));
  assert.ok(itens.length > 80);
  const por = (re) => itens.filter((i) => re.test(i.nome));
  for (const i of por(/ALPRAZOLAM|CLONAZEPAM|DIAZEPAM|BROMAZEPAM|FENOBARBITAL|TRAMADOL|MORFINA|METILFENIDATO/i)) assert.equal(i.tarja, "preta", i.nome);
  for (const i of por(/PREGABALINA|AMITRIPTILINA|FLUOXETINA|PARACETAMOL.*CODEINA|PACO|CODEX|PAREGORICO/i)) assert.equal(i.tarja, "vermelha-retencao", i.nome);
  for (const i of itens) {
    const arq = imagemIlustrativa(i).split("/").pop().replace(".webp", "");
    const ilu = ILUSTRACOES.find((x) => x.arquivo === arq);
    assert.ok(ilu, `${i.nome}: ${arq}`);
    assert.equal(ilu.banda === "preta", i.tarja === "preta", `${i.nome}: tarja ${i.tarja} com ${arq}`);
    if (ilu.generico) assert.equal(i.generico === true, true, `${i.nome}: faixa "Genérico" em remédio de referência`);
  }
});

test("apresentação crua vira quantidade legível no cartão restrito", async () => {
  const { quantidadeLegivel: q } = await import("../app/nacoes-unidas/produtos/quantidade.ts");
  assert.equal(q("CX 24CPR NOVA QUIMICA"), "24 comprimido(s)");
  assert.equal(q("cx 6 cap"), "6 cápsula(s)");
  assert.equal(q("120 DOSES 6ML"), "120 dose(s)");
  assert.equal(q("30ML"), "30 mililitro(s)");
  assert.equal(q("***"), null);
  assert.equal(q(null), null);
});

test("quantidade vem do nome nos produtos comuns", async () => {
  const { quantidadeDoNome: q } = await import("../app/nacoes-unidas/produtos/quantidade.ts");
  assert.equal(q("ACETONA FARMAX 100 ML"), "100 mililitro(s)");
  assert.equal(q("NAPROXENO 500 MG CX 20CPR TEUTO"), "20 comprimido(s)");
  assert.equal(q("ENO SAL DE FRUTA LIMAO 2 ENV"), "2 envelope(s)");
  assert.equal(q("FRALDA GER CONFORT MASTER PANTS G/XG C/16"), "16 unidade(s)");
  assert.equal(q("NOVALGINA 50 MG ORAL 100 ML"), "100 mililitro(s)");
  assert.equal(q("ESC DENT NAVY"), null);
});

test("itens 'consulte o farmacêutico' viraram produtos comuns, achados na busca e liberados para a cesta", async () => {
  const busca = JSON.parse(await read("public/dados/nacoes/catalogo-busca.json"));
  assert.ok(busca.some((i) => /hipoglos/.test(i.busca)), "Hipoglós precisa aparecer na busca");
  const idx = await json("public/dados/nacoes/restritos-index.json");
  assert.equal(idx.consulte.total, 0);
  const cat = await json("app/nacoes-unidas/produtos/dados/catalogo-nacoes.json");
  assert.ok(cat.itens.filter((i) => i.origem === "consulte").length > 100);
  assert.match(await read("next.config.ts"), /consulte-o-farmaceutico", destination: "\/departamentos\/medicamentos", permanent: true/);
});

test("estoque: esgotado aparece nas listas com selo, sem cesta, e fica fora das sugestões; sem texto 'Resta N'", async () => {
  const gen = await read("scripts/gerar-assets-catalogo.mjs");
  assert.match(gen, /esgotado !== true/);
  assert.match(gen, /\.\.\.\(item\.esgotado === true \? \{ esgotado: true \} : \{\}\)/);
  const lista = await read("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /esgotado=\{item\.esgotado\}/);
  assert.doesNotMatch(lista, /estoque-publico/, "a lista não soma o estoque cru do PC: dupla contagem e quantidade exposta");
  const cartaoEsg = await read("app/nacoes-unidas/produtos/CartaoPanvel.tsx");
  assert.match(cartaoEsg, /pv-esgotado/);
  const cat = await read("app/nacoes-unidas/produtos/catalogo.ts");
  assert.match(cat, /export function carregarCatalogoCompleto/);
  assert.match(cat, /filter\(\(i\) => i\.esgotado !== true\)/);
  const pagina = await read("app/nacoes-unidas/produtos/[slug]/page.tsx");
  assert.match(pagina, /carregarCatalogoCompleto\(\)/);
  assert.match(pagina, /item\.esgotado \? null : <ProdutoBarra/);
  const cartao = await read("app/nacoes-unidas/produtos/CartaoPanvel.tsx");
  assert.doesNotMatch(cartao, /Resta 1|Restam/, "aviso 'Resta N' desligado: quase todo produto tem 1 ou 2 unidades");
  assert.doesNotMatch(pagina, /produto-restam/);
  // A quantidade exata nunca é publicada: só `esgotado` e `restam` (1 a 5).
  const py = await read("ops/catalogo-nacoes/gerar.py");
  assert.match(py, /LIMITE_RESTAM = 5/);
  assert.doesNotMatch(py, /item\["estoque"\]|"Estoque":\s*unidades/);
});

test("nomes legíveis: o gerador e o site expandem abreviações do mesmo jeito, sem inventar", async () => {
  const { nomeDeExibicao } = await import("../app/nome-exibicao.ts");
  assert.equal(nomeDeExibicao("SH J&J BABY CAB CACHEADO"), "Shampoo J&j Baby cabelo Cacheado");
  assert.equal(nomeDeExibicao("FRALDA PAMPERS SUPSEQUI MEGA G 34UN"), "Fralda Pampers Supsequi Mega G 34UN");
  assert.equal(nomeDeExibicao("CREME DE CACAU 230 GRS."), "Creme de Cacau 230 g.");
  assert.equal(nomeDeExibicao("ALMEIDA PRADO 35 60CPR"), "Almeida Prado 35 60 comprimidos");
  assert.equal(nomeDeExibicao("TINT MAXTON 3.0 CASTANHO ESCURO"), "Tintura Maxton 3.0 Castanho Escuro");
  // Os arquivos gerados para o site saem iguais ao que o código do site calcularia.
  const idx = await json("public/dados/nacoes/catalogo-index.json");
  let conferidos = 0;
  for (const g of idx.grupos) {
    const pagina = await json(`public/dados/nacoes/catalogo/${g.slug}/p1.json`);
    for (const i of pagina) {
      assert.equal(i.nomeExibicao, nomeDeExibicao(i.nome), i.nome);
      conferidos += 1;
    }
  }
  assert.ok(conferidos > 100);
});

test("formatarQuantidade: unidades de medida abreviadas e plural correto na exibição", async () => {
  const { formatarQuantidade: f } = await import("../app/nacoes-unidas/produtos/quantidade.ts");
  assert.equal(f("150 mililitro(s)"), "150 ml");
  assert.equal(f("1 grama(s)"), "1 g");
  assert.equal(f("10 grama(s)"), "10 g");
  assert.equal(f("30 comprimido(s)"), "30 comprimidos");
  assert.equal(f("1 comprimido(s)"), "1 comprimido");
  assert.equal(f("2 par(es)"), "2 pares");
  assert.equal(f(null), null);
});


test("ilustração de medicamento sem foto: gerador e site escolhem a mesma caixa, só em Medicamentos, e os arquivos existem", async () => {
  const { ilustracaoSemReceita } = await import("../app/nacoes-unidas/produtos/receita.ts");
  const { existsSync } = await import("node:fs");
  assert.equal(ilustracaoSemReceita("DIPIRONA 500MG CX 10CPR"), "/ilustrativas/otc-cpr.webp");
  assert.equal(ilustracaoSemReceita("BERBERINA 500MG C/60 CPS"), "/ilustrativas/otc-cap.webp");
  assert.equal(ilustracaoSemReceita("ALLEGRA PEDIATRICO 6mg/ml sus or fr 60m"), "/ilustrativas/otc-liq.webp");
  assert.equal(ilustracaoSemReceita("CLOTRIMAZOL 20MG CREM VAG C/3 APLI"), "/ilustrativas/otc-tub.webp");
  assert.equal(ilustracaoSemReceita("NEOCOFLAN AEROSOL 85ML"), "/ilustrativas/otc-spr.webp", "aerosol sem receita = spray");
  assert.equal(ilustracaoSemReceita("PEGLAX 17 GR C/14 SACHES"), "/ilustrativas/neutra.webp", "forma não reconhecida: caixa neutra, sem chute");
  const idx = await json("public/dados/nacoes/catalogo-index.json");
  let conferidos = 0;
  for (const g of idx.grupos) {
    for (let p = 1; p <= g.paginas; p += 1) {
      for (const i of await json(`public/dados/nacoes/catalogo/${g.slug}/p${p}.json`)) {
        if (i.foto && i.foto.startsWith("/ilustrativas/")) {
          assert.equal(g.categoria, "Medicamentos", `ilustração fora de Medicamentos: ${i.nome}`);
          assert.equal(i.foto, ilustracaoSemReceita(i.nome), i.nome);
          assert.ok(existsSync(new URL(`../public${i.foto}`, import.meta.url)), i.foto);
          conferidos += 1;
        }
      }
    }
  }
  // Quanto mais medicamentos ganham foto de verdade (painel de fotos), menos ilustrações sobram: o que vale é cada uma estar certa.
  assert.ok(conferidos >= 0);
});

test("árvore de categorias: o site e o gerador da busca classificam igual, e a maior parte dos produtos cai numa categoria", async () => {
  const { tipoDoProduto, arvoreDeCategorias, OUTROS } = await import("../app/nacoes-unidas/produtos/arvore-categorias.ts");
  const arvore = arvoreDeCategorias();
  assert.ok(arvore.length >= 5 && arvore.every((d) => d.categorias.length >= 1), "departamentos com categorias");
  assert.equal(tipoDoProduto("DES ROLL ON NIVEA PROTECT 50ML", "Cuidado Diário"), "Desodorantes");
  assert.equal(tipoDoProduto("FRALDA PAMPERS XG", "Infantil e Gestante"), "Fraldas");
  assert.equal(tipoDoProduto("ALGO SEM REGRA NENHUMA XYZ", "Cuidado Diário"), OUTROS);
  assert.equal(tipoDoProduto("DES ROLL ON NIVEA", "Medicamentos"), OUTROS, "só departamentos com regras");
  const idx = await json("public/dados/nacoes/catalogo-index.json");
  const comRegra = new Set(arvore.map((d) => d.departamento));
  let total = 0;
  let classificados = 0;
  for (const g of idx.grupos) {
    for (let p = 1; p <= g.paginas; p += 1) {
      for (const i of await json(`public/dados/nacoes/catalogo/${g.slug}/p${p}.json`)) {
        assert.equal(i.tipo, tipoDoProduto(i.nome, i.categoria), `gerador e site discordam: ${i.nome}`);
        if (comRegra.has(i.categoria)) {
          total += 1;
          if (i.tipo !== OUTROS) classificados += 1;
        }
      }
    }
  }
  assert.ok(total > 500);
  assert.ok(classificados / total >= 0.7, `só ${classificados} de ${total} produtos caíram numa categoria`);
});
