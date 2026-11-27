import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DIAS_JANELA_SEMANA,
  MIN_ITENS,
  carregarPedidosDaSemana,
  chaveDoPedido,
  elegivelMaisPedidosSemana,
  faixaSeSuficiente,
  ordenarPorPedidosDaSemana,
  pareceMedicamento,
} from "../app/nacoes-unidas/produtos/mais-pedidos.ts";
import { LINHAS_CONFIANCA } from "../app/shop/confianca.ts";
import { elegivelParaPares } from "../app/nacoes-unidas/produtos/relacionados.ts";
import { itensCompletaKit, MAX_KIT, MIN_KIT } from "../app/nacoes-unidas/produtos/completa-kit.ts";

const ler = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
const item = (nome, slug, nomeOriginal = nome) => ({ nome, nomeOriginal, slug });

test("faixa da semana: janela de 7 dias, só pedido real, some com menos de 4", async () => {
  assert.equal(DIAS_JANELA_SEMANA, 7);
  assert.equal(MIN_ITENS, 4);
  const consultas = [];
  const db = {
    prepare: (sql) => ({
      bind: (...valores) => ({
        all: async () => {
          consultas.push({ sql, valores });
          return { results: [{ nome: "Shampoo Elseve Colágeno 200ml", n: 3 }, { nome: "Dipirona 500mg", n: 9 }, { nome: null, n: 2 }] };
        },
      }),
    }),
  };
  const pedidos = await carregarPedidosDaSemana(db, "2026-11-26");
  assert.equal(pedidos.get(chaveDoPedido("Shampoo Elseve Colágeno 200ml")), 3);
  assert.equal(consultas.length, 1);
  assert.doesNotMatch(consultas[0].sql, /busca_clique/);
  assert.equal(consultas[0].valores[1], "-7 day");
  assert.doesNotMatch(consultas[0].sql, /telefone|aviso|nome_cliente|lembrete|codigo/i);

  const quebrado = { prepare: () => { throw new Error("sem tabela"); } };
  assert.equal((await carregarPedidosDaSemana(quebrado, "2026-11-26")).size, 0);

  const lista = [
    item("Shampoo Elseve Colágeno 200ml", "elseve"),
    item("Dipirona 500mg 10 comprimidos", "dipirona"),
    item("Absorvente Always Suave", "always", "ABSORVENTE ALWAYS SUAVE COM 16 UNID"),
    item("Sem pedido", "nada"),
  ];
  const mapa = new Map([
    [chaveDoPedido("Shampoo Elseve Colágeno 200ml"), 3],
    [chaveDoPedido("Dipirona 500mg 10 comprimidos"), 9],
    [chaveDoPedido("ABSORVENTE ALWAYS SUAVE COM 16 UNID"), 1],
  ]);
  const vendaveis = lista.filter((i) => elegivelMaisPedidosSemana({ nome: i.nome, nomeOriginal: i.nomeOriginal }));
  assert.deepEqual(vendaveis.map((i) => i.slug), ["elseve", "always", "nada"]);
  const ordenados = ordenarPorPedidosDaSemana(vendaveis, mapa, 12);
  assert.deepEqual(ordenados.map((i) => i.slug), ["elseve", "always"]);
  assert.deepEqual(faixaSeSuficiente(ordenados), []);
  const cheia = ["a", "b", "c", "d"];
  assert.deepEqual(faixaSeSuficiente(cheia), cheia);
});

test("faixa da semana: remédio, MIP, categoria Medicamentos e esgotado ficam de fora", () => {
  assert.equal(elegivelMaisPedidosSemana({ nome: "Shampoo Elseve", categoria: "Cuidado Diário" }), true);
  assert.equal(elegivelMaisPedidosSemana({ nome: "Dipirona 500mg", categoria: "Cuidado Diário" }), false);
  assert.equal(elegivelMaisPedidosSemana({ nome: "Protetor solar", isMIP: true, categoria: "Cuidado Diário" }), false);
  assert.equal(elegivelMaisPedidosSemana({ nome: "Creme X", categoria: "Medicamentos" }), false);
  assert.equal(elegivelMaisPedidosSemana({ nome: "Shampoo Elseve", esgotado: true, categoria: "Cuidado Diário" }), false);
  assert.equal(pareceMedicamento("Amoxicilina 500mg"), true);
});

test("API dos chips usa pedidos da semana, cache curto e some abaixo do mínimo", async () => {
  const rota = await ler("app/shop/destaques-servidor.ts");
  const rotaHttp = await ler("app/api/destaques/route.ts");
  assert.match(rota, /ordem === "pedidos-semana"/);
  assert.match(rota, /carregarPedidosDaSemana/);
  assert.match(rota, /elegivelMaisPedidosSemana/);
  assert.match(rota, /faixaSeSuficiente/);
  assert.match(rotaHttp, /public, max-age=300/);
  const home = await ler("app/HomePage.tsx");
  assert.match(home, /MaisPedidosChips/);
  const chips = await ler("app/shop/MaisPedidosChips.tsx");
  assert.match(chips, /ordem=pedidos-semana/);
  assert.match(chips, /MIN_ITENS/);
});

