import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mod = () => import("../app/nacoes-unidas/produtos/catalogo.ts");
const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");

const fakeFetch = (payload, ok = true) => async () => ({ ok, json: async () => payload });

test("catálogo Nações: descarta itens inválidos e nunca expõe estoque", async () => {
  const { fetchCatalogoNacoes } = await mod();
  const data = await fetchCatalogoNacoes(
    fakeFetch({
      loja: "nacoes",
      geradoEm: "2026-10-31T17:56:16",
      itens: [
        { nome: "A", lab: "X", categoria: "Perfumaria e higiene", preco: 10, isMIP: false, estoque: 99 },
        { nome: "", categoria: "Perfumaria e higiene", preco: 10 },
        { nome: "B", categoria: "Perfumaria e higiene", preco: 0 },
      ],
    }),
  );
  assert.equal(data.itens.length, 1);
  assert.deepEqual(Object.keys(data.itens[0]).sort(), ["categoria", "isMIP", "lab", "nome", "preco"]);
});

test("catálogo Nações: erro de rede ou resposta ruim vira null", async () => {
  const { fetchCatalogoNacoes } = await mod();
  assert.equal(await fetchCatalogoNacoes(fakeFetch({}, false)), null);
  assert.equal(await fetchCatalogoNacoes(fakeFetch({ foo: 1 })), null);
  assert.equal(await fetchCatalogoNacoes(async () => { throw new Error("x"); }), null);
});

test("catálogo Nações: agrupa na ordem das categorias e ordena por nome", async () => {
  const { groupByCategoria } = await mod();
  const g = groupByCategoria([
    { nome: "Z", lab: "", categoria: "Medicamentos isentos de prescrição", preco: 1, isMIP: true },
    { nome: "b", lab: "", categoria: "Perfumaria e higiene", preco: 1, isMIP: false },
    { nome: "a", lab: "", categoria: "Perfumaria e higiene", preco: 1, isMIP: false },
  ]);
  assert.deepEqual(g.map((x) => x.categoria), ["Perfumaria e higiene", "Medicamentos isentos de prescrição"]);
  assert.deepEqual(g[0].itens.map((i) => i.nome), ["a", "b"]);
});

test("página de produtos da Nações: canonical relativo, noindex, avisos Anvisa e WhatsApp rastreado", async () => {
  const page = await read("app/nacoes-unidas/produtos/page.tsx");
  assert.ok(page.includes("canonical: `/${SLUG}`"));
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /COMPANY\.anvisaWarnings/);
  assert.match(page, /data-track-event="whatsapp_click"/);
  assert.match(page, /buildWhatsAppUrl/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
});

test("fotos Nações: só EANs aprovados, arquivo existe e item sem foto devolve null", async () => {
  const { fotoDoProduto, FOTOS_NACOES } = await import("../app/nacoes-unidas/produtos/imagens.ts");
  const { access } = await import("node:fs/promises");
  for (const ean of Object.values(FOTOS_NACOES)) await access(new URL(`../public/produtos/${ean}.webp`, import.meta.url));
  assert.equal(Object.keys(FOTOS_NACOES).length, 20);
  assert.equal(fotoDoProduto("DES REXONA COTTON DRY 150 ML"), "/produtos/7791293032467.webp");
  assert.equal(fotoDoProduto("  DES REXONA   COTTON DRY 150 ML "), "/produtos/7791293032467.webp");
  assert.equal(fotoDoProduto("PROT LABIAL NIVEA FRUIT"), null);
  assert.equal(fotoDoProduto("DIPIRONA 1G cx 10cpr PRATI DONADUZZI"), null);
});

