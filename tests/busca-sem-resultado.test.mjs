import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const B = await import("../app/busca-sem-resultado.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("registro de busca: guarda só texto comum normalizado; descarta saúde sensível, dado pessoal e endereço", () => {
  assert.equal(B.termoParaRegistro("  Shampoo ANTICASPA!! "), "shampoo anticaspa");
  assert.equal(B.termoParaRegistro("Lâmina de Barbear"), "lamina de barbear");
  for (const ruim of ["pilula do dia seguinte", "teste de gravidez", "hiv", "antidepressivo depressao", "fulano@gmail.com", "https://x.com", "11999998888", "meu cpf 12345678901", "ab", "x".repeat(70), "a b c d e f g", "12345"]) {
    assert.equal(B.termoParaRegistro(ruim), null, ruim);
  }
  assert.equal(B.termoParaRegistro(42), null);
  assert.equal(B.resultadoValido("vazia"), "vazia");
  assert.equal(B.resultadoValido("parcial"), "parcial");
  assert.equal(B.resultadoValido("qualquer"), null);
});

test("registro de busca: conta por dia e resultado e lista primeiro o que ficou vazio", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async run() { if (sql.startsWith("INSERT")) { const k = v.slice(0, 3).join("|"); linhas.set(k, (linhas.get(k) ?? 0) + 1); } },
        async all() {
          const por = new Map();
          for (const [k, n] of linhas) { const [termo, dia, r] = k.split("|"); const x = por.get(termo) ?? { termo, total: 0, vazia: 0, ultimo: dia }; x.total += n; if (r === "vazia") x.vazia += n; por.set(termo, x); }
          return { results: [...por.values()].sort((a, b) => b.vazia - a.vazia || b.total - a.total) };
        },
      }) };
    },
  };
  await B.registrarBusca(db, "rimel", "vazia", "2026-11-14", false);
  await B.registrarBusca(db, "rimel", "vazia", "2026-11-14", false);
  await B.registrarBusca(db, "fraldinha", "corrigida", "2026-11-14", false);
  const t = await B.topBuscas(db, "2026-11-14");
  assert.equal(t[0].termo, "rimel");
  assert.equal(t[0].vazia, 2);
  assert.equal(t[1].vazia, 0);
});

test("rota pública é anônima e a lista é só da equipe; busca manda o termo ao WhatsApp e o site avisa na privacidade", async () => {
  const [rota, interna, lista, mw, priv, painel] = await Promise.all([
    ler("app/api/busca-sem-resultado/route.ts"), ler("app/api/interno/buscas/route.ts"), ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    ler("middleware.ts"), ler("app/privacidade/page.tsx"), ler("app/components/PainelFotos.tsx"),
  ]);
  assert.ok(!/cf-connecting-ip[\s\S]{0,200}registrarBusca/.test(rota), "o IP não vai para o banco");
  assert.match(rota, /new Response\(null, \{ status: 204 \}\)/);
  assert.match(rota, /termoParaRegistro\(corpo\.q\)/);
  assert.match(interna, /topBuscas\(db/);
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  assert.match(mw, /"\/api\/busca-sem-resultado"/);
  assert.match(lista, /tolerante\.tipo === "sintoma"/, "busca por sintoma nunca é registrada");
  assert.match(lista, /u\.searchParams\.set\("text"/);
  assert.match(lista, /href=\{whatsappBusca\}/);
  assert.match(priv, /apagamos depois de 90 dias/);
  assert.match(painel, /<BuscasSemResultado /);
});

// ---- Política de privacidade x código: o que o site envia a terceiros ou guarda precisa estar escrito na /privacidade ----
const lerArquivo = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
/** Texto da página sem quebras de linha nem espaços repetidos (o JSX quebra as frases). */
const politica = async () => (await lerArquivo("app/privacidade/page.tsx")).replace(/\s+/g, " ");

// A política precisa dizer o que o código faz. Cada bloco abaixo liga um trecho do código ao aviso correspondente:
// se o recurso existir e o aviso sumir (ou o contrário não importar), o teste falha.
test("privacidade: a foto da receita enviada à IA de terceiros está na política e no aviso da tela", async () => {
  const rota = await lerArquivo("app/api/receita-ia/route.ts");
  assert.match(rota, /chamarGemini\(/, "a rota manda a foto ao Gemini");
  assert.match(rota, /MODELO_VISAO/, "e, como reserva, à IA da Cloudflare");
  const texto = await politica();
  assert.match(texto, /Leitura de receita por foto/);
  assert.match(texto, /Google Gemini/);
  assert.match(texto, /Cloudflare Workers AI/);
  assert.match(texto, /não gravamos a foto/i);
  assert.match(texto, /dados de saúde/);
  // O contador contra abuso guarda um resumo do IP por alguns minutos.
  assert.match(rota, /limite_receita/);
  assert.match(texto, /contador ligado a um código derivado do seu endereço de internet \(IP\)/);
  const tela = await lerArquivo("app/receita-foto/LerReceita.tsx");
  assert.match(tela, /receita-privacidade">[^<]*Google Gemini ou Cloudflare[^<]*<a href="\/privacidade">/);
});

test("privacidade: busca corrigida por IA, busca por voz e dados guardados no aparelho estão na política", async () => {
  const texto = await politica();
  const buscaIa = await lerArquivo("app/api/busca-ia/route.ts");
  assert.match(buscaIa, /chamarGemini\(/);
  assert.match(texto, /Busca de produtos\.<\/strong> Quando a busca não encontra o que foi digitado, o texto pode ser enviado/);
  const voz = await lerArquivo("app/shop/voz.ts");
  assert.match(voz, /SpeechRecognition/);
  assert.match(texto, /reconhecimento de voz do seu próprio navegador/);
  const cliente = await lerArquivo("app/reserva/dados-cliente.ts");
  assert.match(cliente, /localStorage/);
  assert.match(texto, /seu nome e endereço de entrega/);
  assert.match(texto, /guardados no seu navegador/);
  // Registro de erros e funil da cesta: anônimos, mas existem.
  assert.match(await lerArquivo("app/api/erro-cliente/route.ts"), /registrarErro/);
  assert.match(await lerArquivo("app/api/funil/route.ts"), /funil_dia/);
  assert.match(texto, /mensagem do erro, a página e o tipo de navegador/);
  assert.match(texto, /cada etapa da cesta/);
});

test("privacidade: fornecedores citados pelo nome e analytics só com autorização", async () => {
  const texto = await politica();
  assert.match(texto, /Cloudflare \(hospedagem e banco de dados\)/);
  assert.match(texto, /Google \(Analytics, quando autorizado, e inteligência artificial\)/);
  assert.match(texto, /somente são carregados após sua autorização/);
});
