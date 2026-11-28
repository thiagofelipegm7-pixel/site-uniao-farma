import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const lib = () => import("../app/variacoes-produto.ts");

/** Banco de mentira com a mesma interface do D1 usada pelo código (SQLite em memória). */
function bancoDeTeste() {
  const sql = new DatabaseSync(":memory:");
  const stmt = (texto) => ({
    bind: (...valores) => ({
      all: async () => ({ results: sql.prepare(texto).all(...valores) }),
      run: async () => { sql.prepare(texto).run(...valores); return {}; },
      _rodar: () => sql.prepare(texto).run(...valores),
    }),
  });
  return {
    exec: async (texto) => { sql.exec(texto); },
    prepare: stmt,
    batch: async (lista) => {
      sql.exec("BEGIN");
      try { for (const s of lista) s._rodar(); sql.exec("COMMIT"); } catch (e) { sql.exec("ROLLBACK"); throw e; }
    },
  };
}

const E = (n) => `789000000000${n}`.slice(-13); // EAN de teste com 13 dígitos
const itens = (...pares) => pares.map(([n, rotulo]) => ({ ean: E(n), rotulo }));

test("variações: salva o grupo, cada produto enxerga o grupo todo na ordem escolhida", async () => {
  const { salvarGrupo, grupoDoProduto } = await lib();
  const db = bancoDeTeste();
  const r = await salvarGrupo(db, E(1), "Tamanho", itens([1, "G"], [2, "XXXG"], [3, "XG"], [4, "M"]));
  assert.equal(r.ok, true);
  for (const n of [1, 2, 3, 4]) {
    const g = await grupoDoProduto(db, E(n));
    assert.equal(g.eixo, "Tamanho");
    assert.deepEqual(g.itens.map((i) => i.rotulo), ["G", "XXXG", "XG", "M"]);
  }
  assert.equal(await grupoDoProduto(db, E(9)), null, "produto fora do grupo não tem variações");
  // Sem nenhum grupo salvo (tabela ainda não existe), a leitura devolve null e não quebra a página.
  assert.equal(await grupoDoProduto(bancoDeTeste(), E(1)), null);
  assert.equal(await grupoDoProduto(db, "abc"), null);
});

test("variações: regras de validação (2 a 12 produtos, nome da opção, sem repetição)", async () => {
  const { salvarGrupo, grupoDoProduto } = await lib();
  const db = bancoDeTeste();
  const erro = async (...args) => (await salvarGrupo(db, ...args)).erro;
  assert.equal(await erro(E(1), "Tamanho", itens([1, "G"])), "variacoes_invalidas", "um produto só não é grupo");
  assert.equal(await erro(E(1), "Tamanho", Array.from({ length: 13 }, (_, i) => ({ ean: E(i + 1), rotulo: `T${i}` }))), "variacoes_invalidas");
  assert.equal(await erro(E(1), "Tamanho", "texto"), "variacoes_invalidas");
  assert.equal(await erro(E(1), "Tamanho", itens([1, "G"], [2, ""])), "rotulo_invalido");
  assert.equal(await erro(E(1), "Tamanho", itens([1, "G"], [2, "a".repeat(25)])), "rotulo_invalido");
  assert.equal(await erro(E(1), "Tamanho", itens([1, "G"], [2, "g"])), "rotulo_repetido", "G e g são a mesma opção");
  assert.equal(await erro(E(1), "Tamanho", itens([1, "G"], [1, "M"])), "produto_repetido");
  assert.equal(await erro(E(1), "Tamanho", itens([2, "G"], [3, "M"])), "produto_fora_do_grupo");
  assert.equal(await erro(E(1), "Tamanho", [{ ean: "12", rotulo: "G" }, { ean: E(2), rotulo: "M" }]), "ean_invalido");
  assert.equal(await erro(E(1), "x".repeat(25), itens([1, "G"], [2, "M"])), "eixo_invalido");
  assert.equal(await erro("abc", "Tamanho", itens([1, "G"], [2, "M"])), "ean_invalido");
  assert.equal(await grupoDoProduto(db, E(1)), null, "nada foi gravado por pedido inválido");
  // Tipo vazio vira "Tamanho"; espaços sobrando são limpos.
  const ok = await salvarGrupo(db, E(1), "   ", [{ ean: E(1), rotulo: "  Azul   claro " }, { ean: E(2), rotulo: "Rosa" }]);
  assert.equal(ok.ok, true);
  assert.equal(ok.grupo.eixo, "Tamanho");
  assert.equal(ok.grupo.itens[0].rotulo, "Azul claro");
});

