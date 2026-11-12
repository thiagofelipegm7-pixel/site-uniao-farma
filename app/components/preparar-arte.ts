import { MAX_ARQUIVO_BYTES, mensagemTamanho } from "../banners-gravacao";

/** Arte pronta para enviar (data URL) ou o motivo de não dar para enviar. */
export type ArtePreparada = { ok: true; url: string; reduzida: boolean } | { ok: false; mensagem: string };

const LADO_MAX = 1920;

function lerComoDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Tenta diminuir uma arte grande: redimensiona para caber em 1920 px e salva em JPG. Devolve null se não der. */
async function reduzir(arquivo: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff"; // JPG não tem transparência
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    for (const qualidade of [0.88, 0.8, 0.7]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
      if (blob && blob.type === "image/jpeg" && blob.size <= MAX_ARQUIVO_BYTES) return blob;
    }
  } catch {
    // formato que o navegador não abre (ex.: HEIC): cai na mensagem de tamanho
  }
  return null;
}

/** Confere o tamanho antes de enviar. Se passar do limite, tenta diminuir; se não der, explica o máximo. */
export async function prepararArte(arquivo: File): Promise<ArtePreparada> {
  if (arquivo.type && !arquivo.type.startsWith("image/")) return { ok: false, mensagem: "Esse arquivo não é uma imagem. Envie a arte em JPG, PNG ou WebP." };
  if (arquivo.size <= MAX_ARQUIVO_BYTES) return { ok: true, url: await lerComoDataUrl(arquivo), reduzida: false };
  const menor = await reduzir(arquivo);
  if (!menor) return { ok: false, mensagem: mensagemTamanho(arquivo.size) };
  return { ok: true, url: await lerComoDataUrl(menor), reduzida: true };
}

/** Texto para o painel quando o servidor recusa a arte. */
export async function mensagemErroEnvio(r: Response) {
  const dados = (await r.json().catch(() => ({}))) as { erro?: string; max?: string };
  if (r.status === 413 || dados.erro === "arte_grande") return `A arte passou do tamanho máximo (${dados.max ?? "1,3 MB"}). Diminua a imagem e envie de novo. O banner atual não foi alterado.`;
  if (dados.erro === "formato_invalido") return "Esse arquivo não é uma imagem válida. Envie a arte em JPG, PNG ou WebP.";
  return "Não consegui gravar. Tente de novo. O banner atual não foi alterado.";
}
