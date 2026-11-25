// Copia para public/ocr os arquivos do leitor de receita no aparelho (OCR e PDF), para o site servir tudo do próprio domínio.
// Nada é baixado de CDN em tempo de uso: a política de segurança do site só aceita arquivos do próprio endereço.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "ocr");
const arquivos = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz", "por.traineddata.gz"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
];

mkdirSync(destino, { recursive: true });
let faltou = false;
for (const [origem, nome] of arquivos) {
  const de = join(raiz, origem);
  if (!existsSync(de)) {
    console.error(`copiar-ocr: não achei ${origem} (rode npm install)`);
    faltou = true;
    continue;
  }
  copyFileSync(de, join(destino, nome));
}
if (faltou) process.exit(1);
console.log(`copiar-ocr: ${arquivos.length} arquivos em public/ocr`);