test("variações: editar mantém o grupo e tira quem saiu; um produto só fica em um grupo", async () => {
  const { salvarGrupo, grupoDoProduto, removerGrupo } = await lib();
  const db = bancoDeTeste();
  const a = await salvarGrupo(db, E(1), "Cor", itens([1, "Azul"], [2, "Rosa"], [3, "Verde"]));
  const idA = a.grupo.grupo;
  // Tira o verde e reordena: o grupo é o mesmo.
  const b = await salvarGrupo(db, E(1), "Cor", itens([2, "Rosa"], [1, "Azul"]));
  assert.equal(b.grupo.grupo, idA);
  assert.equal(await grupoDoProduto(db, E(3)), null, "quem saiu do grupo fica sem variações");
  assert.deepEqual((await grupoDoProduto(db, E(1))).itens.map((i) => i.rotulo), ["Rosa", "Azul"]);
  // Abrir o produto 5 (sem grupo) e puxar o produto 2 para um grupo novo: o 2 sai do grupo antigo,
  // que fica com 1 produto só e é desfeito.
  const c = await salvarGrupo(db, E(5), "Tamanho", itens([5, "M"], [2, "P"]));
  assert.notEqual(c.grupo.grupo, idA);
  assert.equal(await grupoDoProduto(db, E(1)), null, "grupo com menos de 2 produtos some");
  assert.deepEqual((await grupoDoProduto(db, E(2))).itens.map((i) => i.rotulo), ["M", "P"]);
  // Desativar apaga o grupo inteiro.
  assert.equal((await removerGrupo(db, E(2))).ok, true);
  assert.equal(await grupoDoProduto(db, E(2)), null);
  assert.equal(await grupoDoProduto(db, E(5)), null);
});

test("variações: o resolvedor liga cada opção ao produto do catálogo e ignora o que saiu do catálogo", async () => {
  const { resolverGrupo } = await import("../app/variacoes-resolver.ts");
  const catalogo = [
    { nome: "FRALDA TESTE G 60UND", preco: 89.9, ean: E(1) },
    { nome: "FRALDA TESTE M 60UND", preco: 84.5, ean: E(2), esgotado: true },
  ];
  const r = resolverGrupo({ grupo: "g", eixo: "Tamanho", itens: [{ ean: E(1), rotulo: "G" }, { ean: E(2), rotulo: "M" }, { ean: E(3), rotulo: "XG" }] }, catalogo);
  assert.equal(r.eixo, "Tamanho");
  assert.deepEqual(r.fichas.map((f) => [f.rotulo, f.slug, f.precoCentavos, f.esgotado]), [
    ["G", "fralda-teste-g-60und", 8990, false],
    ["M", "fralda-teste-m-60und", 8450, true],
  ]);
});

test("variações no site: seletor no HTML do servidor, acessível, preto e branco e sem tocar no carrinho", async () => {
  const [seletor, pagina, css, layout, api] = await Promise.all([
    ler("app/nacoes-unidas/produtos/SeletorVariacoes.tsx"),
    ler("app/nacoes-unidas/produtos/[slug]/page.tsx"),
    ler("app/variacoes.css"),
    ler("app/layout.tsx"),
    ler("app/api/interno/variacoes/route.ts"),
  ]);
  assert.doesNotMatch(seletor, /"use client"/, "sai pronto no HTML do servidor (S-24)");
  assert.match(seletor, /<nav className="seletor-variacoes" aria-label=/); // landmark com nome (A-12)
  assert.match(seletor, /aria-current=\{aqui \? "page" : undefined\}/);
  assert.match(seletor, /selecionado/); // a escolha também tem nome em texto (A-04)
  assert.match(seletor, /esgotado/i);
  assert.match(seletor, /href=\{`\/nacoes-unidas\/produtos\/\$\{f\.slug\}`\}/);
  assert.doesNotMatch(seletor, /useState|onClick|reserva/); // sem JavaScript no cliente e sem mexer na cesta
  assert.match(pagina, /<SeletorVariacoes eixo=\{variacoes\.eixo\} fichas=\{variacoes\.fichas\} atual=\{codigoAtual\} \/>/);
  assert.match(pagina, /grupoDoProduto\([\s\S]*?\.catch\(\(\): VariacoesResolvidas \| null => null\)/); // falha do banco não derruba a página
  assert.match(pagina, /const \[apresentacoes, variacoes\] = await Promise\.all\(\[/); // as duas leituras do banco rodam juntas (sem atraso extra)
  // A página de produto força texto preto em "li a", "span" e "small": o texto da ficha tem classe própria e o estilo sobe a
  // especificidade com body:has(), senão a ficha escolhida (fundo preto) ficava com texto preto, ilegível (A-01).
  assert.match(seletor, /className="seletor-variacoes-rotulo"/);
  assert.match(seletor, /className="seletor-variacoes-aviso"/);
  assert.match(css, /html body:has\(\.seletor-variacoes\) \.seletor-variacoes \.seletor-variacoes-ficha\.is-atual \{/);
  assert.match(css, /\.seletor-variacoes-rotulo \{\s*color: inherit !important;/);
  assert.match(css, /min-height: 3rem !important/); // alvo de 48 px (A-10)
  assert.match(css, /\.is-atual \{[^}]*background: #000000 !important;[^}]*color: #ffffff !important;/);
  assert.match(css, /outline: 3px solid #000000 !important/); // foco visível (A-08)
  assert.doesNotMatch(css, /border:\s*[1-9]|#[0-9a-f]{3,6}\b(?<!#000000)(?<!#ffffff)(?<!#000)(?<!#fff)/i, "só preto e branco, sem borda");
  assert.ok(layout.indexOf("./base-direcao.css") < layout.indexOf("./variacoes.css"), "entra depois da direção");
  assert.match(api, /produtoPorCodigo/); // só produtos que existem no catálogo entram no grupo
});
