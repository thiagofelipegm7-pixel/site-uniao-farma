/**
 * Leitura de receita no próprio aparelho, sem IA de terceiros e sem enviar nada:
 *  1. PDF com texto (ex.: Memed): lê o texto direto do arquivo.
 *  2. Foto ou PDF escaneado: OCR (Tesseract) rodando no navegador.
 * Os arquivos do leitor ficam em /ocr (copiados por scripts/copiar-ocr.mjs); nada vem de CDN.
 * Quando isto não acha nada, quem chama usa a leitura por IA como reserva.
 */
import { arquivoEhPdf } from "./imagem";

export type LeituraLocal = { texto: string; origem: "pdf" | "ocr"; confianca: number };

/** Passou disso, desiste do OCR e deixa a IA ler (celular fraco). */
const TEMPO_OCR_MS = 20_000;
/** Texto de PDF com menos que isso é PDF escaneado (só imagem). */
const MINIMO_TEXTO_PDF = 40;
const PAGINAS_MAX = 3;

async function ocr(imagem: Blob | HTMLCanvasElement, sinal: AbortSignal): Promise<{ texto: string; confianca: number } | null> {
  const { createWorker } = await import("tesseract.js");
  const trabalhador = await createWorker("por", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    // A política de segurança do site não aceita workers criados a partir de blob:.
    workerBlobURL: false,
  });
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const cancelar = () => void trabalhador.terminate();
  sinal.addEventListener("abort", cancelar, { once: true });
  try {
    const limite = new Promise<null>((resolver) => {
      temporizador = setTimeout(() => resolver(null), TEMPO_OCR_MS);
    });
    const lido = await Promise.race([trabalhador.recognize(imagem).then((r) => r.data), limite]);
    if (!lido) return null;
    return { texto: lido.text, confianca: lido.confidence };
  } finally {
    if (temporizador) clearTimeout(temporizador);
    sinal.removeEventListener("abort", cancelar);
    await trabalhador.terminate().catch(() => undefined);
  }
}

async function lerPdf(arquivo: File, sinal: AbortSignal): Promise<LeituraLocal | null> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/ocr/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  try {
    let texto = "";
    for (let n = 1; n <= Math.min(PAGINAS_MAX, doc.numPages); n++) {
      const pagina = await doc.getPage(n);
      const conteudo = await pagina.getTextContent();
      texto += ` ${conteudo.items.map((item) => ("str" in item ? item.str : "")).join(" ")}`;
    }
    if (texto.trim().length >= MINIMO_TEXTO_PDF) return { texto, origem: "pdf", confianca: 100 };
    // PDF escaneado: desenha a primeira página e passa pelo OCR.
    const pagina = await doc.getPage(1);
    const vista = pagina.getViewport({ scale: 2 });
    const tela = document.createElement("canvas");
    tela.width = Math.round(vista.width);
    tela.height = Math.round(vista.height);
    const ctx = tela.getContext("2d");
    if (!ctx) return null;
    await pagina.render({ canvasContext: ctx, viewport: vista }).promise;
    const lido = await ocr(tela, sinal);
    return lido ? { texto: lido.texto, origem: "ocr", confianca: lido.confianca } : null;
  } finally {
    void doc.destroy();
  }
}

/** `imagemPreparada` é a foto já reduzida (usada no OCR); para PDF vale o arquivo original. */
export async function lerLocalmente(arquivo: File, imagemPreparada: Blob, sinal: AbortSignal): Promise<LeituraLocal | null> {
  if (typeof window === "undefined") return null;
  if (arquivoEhPdf(arquivo)) return lerPdf(arquivo, sinal);
  const lido = await ocr(imagemPreparada, sinal);
  return lido ? { texto: lido.texto, origem: "ocr", confianca: lido.confianca } : null;
}
