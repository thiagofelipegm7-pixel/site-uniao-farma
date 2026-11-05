/**
 * Prepara a foto da receita no próprio aparelho: corrige a rotação, reduz e regrava como JPEG.
 * Regravar tira os dados da câmera (EXIF: local, modelo do aparelho). A foto só existe na memória do navegador.
 */
export const LADO_MAX_PX = 1600;
/** Arquivo original acima disso nem é aberto (evita travar o celular). */
export const ARQUIVO_MAX_BYTES = 25 * 1024 * 1024;
/** O Worker aceita 3 MB; reduzimos até caber bem abaixo disso. */
export const ENVIO_MAX_BYTES = 1_500_000;

export type MotivoImagem = "grande" | "formato" | "falha";
export class ErroImagem extends Error {
  motivo: MotivoImagem;
  constructor(motivo: MotivoImagem) {
    super(motivo);
    this.motivo = motivo;
  }
}

/** Mantém a proporção e limita o maior lado. Nunca aumenta a imagem. */
export function tamanhoReduzido(largura: number, altura: number, max = LADO_MAX_PX): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (!(maior > 0)) return { largura: 0, altura: 0 };
  if (maior <= max) return { largura: Math.round(largura), altura: Math.round(altura) };
  const f = max / maior;
  return { largura: Math.max(1, Math.round(largura * f)), altura: Math.max(1, Math.round(altura * f)) };
}

export function arquivoParecidoComImagem(arquivo: { type: string; name: string }): boolean {
  if (arquivo.type) return arquivo.type.startsWith("image/");
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(arquivo.name);
}

type Fonte = { fonte: CanvasImageSource; largura: number; altura: number; fechar: () => void };

async function abrir(arquivo: File): Promise<Fonte> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
      return { fonte: bmp, largura: bmp.width, altura: bmp.height, fechar: () => bmp.close() };
    } catch {
      /* tenta pelo elemento <img> */
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { fonte: img, largura: img.naturalWidth, altura: img.naturalHeight, fechar: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ErroImagem("formato");
  }
}

function paraBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
}

export async function prepararImagem(arquivo: File): Promise<Blob> {
  if (!arquivoParecidoComImagem(arquivo)) throw new ErroImagem("formato");
  if (arquivo.size > ARQUIVO_MAX_BYTES) throw new ErroImagem("grande");
  const origem = await abrir(arquivo);
  try {
    const { largura, altura } = tamanhoReduzido(origem.largura, origem.altura);
    if (largura < 1 || altura < 1) throw new ErroImagem("formato");
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ErroImagem("falha");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(origem.fonte, 0, 0, largura, altura);
    for (const qualidade of [0.85, 0.7, 0.55]) {
      const blob = await paraBlob(canvas, qualidade);
      if (blob && blob.size <= ENVIO_MAX_BYTES) return blob;
    }
    throw new ErroImagem("grande");
  } finally {
    origem.fechar();
  }
}