test("busca do catálogo: ignora acento e caixa, exige todos os termos e esconde grupos vazios", async () => {
  const { filtrarGrupos, contarItens, normalizarBusca } = await import("../app/nacoes-unidas/produtos/busca.ts");
  const grupos = [
    { categoria: "Pele e proteção solar", id: "pele", itens: [{ nome: "PROT SOLAR NIVEA FPS 50", lab: "Nivea", precoFmt: "R$ 10,00", isMIP: false, foto: null }] },
    { categoria: "Medicamentos isentos de prescrição", id: "mip", itens: [{ nome: "DIPIRONA 1G", lab: "Prati", precoFmt: "R$ 5,00", isMIP: true, foto: null }] },
  ];
  assert.equal(normalizarBusca("  Proteção   SOLAR "), "protecao solar");
  assert.equal(filtrarGrupos(grupos, "").length, 2);
  assert.equal(contarItens(filtrarGrupos(grupos, "protecao")), 1);
  assert.equal(contarItens(filtrarGrupos(grupos, "nivea solar")), 1);
  assert.equal(filtrarGrupos(grupos, "dipirona nivea").length, 0);
  assert.equal(filtrarGrupos(grupos, "isentos").length, 1);
});

test("página de produtos usa a busca local com aviso de lista vazia levando ao WhatsApp", async () => {
  const [page, lista] = await Promise.all([read("app/nacoes-unidas/produtos/page.tsx"), read("app/nacoes-unidas/produtos/CatalogoLista.tsx")]);
  assert.match(page, /<CatalogoLista/);
  assert.match(lista, /role="search"/);
  assert.match(lista, /aria-live="polite"/);
  assert.match(lista, /data-track-event="whatsapp_click"/);
});

