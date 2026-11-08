import assert from "node:assert/strict";
import test from "node:test";

const { validarEnvio, mimeDosBytes } = await import("../app/fotos-enviadas.ts");

const webp = () => {
  const b = new Uint8Array(800);
  b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  return Buffer.from(b).toString("base64");
};

test("foto enviada pelo painel: aceita WebP/PNG/JPEG de verdade e recusa o resto", () => {
  const bom = validarEnvio({ ean: "7891234567890", nome: "  CREME   X 50G ", imagem: `data:image/webp;base64,${webp()}` });
  assert.equal(bom.ok, true);
  assert.equal(bom.envio.nome, "CREME X 50G");
  assert.equal(bom.envio.mime, "image/webp");
  assert.equal(mimeDosBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6])), "image/png");
  assert.equal(mimeDosBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");

  const erro = (corpo) => validarEnvio(corpo).erro;
  assert.equal(erro({ ean: "abc", nome: "X", imagem: webp() }), "codigo_invalido");
  assert.equal(erro({ ean: "../../etc", nome: "X", imagem: webp() }), "codigo_invalido");
  assert.equal(erro({ ean: "7891234567890", nome: "", imagem: webp() }), "nome_invalido");
  assert.equal(erro({ ean: "7891234567890", nome: "X", imagem: "" }), "imagem_invalida");
  assert.equal(erro({ ean: "7891234567890", nome: "X", imagem: "a".repeat(700_000) }), "imagem_invalida");
  // Texto qualquer em base64 (por exemplo um script) não passa: o formato é lido pelos bytes.
  assert.equal(erro({ ean: "7891234567890", nome: "X", imagem: Buffer.from("<script>alert(1)</script>".repeat(40)).toString("base64") }), "formato_invalido");
  assert.equal(erro(null), "codigo_invalido");
});

test("imagem arrastada de outro site: acha o endereço da imagem e só deixa o servidor baixar https público", async () => {
  const { candidatosDoArraste } = await import("../app/fotos-arrastar.ts");
  const { urlPermitida } = await import("../app/fotos-enviadas.ts");
  const google = "https://www.google.com/imgres?q=dove&imgurl=https%3A%2F%2Fassets.unileversolutions.com%2Fv1%2Fdove.png&imgrefurl=https%3A%2F%2Floja.com%2Fp";
  const c = candidatosDoArraste({ uriList: google, html: '<a href="x"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:abc" alt="d"></a>', texto: google });
  assert.equal(c[0], "https://assets.unileversolutions.com/v1/dove.png");
  assert.ok(c.includes("https://encrypted-tbn0.gstatic.com/images?q=tbn:abc"));
  assert.deepEqual(candidatosDoArraste({ uriList: "javascript:alert(1)\nhttp://inseguro.com/a.png", html: "", texto: "" }), []);
  assert.ok(candidatosDoArraste({ uriList: "", html: '<img src="data:image/png;base64,AAAA">', texto: "" })[0].startsWith("data:image/png"));

  assert.ok(urlPermitida("https://assets.unileversolutions.com/v1/dove.png"));
  for (const ruim of ["http://site.com/a.png", "https://localhost/a.png", "https://127.0.0.1/a.png", "https://10.0.0.5/a.png", "https://[::1]/a.png", "https://meu.servico.internal/a", "https://u:p@site.com/a", "https://site.com:8443/a", "file:///etc/passwd", "texto"]) {
    assert.equal(urlPermitida(ruim), null, ruim);
  }
});

test("publicação das fotos: no máximo uma a cada 10 minutos (poupa os minutos grátis do GitHub)", async () => {
  const { reservarPublicacao, MINUTOS_ENTRE_PUBLICACOES } = await import("../app/limite-publicacao.ts");
  let quando = null;
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        first: async () => (quando === null ? null : { quando }),
        run: async () => {
          if (/INSERT/.test(sql)) quando = v[0];
        },
      }),
    }),
  };
  const t0 = Date.UTC(2026, 10, 8, 12, 0, 0);
  assert.equal(await reservarPublicacao(db, t0), true, "primeira vai");
  assert.equal(await reservarPublicacao(db, t0 + 2 * 60_000), false, "2 min depois espera o lote");
  assert.equal(await reservarPublicacao(db, t0 + (MINUTOS_ENTRE_PUBLICACOES + 1) * 60_000), true, "depois da janela vai de novo");
  assert.equal(await reservarPublicacao(null, t0), true, "sem banco não bloqueia");
});
