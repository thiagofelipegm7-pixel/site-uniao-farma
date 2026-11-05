// Depois de a sincronização trocar o catálogo, tira dos arquivos de IA o que deixou de valer para o produto como ele está agora:
//  - descrição que reprova nas regras com o nome novo (ex.: "0 30" virou "0.30"), ou de produto que virou NBCAL/fórmula infantil;
//  - "combina com" cuja origem/alvo virou medicamento, inelegível ou sem preço.
// Sem isso uma renomeação no PC derrubava os testes e travava a atualização inteira. O produto segue no site, só sem o texto/par.
// Uso: node --experimental-strip-types --import ./tests/ts-resolve-hook.mjs scripts/podar-dados-ia.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { carregarCatalogoNacoes, slugify } from "../app/nacoes-unidas/produtos/catalogo.ts";
import { ehNbcal } from "../app/nacoes-unidas/produtos/produto.ts";
import { ehFormulaInfantil, elegivelParaPares, MIN_SUGESTOES, MAX_SUGESTOES } from "../app/nacoes-unidas/produtos/relacionados.ts";
import { nomeDeExibicao } from "../app/nome-exibicao.ts";
import { reprovarDescricao } from "../ops/ia-catalogo/descricoes-regras.mjs";

const ARQ_DESC = "app/nacoes-unidas/produtos/dados/descricoes-ia.json";
const ARQ_PARES = "app/nacoes-unidas/produtos/dados/relacionados-ia.json";

const catalogo = new Map();
for (const i of carregarCatalogoNacoes().itens) if (!catalogo.has(slugify(i.nome))) catalogo.set(slugify(i.nome), i);

const descricoes = JSON.parse(readFileSync(ARQ_DESC, "utf8"));
let podadasDesc = 0;
for (const [slug, d] of Object.entries(descricoes)) {
  const item = catalogo.get(slug);
  if (!item) continue; // saiu do catálogo: o texto fica guardado para quando voltar
  const ruim = ehNbcal(item.nome) || ehFormulaInfantil(item.nome) || (d.f === "ia" && reprovarDescricao(d.t, { nome: item.nome, exibicao: nomeDeExibicao(item.nome) }) !== null);
  if (ruim) {
    delete descricoes[slug];
    podadasDesc += 1;
  }
}

const pares = JSON.parse(readFileSync(ARQ_PARES, "utf8"));
let podadosPares = 0;
for (const [origem, alvos] of Object.entries(pares)) {
  const item = catalogo.get(origem);
  if (item && (item.isMIP || !elegivelParaPares(item))) {
    delete pares[origem];
    podadosPares += 1;
    continue;
  }
  const bons = alvos.filter((a) => {
    const it = catalogo.get(a);
    return !it || (!it.isMIP && elegivelParaPares(it) && it.preco > 0);
  });
  if (bons.length === alvos.length) continue;
  podadosPares += 1;
  if (bons.length < MIN_SUGESTOES || bons.length > MAX_SUGESTOES) delete pares[origem];
  else pares[origem] = bons;
}

if (podadasDesc) writeFileSync(ARQ_DESC, JSON.stringify(descricoes) + "\n");
if (podadosPares) writeFileSync(ARQ_PARES, JSON.stringify(pares) + "\n");
console.log(`Podadas ${podadasDesc} descrição(ões) e ${podadosPares} lista(s) "combina com" que não valem mais para os produtos atuais.`);