test("ação por item: mensagem pede confirmação do dia, tem nome e preço, e o clique é rastreado sem expor o produto", async () => {
  const { mensagemItem } = await import("../app/nacoes-unidas/produtos/busca.ts");
  const msg = mensagemItem("  PROT SOLAR   NIVEA FPS 50 ", "R$ 54,90");
  assert.match(msg, /"PROT SOLAR NIVEA FPS 50" \(R\$ 54,90\)/);
  assert.match(msg, /confirmar preço e disponibilidade/);
  assert.doesNotMatch(msg, /em estoque|garantid/i);
  const lista = await read("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /data-track-source="produtos_nacoes_item"/);
  assert.doesNotMatch(lista, /data-track-(product|nome|name|item)\b/);
  assert.match(lista, /className="catalogo-acao"/);
});

test("analytics da busca: sem o texto digitado, ignora termo curto e separa busca vazia", async () => {
  const { eventoBusca } = await import("../app/nacoes-unidas/produtos/busca.ts");
  assert.equal(eventoBusca("a", 3), null);
  assert.equal(eventoBusca("  ", 3), null);
  const ok = eventoBusca("Dipirona", 2);
  assert.equal(ok.event, "catalog_search");
  assert.deepEqual(ok.params, { source: "produtos_nacoes", unit: "nacoes", term_length: 8, results: 2 });
  assert.equal(eventoBusca("xyz", 0).event, "empty_search");
  for (const e of [ok, eventoBusca("remédio para x", 0)]) assert.ok(!JSON.stringify(e).match(/dipirona|rem[eé]dio/i));
});

test("página de produto: slug, volume, textos só quando existem e Product sem estoque", async () => {
  const { slugify, acharPorSlug } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const { conteudoDoNome, textosPublicaveis, jsonLdProduto, FAQ_PRODUTO, NOTA_PRECO, AVISO_MIP } = await import("../app/nacoes-unidas/produtos/produto.ts");
  const itens = [
    { nome: "LOCAO NIVEA SOFT MILK 200ML", lab: "Nivea", categoria: "Pele e proteção solar", preco: 19.9, isMIP: false },
    { nome: "DIPIRONA 1G cx 10cpr", lab: "Prati", categoria: "Medicamentos isentos de prescrição", preco: 5, isMIP: true },
  ];
  assert.equal(slugify(itens[0].nome), "locao-nivea-soft-milk-200ml");
  assert.equal(acharPorSlug(itens, "locao-nivea-soft-milk-200ml")?.nome, itens[0].nome);
  assert.equal(acharPorSlug(itens, "nao-existe"), null);
  assert.equal(conteudoDoNome("LOCAO NIVEA SOFT MILK 200ML"), "200 ml");
  assert.equal(conteudoDoNome("CR NIVEA 56 GR LATA"), "56 g");
  assert.equal(conteudoDoNome("DES REXONA COTTON DRY 150 ML"), "150 ml");
  assert.equal(conteudoDoNome("MAG FORCE 600MG C/60 CAPS"), "60 cápsulas");
  assert.equal(conteudoDoNome("FIO DENTAL HILLO 100 MTS"), "100 m");
  assert.equal(conteudoDoNome("PROT SOLAR NIVEA FPS 50"), null);
  assert.deepEqual(textosPublicaveis(null), { descricao: null, paraQueServe: null, destaques: null });
  assert.equal(textosPublicaveis({ paraQueServe: "  texto do rótulo  ", destaques: " " }).paraQueServe, "texto do rótulo");
  assert.equal(textosPublicaveis({ paraQueServe: "  texto do rótulo  ", destaques: " " }).destaques, null);
  const ld = jsonLdProduto({ nome: itens[0].nome, lab: "Nivea", categoria: itens[0].categoria, url: "https://exemplo/p", image: null });
  assert.equal(ld["@type"], "Product");
  const cru = JSON.stringify(ld);
  assert.doesNotMatch(cru, /aggregateRating|availability|InStock|OutOfStock|"offers"/);
  assert.deepEqual(FAQ_PRODUTO.map((item) => item.q), ["Preciso pagar agora?", "Posso retirar ou receber em casa?", "Quem confirma preço e estoque?"]);
  assert.match(NOTA_PRECO, /A loja confirma preço e estoque pelo WhatsApp/);
  assert.match(AVISO_MIP, /Medicamento isento de prescrição/);
});

test("página de produto: estrutura, noindex, sem texto de saúde inventado e barra de reserva", async () => {
  const read = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const [pagina, barra, css, lista, sacola] = await Promise.all([
    read("app/nacoes-unidas/produtos/[slug]/page.tsx"),
    read("app/nacoes-unidas/produtos/ProdutoBarra.tsx"),
    read("app/nacoes-unidas/produtos/produtos.css"),
    read("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    read("app/reserva/ReservaSacola.tsx"),
  ]);
  assert.match(pagina, /robots: \{ index: false, follow: false \}/);
  assert.match(pagina, /acharPorSlug/);
  assert.match(pagina, /slugify\(item\.nome\)/);
  assert.match(pagina, />União Farma</);
  assert.match(pagina, /Sem receita/);
  assert.match(pagina, /IconSelo/);
  assert.match(pagina, /<strong>Marca:<\/strong>/);
  assert.match(pagina, /NOTA_PRECO/);
  assert.match(pagina, /textos\.paraQueServe \?/);
  assert.match(pagina, /textos\.destaques \?/);
  assert.match(pagina, /Para que serve/);
  assert.match(pagina, /Destaques do rótulo/);
  assert.match(pagina, /Ficha técnica/);
  assert.match(pagina, /Conteúdo\/volume/);
  assert.match(pagina, /Perguntas frequentes/);
  assert.match(pagina, /AVISO_MIP/);
  assert.match(pagina, /jsonLdProduto/);
  assert.match(pagina, /width="300"/);
  assert.doesNotMatch(pagina, /ácido hialurônico|pele seca|aggregateRating|availability/);
  assert.match(barra, /Adicionar à reserva/);
  assert.match(barra, /Ver reserva/);
  assert.match(barra, /atualizarReserva/);
  assert.match(barra, /adicionar\(/);
  assert.match(barra, /abrirReserva/);
  assert.match(barra, /IconLixeira/);
  assert.match(barra, /source: "produto_nacoes"/);
  assert.doesNotMatch(barra, /trackEvent\([^)]*nome/);
  assert.match(sacola, /EVENTO_ABRIR_RESERVA/);
  assert.match(lista, /\/nacoes-unidas\/produtos\/\$\{slugify\(item\.nome\)\}/);
  assert.match(css, /\.produto-barra \{[^}]*height: 86px/);
  assert.match(css, /\.produto-adicionar[\s\S]*height: 54px/);
  assert.match(css, /padding-bottom: 102px !important/);
  assert.match(css, /font-size: 1\.5rem !important/);
  assert.match(css, /\.produto-pagina h2 \{[^}]*font-size: 1\.125rem !important/);
});
