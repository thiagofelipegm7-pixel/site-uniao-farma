import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const M = await import("../app/nacoes-unidas/produtos/marca.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("cartão do produto: marca do produto comum só quando o nome cita a marca (palavra inteira)", () => {
  assert.equal(M.marcaDeProduto("Absorvente Always Not Seca com 8 un"), "Always");
  assert.equal(M.marcaDeProduto("Sabonete líquido Lux Gard 200ml"), "Lux");
  assert.equal(M.marcaDeProduto("Esponja Nylon Luxo"), "", "lux não vale para luxo");
  assert.equal(M.marcaDeProduto("Chá Sedativo 10 sachês"), "", "seda não vale para sedativo");
  assert.equal(M.marcaDeProduto("Condicionador Johnsons Baby 200ml"), "Johnson's");
  assert.equal(M.marcaDeProduto("Creme dental Oral-B 3D White 70g"), "Oral-B");
  assert.equal(M.marcaDeProduto("Pentes Diversos"), "");
});

test("cartão do produto: nome, depois quantidade, classificação (Med. Genérico, Sem receita...) e Lab./Marca/Fab., cada um com ícone", async () => {
  const [cartao, css, lista, meds, restrita, destaques] = await Promise.all([
    ler("app/nacoes-unidas/produtos/CartaoPanvel.tsx"),
    ler("app/shop/shop.css"),
    ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    ler("app/nacoes-unidas/produtos/MedicamentosTodos.tsx"),
    ler("app/nacoes-unidas/produtos/ListaRestrita.tsx"),
    ler("app/shop/DestaquesSemana.tsx"),
  ]);
  assert.match(cartao, /"Med\. Genérico"/);
  assert.match(cartao, /Lab\. \$\{marcaLegivel\(marca\)\}/);
  assert.match(cartao, /`Marca \$\{marcaDoNome\}`/);
  assert.match(cartao, /`Fab\. \$\{marcaLegivel\(marca\)\}`/);
  assert.match(cartao, /className="pv-g"/);
  assert.doesNotMatch(css, /\.pv-card \.pv-marca, \.pv-card \.pv-apres \{ display: none; \}/, "as linhas deixaram de ficar escondidas");
  assert.match(css, /\.pv-card \.pv-atrib-linha \{ display: flex;/);
  // Todos os lugares que desenham o cartão passam o que sabem.
  assert.match(lista, /classificacao=\{item\.isMIP \?/);
  assert.match(meds, /medicamento\s+classificacao=/);
  assert.match(restrita, /item\.controlado \? "controlado" : item\.generico \? "generico" : "receita"/);
  assert.match(destaques, /medicamento=\{item\.isMIP\}/);
});

test("cartão do produto: nome da marca legível (siglas ficam em maiúsculas)", async () => {
  const { marcaLegivel } = M;
  assert.equal(marcaLegivel("CIMED"), "Cimed");
  assert.equal(marcaLegivel("NEO QUIMICA"), "Neo Quimica");
  assert.equal(marcaLegivel("EMS MARCAS"), "EMS Marcas");
  assert.equal(marcaLegivel("J&J"), "J&J");
  assert.equal(marcaLegivel("COSMED DE COSMETICOS"), "Cosmed de Cosmeticos");
  assert.equal(marcaLegivel("3M"), "3M");
});
