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
