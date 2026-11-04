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
    { nome: "Z", lab: "", categoria: "Bem Estar", preco: 1, isMIP: false },
    { nome: "b", lab: "", categoria: "Medicamentos", preco: 1, isMIP: true },
    { nome: "a", lab: "", categoria: "Medicamentos", preco: 1, isMIP: true },
  ]);
  assert.deepEqual(g.map((x) => x.categoria), ["Medicamentos", "Bem Estar"]);
  assert.deepEqual(g[0].itens.map((i) => i.nome), ["a", "b"]);
});

test("página de produtos da Nações: canonical relativo, noindex, avisos Anvisa e WhatsApp rastreado", async () => {
  const page = await read("app/nacoes-unidas/produtos/page.tsx");
  assert.ok(page.includes("canonical: `/${SLUG}`"));
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  // O aviso da Anvisa fica no rodapé global (SiteFooter), como no protótipo.
  assert.match(await read("app/SiteFooter.tsx"), /COMPANY\.anvisaWarnings\[3\]/);
  // whatsapp tracking moved to client components
  assert.match(page, /buildWhatsAppUrl/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
});

test("fotos Nações: só EANs aprovados, arquivo existe e item sem foto devolve null", async () => {
  const { fotoDoProduto, FOTOS_NACOES } = await import("../app/nacoes-unidas/produtos/imagens.ts");
  const { access } = await import("node:fs/promises");
  for (const ean of Object.values(FOTOS_NACOES)) await access(new URL(`../public/produtos/${ean}.webp`, import.meta.url));
  assert.equal(Object.keys(FOTOS_NACOES).length, 92);
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
  // A busca mora no cabeçalho (como no protótipo); a lista lê ?q e, sem resultado, leva ao WhatsApp.
  const header = await read("app/shop/ShopHeader.tsx");
  assert.match(header, /role="search"/);
  assert.match(header, /action="\/nacoes-unidas\/produtos"/);
  assert.match(page, /consultaInicial=\{consultaInicial\}/);
  assert.match(lista, /data-track-event="whatsapp_click"/);
});

test("ação por item: mensagem pede confirmação do dia, tem nome e preço, e o clique é rastreado sem expor o produto", async () => {
  const { mensagemItem } = await import("../app/nacoes-unidas/produtos/busca.ts");
  const msg = mensagemItem("  PROT SOLAR   NIVEA FPS 50 ", "R$ 54,90");
  assert.match(msg, /"PROT SOLAR NIVEA FPS 50" \(R\$ 54,90\)/);
  assert.match(msg, /confirmar preço e disponibilidade/);
  assert.doesNotMatch(msg, /em estoque|garantid/i);
  const lista = await read("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  // Layout de loja: sem botão do WhatsApp em cada item; um único "Perguntar à loja", rastreado e sem expor produto.
  assert.match(lista, /data-track-source="produtos_nacoes_busca_vazia"/);
  assert.doesNotMatch(lista, /data-track-(product|nome|name|item)\b/);
  assert.doesNotMatch(lista, /Confirmar no WhatsApp/);
  assert.match(lista, /Perguntar à loja pelo WhatsApp/);
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
  assert.match(NOTA_PRECO, /A gente confere o preço e o estoque e te responde pelo WhatsApp/);
  assert.match(FAQ_PRODUTO[2].a, /A gente confere o preço e o estoque e te responde pelo WhatsApp/);
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
  assert.doesNotMatch(pagina, /Sem receita|IconSelo/);
  assert.match(pagina, /<strong>Marca:<\/strong>/);
  assert.match(pagina, /NOTA_PRECO/);
  assert.match(pagina, /textos\.paraQueServe \?/);
  assert.match(pagina, /textos\.destaques \?/);
  assert.match(pagina, /Para que serve/);
  assert.match(pagina, /Destaques do rótulo/);
  assert.match(pagina, /Ficha técnica/);
  assert.match(pagina, /rotulo: "Conteúdo"/);
  assert.match(pagina, /Perguntas frequentes/);
  assert.match(pagina, /AVISO_MIP/);
  assert.match(pagina, /jsonLdProduto/);
  assert.match(pagina, /width="300"/);
  assert.doesNotMatch(pagina, /ácido hialurônico|pele seca|aggregateRating|availability/);
  assert.match(barra, /Adicionar à cesta/);
  assert.match(barra, /Ver cesta/);
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

test("catálogo: ordena por preço, filtra categoria/marca/faixa e combina com o texto", async () => {
  const { aplicarCatalogo, faixaDoPreco, contarFiltrosAtivos, contarItens, sugerirProdutos, identificarItens, BUSCAS_POPULARES, FAIXAS_PRECO } =
    await import("../app/nacoes-unidas/produtos/busca.ts");
  const grupos = [
    {
      categoria: "Pele e proteção solar",
      id: "pele",
      itens: [
        { nome: "PROT SOLAR NIVEA FPS 50", lab: "Nivea", preco: 30, precoFmt: "R$ 30,00", isMIP: false, foto: "/a.webp" },
        { nome: "HIDRATANTE B", lab: "Nivea", preco: 10, precoFmt: "R$ 10,00", isMIP: false, foto: null },
        { nome: "HIDRATANTE A", lab: "Nivea", preco: 10, precoFmt: "R$ 10,00", isMIP: false, foto: null },
      ],
    },
    {
      categoria: "Higiene",
      id: "higiene",
      itens: [
        { nome: "LISTERINE COOL MINT", lab: "Listerine", preco: 18, precoFmt: "R$ 18,00", isMIP: false, foto: null },
        { nome: "SABONETE", lab: "Dove", preco: 8, precoFmt: "R$ 8,00", isMIP: false, foto: null },
        { nome: "LIMITE QUINZE", lab: "Dove", preco: 15, precoFmt: "R$ 15,00", isMIP: false, foto: null },
        { nome: "LIMITE VINTE E CINCO", lab: "Dove", preco: 25, precoFmt: "R$ 25,00", isMIP: false, foto: null },
      ],
    },
  ];

  assert.deepEqual(BUSCAS_POPULARES, ["nivea", "listerine", "protetor solar"]);
  assert.deepEqual(FAIXAS_PRECO.map((faixa) => faixa.label), ["Até R$ 15", "R$ 15 a 25", "Acima de R$ 25"]);
  assert.equal(faixaDoPreco(15), "ate_15");
  assert.equal(faixaDoPreco(15.01), "de_15_a_25");
  assert.equal(faixaDoPreco(25), "de_15_a_25");
  assert.equal(faixaDoPreco(25.01), "acima_25");

  const recomendados = aplicarCatalogo(grupos, { ordem: "recomendados" });
  assert.deepEqual(recomendados[0].itens.map((item) => item.nome), ["PROT SOLAR NIVEA FPS 50", "HIDRATANTE B", "HIDRATANTE A"]);

  const menor = aplicarCatalogo(grupos, { ordem: "menor_preco" }).flatMap((grupo) => grupo.itens);
  assert.deepEqual(menor.map((item) => item.preco), [8, 10, 10, 15, 18, 25, 30]);
  assert.deepEqual(
    menor.filter((item) => item.preco === 10).map((item) => item.nome),
    ["HIDRATANTE A", "HIDRATANTE B"],
  );
  assert.deepEqual(aplicarCatalogo(grupos, { ordem: "maior_preco" }).flatMap((grupo) => grupo.itens).map((item) => item.preco), [30, 25, 18, 15, 10, 10, 8]);

  assert.deepEqual(aplicarCatalogo(grupos, { categorias: ["Higiene"] }).map((grupo) => grupo.categoria), ["Higiene"]);
  assert.ok(aplicarCatalogo(grupos, { marcas: ["nivea"] }).flatMap((grupo) => grupo.itens).every((item) => item.lab === "Nivea"));
  assert.deepEqual(
    aplicarCatalogo(grupos, { faixas: ["ate_15"] }).flatMap((grupo) => grupo.itens).map((item) => item.preco).sort((a, b) => a - b),
    [8, 10, 10, 15],
  );
  assert.equal(contarItens(aplicarCatalogo(grupos, { consulta: "nivea", marcas: ["Nivea"], faixas: ["ate_15"] })), 2);
  assert.equal(contarItens(aplicarCatalogo(grupos, { consulta: "listerine", categorias: ["Pele e proteção solar"] })), 0);
  assert.equal(contarFiltrosAtivos({ categorias: ["Higiene"], marcas: [], faixas: ["ate_15", "acima_25"] }), 3);

  const semNumero = aplicarCatalogo(
    [{ categoria: "Higiene", id: "higiene", itens: [{ nome: "BARATO", lab: "Dove", precoFmt: "R$ 1.234,50", isMIP: false, foto: null }] }],
    { ordem: "menor_preco", faixas: ["acima_25"] },
  );
  assert.equal(semNumero[0].itens[0].nome, "BARATO");

  assert.equal(sugerirProdutos(grupos, "n").length, 0);
  assert.deepEqual(sugerirProdutos(grupos, "nivea").map((item) => item.nome), ["PROT SOLAR NIVEA FPS 50", "HIDRATANTE B", "HIDRATANTE A"]);
  const ids = identificarItens([{ ...grupos[0], itens: [grupos[0].itens[0], { ...grupos[0].itens[0] }] }]);
  assert.equal(ids[0].itens[0].id, "prot-solar-nivea-fps-50");
  assert.equal(ids[0].itens[1].id, "prot-solar-nivea-fps-50-2");
});

test("analytics do filtro: só contagens, sem texto, categoria ou marca", async () => {
  const { eventoFiltro, eventoBusca } = await import("../app/nacoes-unidas/produtos/busca.ts");
  assert.equal(eventoFiltro({ categorias: [], marcas: [], faixas: [] }, 4), null);
  const evento = eventoFiltro({ categorias: ["Medicamentos isentos de prescrição"], marcas: ["Nivea"], faixas: ["ate_15"] }, 2);
  assert.equal(evento.event, "catalog_filter");
  assert.deepEqual(evento.params, { source: "produtos_nacoes", unit: "nacoes", categories: 1, brands: 1, ranges: 1, results: 2 });
  assert.equal(eventoBusca("dipirona", 1).event, "catalog_search");
  assert.doesNotMatch(JSON.stringify(evento), /nivea|dipirona|medicamento|ate_15/i);
});

test("busca da Nações: sugestões, filtro e ordenação no componente, lista completa no primeiro render", async () => {
  const [lista, css, pagina, busca] = await Promise.all([
    read("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    read("app/nacoes-unidas/produtos/produtos.css"),
    read("app/nacoes-unidas/produtos/page.tsx"),
    read("app/nacoes-unidas/produtos/busca.ts"),
  ]);
  // preco now precomputed in assets
  assert.match(lista, /const \[consulta, setConsulta\] = useState\(consultaInicial\);/);
  const header = await read("app/shop/ShopHeader.tsx");
  assert.match(header, /BUSCAS_POPULARES/);
  assert.match(header, /Buscas populares/);
  assert.match(header, /1º/);
  assert.match(header, /Não encontramos “/);
  assert.doesNotMatch(header, /trackEvent\(/);
  assert.match(lista, /Não encontramos “/);
  assert.match(lista, /Confira a digitação, use termos mais amplos ou navegue pelas categorias\./);
  assert.match(lista, /Perguntar à loja pelo WhatsApp/);
  assert.match(lista, /aria-pressed=\{ordem === opcao\.id\}/);
  assert.match(busca, /label: "Recomendados"/);
  assert.match(busca, /label: "Menor preço"/);
  assert.match(busca, /label: "Maior preço"/);
  assert.match(busca, /BUSCAS_POPULARES = \["nivea", "listerine", "protetor solar"\]/);
  assert.match(lista, /aria-modal="true"/);
  assert.match(lista, /eventoFiltro/);
  assert.match(lista, /data-track-source="produtos_nacoes_busca_vazia"/);
  assert.doesNotMatch(lista, /trackEvent\([^)]*(consulta|nome|lab)/);
  // O alvo de toque de 48px é a linha toda (label); a caixa visível é de 22px.
  assert.match(css, /\.catalogo-filtro-opcao \{[^}]*min-height: 48px;/);
  assert.match(css, /\.catalogo-filtro-opcao input \{[^}]*width: 22px;/);
  assert.match(css, /\.catalogo-filtro-rodape \{[^}]*height: 68px;/);
  assert.match(css, /min-height: 44px/);
});


test("busca: aceita plural, acento e várias palavras", async () => {
  const { filtrarGrupos, contarItens, termosDeBusca } = await import("../app/nacoes-unidas/produtos/busca.ts");
  assert.deepEqual(termosDeBusca("Fraldas"), ["fralda"]);
  assert.deepEqual(termosDeBusca("protetores"), ["protetor"]);
  const grupos = [{ categoria: "Infantil e Gestante", id: "i", itens: [
    { nome: "Fralda Pampers Mega G", lab: "", isMIP: false, precoFmt: "R$ 10,00", preco: 10, foto: null },
    { nome: "Lenço umedecido", lab: "", isMIP: false, precoFmt: "R$ 5,00", preco: 5, foto: null },
  ] }];
  assert.equal(contarItens(filtrarGrupos(grupos, "fraldas")), 1);
  assert.equal(contarItens(filtrarGrupos(grupos, "FRALDA pampers")), 1);
  assert.equal(contarItens(filtrarGrupos(grupos, "lenco")), 1);
  assert.equal(contarItens(filtrarGrupos(grupos, "xyz")), 0);
});