test("ticks da cesta e faixa do catálogo usam os mesmos três fatos verdadeiros", async () => {
  assert.deepEqual(LINHAS_CONFIANCA.map((l) => l.texto), [
    "Retire grátis na loja",
    "Pague no balcão ou na entrega",
    "Trocas e devoluções",
  ]);
  assert.equal(LINHAS_CONFIANCA[2].href, "/trocas-e-devolucoes");
  const fluxo = await ler("app/reserva/ReservaFluxo.tsx");
  assert.match(fluxo, /LinhasConfianca variante="ticks"/);
  assert.match(fluxo, /fluxo-envio/);
  const catalogo = await ler("app/nacoes-unidas/produtos/page.tsx");
  const depto = await ler("app/departamentos/[slug]/page.tsx");
  assert.match(catalogo, /LinhasConfianca variante="faixa"/);
  assert.match(depto, /LinhasConfianca variante="faixa"/);
  const home = await ler("app/shop/HomeBlocos.tsx");
  const pagamentos = await ler("app/site-config.ts");
  const trocas = await ler("app/trocas-e-devolucoes/page.tsx");
  assert.match(home, /Retire grátis na loja/);
  assert.match(home, /Pague na entrega ou no balcão/);
  assert.match(pagamentos, /PAYMENT_ACCEPTED = "Pix, dinheiro, cartão/);
  assert.match(trocas, /trocas e devoluções/);
});

test("menu do celular tem abas acessíveis e o desktop guarda a lista inteira", async () => {
  const gaveta = await ler("app/shop/DepartamentosGaveta.tsx");
  assert.match(gaveta, /role="tablist"/);
  assert.match(gaveta, /Departamentos/);
  assert.match(gaveta, /Lojas/);
  assert.match(gaveta, /Ofertas/);
  assert.match(gaveta, /ArrowRight/);
  assert.match(gaveta, /"Home"/);
  assert.match(gaveta, /"End"/);
  assert.match(gaveta, /departamentos\/medicamentos/);
  assert.match(gaveta, /departamentos\/beleza/);
  assert.match(gaveta, /href="\/ofertas"/);
  assert.match(gaveta, /PUBLIC_UNITS/);
  const css = await ler("app/shop/shop.css");
  assert.match(css, /@media \(min-width: 992px\)/);
  assert.match(css, /depto-abas/);
  assert.match(css, /depto-item-ofertas-desktop \{ display: list-item/);
});

test("a reserva não perdeu nome, telefone, modo, endereço nem os consentimentos", async () => {
  // Ideia 4 (um campo a menos) não foi feita: não há campo dispensável além dos que a loja precisa.
  const fluxo = await ler("app/reserva/ReservaFluxo.tsx");
  assert.match(fluxo, /Seu nome/);
  assert.match(fluxo, /Bairro/);
  assert.match(fluxo, /Rua e número/);
  assert.match(fluxo, /Retirar na loja/);
  assert.match(fluxo, /Entrega no seu bairro/);
  assert.match(fluxo, /Forma de pagamento/);
  assert.match(fluxo, /TEXTO_CONSENTIMENTO/);
  assert.match(fluxo, /TEXTO_CONSENTIMENTO_CESTA/);
  assert.match(fluxo, /TEXTO_CONSENTIMENTO_AVALIACAO/);
  assert.match(fluxo, /Seu WhatsApp com DDD/);
});

test("complete o kit: 2 ou 3 itens, nunca remédio, some em medicamento ou esgotado", async () => {
  assert.equal(MIN_KIT, 2);
  assert.equal(MAX_KIT, 3);
  const { carregarCatalogoNacoes } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const itens = carregarCatalogoNacoes().itens;
  const origem = itens.find((i) => !i.esgotado && elegivelParaPares(i));
  assert.ok(origem, "o catálogo precisa ter um item de higiene ou beleza para este teste");
  const kit = itensCompletaKit(itens, origem);
  assert.ok(kit.length >= MIN_KIT && kit.length <= MAX_KIT, `kit inesperado: ${kit.length}`);
  assert.ok(kit.every((i) => elegivelParaPares(i) && i.nome !== origem.nome));
  assert.ok(!kit.some((i) => i.isMIP || i.categoria === "Medicamentos"));
  const remédio = itens.find((i) => i.categoria === "Medicamentos" || i.isMIP) ?? { nome: "Dipirona 500mg 10 comprimidos", lab: "GEN", categoria: "Medicamentos", preco: 10, isMIP: true };
  assert.deepEqual(itensCompletaKit(itens, remédio), []);
  assert.deepEqual(itensCompletaKit(itens, { ...origem, esgotado: true }), []);
});

test("a tira do kit entra no cartão de compra e não usa preço riscado", async () => {
  const pagina = await ler("app/nacoes-unidas/produtos/[slug]/page.tsx");
  const tira = await ler("app/nacoes-unidas/produtos/CompletaKit.tsx");
  assert.match(pagina, /CompletaKit itens=\{completaKit\}/);
  assert.match(tira, /Complete o kit/);
  assert.match(tira, /formatBRL\(alvo\.preco\)/);
  assert.doesNotMatch(tira, /precoAnterior|deCentavos|<s>|<\/s>|<del>|riscado/);
});
