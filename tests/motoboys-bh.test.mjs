import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ErroMotoboysBh,
  MOTOBOYSBH_URL,
  codigoDoErro,
  configMotoboysBh,
  criarClienteMotoboysBh,
  lerCotacaoMotoboysBh,
  mensagemErroMotoboysBh,
  minutosDoTempo,
  motoboysBhModoTeste,
} from "../app/motoboys-bh.ts";

// Credenciais de mentira: as de verdade só existem como secrets do Worker.
const CFG = { token: "tok-exemplo", codCliente: "cli-exemplo", url: MOTOBOYSBH_URL };
const DESTINO = { lat: -19.8775, lng: -43.864, endereco: "Rua Bélgica, 50, Nações Unidas", complemento: "casa 2", cep: "34590-020" };

function fetchFalso(respostas) {
  const chamadas = [];
  const f = async (url, init = {}) => {
    chamadas.push({ url: String(url), init });
    const proxima = respostas.shift();
    if (!proxima) throw new Error(`chamada inesperada: ${url}`);
    return new Response(typeof proxima.body === "string" ? proxima.body : JSON.stringify(proxima.body), { status: proxima.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return { f, chamadas };
}

test("configMotoboysBh exige token e codCliente; endereço alternativo só no domínio da Motoboys BH", () => {
  const env = { MOTOBOYSBH_TOKEN_CALCULAR: "a", MOTOBOYSBH_COD_CLIENTE: "b" };
  assert.deepEqual(configMotoboysBh((n) => env[n] ?? ""), { token: "a", codCliente: "b", url: MOTOBOYSBH_URL });
  assert.equal(configMotoboysBh((n) => (n === "MOTOBOYSBH_COD_CLIENTE" ? "" : env[n] ?? "")), null);
  assert.equal(configMotoboysBh(() => ""), null);
  const teste = { ...env, MOTOBOYSBH_URL: "https://motoboysbh.com.br/integracao-teste" };
  assert.equal(configMotoboysBh((n) => teste[n] ?? "").url, "https://motoboysbh.com.br/integracao-teste");
  const estranho = { ...env, MOTOBOYSBH_URL: "https://exemplo.com/roubar" };
  assert.equal(configMotoboysBh((n) => estranho[n] ?? "").url, MOTOBOYSBH_URL);
  assert.equal(motoboysBhModoTeste(() => ""), true);
  assert.equal(motoboysBhModoTeste((n) => (n === "MOTOBOYSBH_AMBIENTE" ? "producao" : "")), false);
});

test("cotar manda JSON com token, codCliente e dois pontos (loja e cliente com coordenadas), sem retorno", async () => {
  const { f, chamadas } = fetchFalso([{ body: { Sucesso: { valor: "17.40", distancia: "0.81", tempo: "00:04:10", modalidades: { padrao: { disponivel: true, valor: 17.4 }, urgente: { disponivel: false, valor: null, titulo: "", descricao: "" } } } } }]);
  const c = await criarClienteMotoboysBh(CFG, f).cotar(DESTINO);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, "https://motoboysbh.com.br/integracao");
  assert.equal(chamadas[0].init.method, "POST");
  const corpo = JSON.parse(chamadas[0].init.body);
  assert.equal(corpo.token, "tok-exemplo");
  assert.equal(corpo.codCliente, "cli-exemplo");
  assert.equal(corpo.retorno, "N");
  assert.equal(corpo.pontos.length, 2);
  assert.equal(corpo.pontos[0].rua, "Rua Inglaterra");
  assert.equal(corpo.pontos[0].numero, "162");
  assert.equal(corpo.pontos[0].cep, "34590-010");
  assert.equal(corpo.pontos[1].la, "-19.877500");
  assert.equal(corpo.pontos[1].lo, "-43.864000");
  assert.equal(corpo.pontos[1].cidade, "Sabará");
  // Nada de gravar serviço: só a cotação.
  assert.equal(corpo.semProfissional, undefined);
  assert.deepEqual(c, {
    total: "17.40",
    distanciaM: 810,
    trajetoMin: 5,
    modalidades: { padrao: { disponivel: true, valor: "17.40", titulo: "" }, urgente: { disponivel: false, valor: null, titulo: "" } },
    obs: null,
  });
});

test("erros documentados viram códigos curtos com mensagem em português", async () => {
  assert.equal(codigoDoErro("Token nao confere"), "token_invalido");
  assert.equal(codigoDoErro("Codigo do cliente nao confere"), "cliente_invalido");
  assert.equal(codigoDoErro("Solicitante nao definido"), "solicitante_nao_definido");
  assert.equal(codigoDoErro("Erro no ponto 2 Favor, verificar!"), "endereco_invalido");
  assert.equal(codigoDoErro("Favor, informar 2 ou mais pontos!"), "pontos_insuficientes");
  assert.equal(codigoDoErro("qualquer outra coisa"), "recusado");
  const { f } = fetchFalso([{ body: { Erro: "Token nao confere" } }]);
  await assert.rejects(() => criarClienteMotoboysBh(CFG, f).cotar(DESTINO), (e) => e instanceof ErroMotoboysBh && e.codigo === "token_invalido" && e.status === 422);
  assert.match(mensagemErroMotoboysBh("token_invalido"), /recusou a chave/);
  assert.equal(mensagemErroMotoboysBh("nao_configurado"), "Integração Motoboys BH não configurada.");
  const { f: f429 } = fetchFalso([{ status: 429, body: "" }]);
  await assert.rejects(() => criarClienteMotoboysBh(CFG, f429).cotar(DESTINO), (e) => e.codigo === "rate_limit");
  const { f: fHtml } = fetchFalso([{ status: 500, body: "<html>" }]);
  await assert.rejects(() => criarClienteMotoboysBh(CFG, fHtml).cotar(DESTINO), (e) => e.codigo === "http_500");
});

test("resposta sem valor não vira preço inventado", () => {
  assert.throws(() => lerCotacaoMotoboysBh({ Sucesso: { valor: "", distancia: "1" } }), (e) => e.codigo === "cotacao_invalida");
  assert.throws(() => lerCotacaoMotoboysBh({ Sucesso: { valor: "0" } }), (e) => e.codigo === "cotacao_invalida");
  assert.throws(() => lerCotacaoMotoboysBh(null), (e) => e.codigo === "recusado");
  assert.equal(minutosDoTempo("00:32:05"), 33);
  assert.equal(minutosDoTempo("1:00:00"), 60);
  assert.equal(minutosDoTempo("abc"), null);
  assert.equal(lerCotacaoMotoboysBh({ Sucesso: { valor: 28.15, distancia: "9,6", tempo: "x" } }).distanciaM, 9600);
});

test("rota e painel: Motoboys BH só cota, chamada é manual e a chave não aparece no código", () => {
  const rota = readFileSync(new URL("../app/api/interno/entregas/route.ts", import.meta.url), "utf8");
  assert.match(rota, /motoboysbh/);
  assert.match(rota, /chamada_manual/);
  assert.match(rota, /PROVEDORES\.filter\(configurado\)/);
  const painel = readFileSync(new URL("../app/components/PainelEntregas.tsx", import.meta.url), "utf8");
  assert.match(painel, /Integração Motoboys BH não configurada/);
  assert.match(painel, /Abrir o painel da Motoboys BH/);
  assert.match(painel, /Comparar todas/);
  for (const arquivo of ["../app/motoboys-bh.ts", "../app/api/interno/entregas/route.ts", "../app/components/PainelEntregas.tsx"]) {
    const t = readFileSync(new URL(arquivo, import.meta.url), "utf8");
    assert.doesNotMatch(t, /MOTOBOYSBH_TOKEN_CALCULAR\s*=\s*["'][^"']/);
  }
});
