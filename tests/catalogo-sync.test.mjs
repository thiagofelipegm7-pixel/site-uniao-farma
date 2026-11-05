import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("sincronização do catálogo: validações da origem e da saída (python)", () => {
  const r = spawnSync("python3", ["-m", "unittest", "test_sincronizar"], { cwd: "ops/catalogo-nacoes", encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("workflow catalogo-sync: a cada 10 min, token só por secret, sem permissões além de contents", () => {
  const y = readFileSync(".github/workflows/catalogo-sync.yml", "utf8");
  assert.match(y, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(y, /CATALOGO_READ_TOKEN: \$\{\{ secrets\.CATALOGO_READ_TOKEN \}\}/);
  assert.match(y, /permissions:\n  contents: write/);
  assert.match(y, /concurrency:/);
  assert.doesNotMatch(y, /eyJ|Bearer [A-Za-z0-9]{10,}/);
});

test("sincronizar.py nunca grava estoque nem código de barras no que é público", () => {
  const py = readFileSync("ops/catalogo-nacoes/sincronizar.py", "utf8");
  assert.match(py, /CAMPOS_PROIBIDOS/);
  assert.match(py, /Estoque/);
  assert.match(py, /CodigoDeBarras/);
});

test("painel: idade, fonte e saúde com a janela de expediente (seg-sáb, 8h-21h) e batimento 45 min", async () => {
  const { statusDoCatalogo, avaliarSaude, dentroDoExpediente, formatarIdade, instanteDoGeradoEm } = await import("../app/catalogo-painel.ts");
  const quinta17h = Date.parse("2026-11-05T17:00:00-03:00");
  assert.deepEqual(statusDoCatalogo("2026-11-05T11:00:06", 1399, quinta17h), { geradoEm: "2026-11-05T11:00:06", total: 1399, fonte: "pc", idadeHoras: 6 });
  assert.equal(statusDoCatalogo("2026-11-02T11:00:06", 1399, quinta17h).fonte, "fallback");
  assert.deepEqual(statusDoCatalogo(undefined, 0, quinta17h), { geradoEm: null, total: 0, fonte: "fallback", idadeHoras: null });
  assert.equal(instanteDoGeradoEm("lixo"), null);

  // Conteúdo de 20 min atrás: ok. Conteúdo de 2 h sem batimento: problema. Batimento fresco salva conteúdo antigo.
  assert.equal(avaliarSaude(statusDoCatalogo("2026-11-05T16:40:00", 1, quinta17h), quinta17h).nivel, "ok");
  assert.equal(avaliarSaude(statusDoCatalogo("2026-11-05T15:00:00", 1, quinta17h), quinta17h).nivel, "problema");
  assert.equal(avaliarSaude(statusDoCatalogo("2026-11-05T15:00:00", 1, quinta17h), quinta17h, 0.2).nivel, "ok");
  assert.equal(avaliarSaude(statusDoCatalogo(null, 1, quinta17h), quinta17h).nivel, "problema");
  const domingo = Date.parse("2026-11-08T15:00:00-03:00");
  assert.equal(dentroDoExpediente(domingo), false);
  assert.equal(avaliarSaude(statusDoCatalogo("2026-11-07T20:00:00", 1, domingo), domingo).nivel, "ok");
  const noite = Date.parse("2026-11-05T23:00:00-03:00");
  assert.equal(dentroDoExpediente(noite), false);
  assert.equal(dentroDoExpediente(Date.parse("2026-11-05T07:59:00-03:00")), false);
  assert.equal(dentroDoExpediente(Date.parse("2026-11-05T08:00:00-03:00")), true);
  assert.equal(avaliarSaude(statusDoCatalogo("2026-11-01T11:00:00", 1, noite), noite).nivel, "atencao");
  assert.equal(formatarIdade(0.2), "12 min");
  assert.equal(formatarIdade(3), "3 h");
  assert.equal(formatarIdade(72), "3 dias");
  const { formatarQuandoBRT } = await import("../app/catalogo-painel.ts");
  const agora = Date.parse("2026-11-05T17:00:00-03:00");
  assert.equal(formatarQuandoBRT("2026-11-05T16:02:00-03:00", agora), "hoje 16:02");
  assert.equal(formatarQuandoBRT("2026-11-05T19:02:00.000Z", agora), "hoje 16:02");
  assert.equal(formatarQuandoBRT("2026-11-04T09:15:00-03:00", agora), "ontem 09:15");
});

test("painel: execuções da sincronização lidas da API pública do GitHub, com motivo da recusa", async () => {
  const { buscarExecucoes, normalizarAnotacoes, somarUso } = await import("../app/catalogo-painel.ts");
  const respostas = {
    "/runs?": { workflow_runs: [
      { id: 2, status: "completed", conclusion: "failure", event: "schedule", created_at: "2026-11-05T17:15:00Z", html_url: "https://x/2" },
      { id: 1, status: "completed", conclusion: "success", event: "workflow_dispatch", created_at: "2026-11-05T16:42:00Z", html_url: "https://x/1" },
    ] },
    "/actions/runs/2/jobs": { jobs: [{ id: 20 }] },
    "/actions/runs/1/jobs": { jobs: [{ id: 10 }] },
    "/check-runs/20/annotations": [{ annotation_level: "failure", message: "itens caíram de 1399 para 900" }, { annotation_level: "failure", message: "Process completed with exit code 1." }, { annotation_level: "warning", message: "The ubuntu-latest label will migrate" }],
    "/check-runs/10/annotations": [{ annotation_level: "notice", message: "Sem novidade" }],
  };
  const falso = async (url) => {
    const chave = Object.keys(respostas).find((k) => url.includes(k));
    return chave ? new Response(JSON.stringify(respostas[chave]), { status: 200 }) : new Response("{}", { status: 404 });
  };
  const lista = await buscarExecucoes(falso);
  assert.equal(lista.length, 2);
  assert.equal(lista[0].estado, "falha");
  assert.equal(lista[0].origem, "agendado");
  assert.deepEqual(lista[0].mensagens, [{ nivel: "erro", texto: "itens caíram de 1399 para 900" }]);
  assert.equal(lista[1].estado, "sucesso");
  assert.equal(lista[1].origem, "manual");
  assert.equal(await buscarExecucoes(async () => new Response("limite", { status: 403 })), null);
  assert.equal(await buscarExecucoes(async () => { throw new Error("rede"); }), null);
  assert.deepEqual(normalizarAnotacoes([{ message: "" }]), []);
  assert.deepEqual(somarUso([{ tipo: "busca", resultado: "ia", n: 2 }, { tipo: "busca", resultado: "ia", n: 3 }, { tipo: "receita", resultado: "cache", n: 1 }]), [
    { tipo: "busca", resultado: "ia", n: 5 },
    { tipo: "receita", resultado: "cache", n: 1 },
  ]);
});

test("painel: rota e página só pela sessão da equipe, noindex, sem estoque/código de barras e sem segredo no código", () => {
  const mw = readFileSync("middleware.ts", "utf8");
  assert.match(mw, /staffPath = [^;]*"\/api\/interno\/catalogo"/);
  assert.match(mw, /pathname\.startsWith\("\/interno"\)/);
  const pagina = readFileSync("app/interno/catalogo/page.tsx", "utf8");
  assert.match(pagina, /robots: \{ index: false, follow: false \}/);
  const rota = readFileSync("app/api/interno/catalogo/route.ts", "utf8");
  assert.match(rota, /origem_invalida/);
  assert.match(rota, /\/status\?loja=/);
  assert.doesNotMatch(rota, /Estoque|CodigoDeBarras|ghp_|github_pat_/);
  const ui = readFileSync("app/components/PainelCatalogo.tsx", "utf8");
  assert.match(ui, /PC do estoque/);
  assert.match(ui, /a cada 10 minutos/);
  assert.doesNotMatch(ui, /8h, 11h, 14h|ubuntu-latest|Sem novidade/);
  assert.doesNotMatch(ui, /buscarExecucoes|ExecucaoSync/);
  const uso = readFileSync("app/ia-uso.ts", "utf8");
  assert.doesNotMatch(uso, /cf-connecting-ip|request\./);
});

test("workflow catalogo-monitor: só lê o repositório, abre issue com o título combinado e falha em voz alta", () => {
  const w = readFileSync(".github/workflows/catalogo-monitor.yml", "utf8");
  assert.match(w, /Estoque do site desatualizado/);
  assert.match(w, /workflow_run:[\s\S]*Sincronizar catálogo da loja/);
  assert.match(w, /permissions:\s*\n\s*contents: read\s*\n\s*issues: write/);
  assert.doesNotMatch(w, /contents: write/);
  assert.match(w, /exit 1/);
  assert.match(w, /secrets\.CATALOGO_READ_TOKEN/);
});

test("monitor.py (python)", () => {
  const r = spawnSync("python3", ["-m", "unittest", "test_monitor"], { cwd: "ops/catalogo-nacoes", encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("workflow catalogo-sync: poda textos/pares de IA antes dos testes e versiona os dois arquivos", () => {
  const y = readFileSync(".github/workflows/catalogo-sync.yml", "utf8");
  assert.ok(y.indexOf("scripts/podar-dados-ia.mjs") > y.indexOf("npm ci"));
  assert.ok(y.indexOf("scripts/podar-dados-ia.mjs") < y.indexOf("npm test"));
  assert.match(y, /git add [^\n]*descricoes-ia\.json [^\n]*relacionados-ia\.json/);
  assert.match(y, /if: failure\(\)/);
});
