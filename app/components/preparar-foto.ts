/** Prepara a foto escolhida no celular/PC: quadrada 400x400, fundo branco, produto inteiro, em WebP (JPEG onde o navegador não gera WebP, como o Safari do iPhone). Devolve base64 sem o prefixo. */
const LADO = 400;
const OCUPA = 0.98;

type Fonte = { fonte: CanvasImageSource; w: number; h: number; fechar: () => void };

/** Abre o arquivo como imagem. Não usa blob: (a política de segurança do site só deixa 'self', data: e https:). */
async function abrir(arquivo: Blob): Promise<Fonte> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(arquivo);
      return { fonte: bmp, w: bmp.width, h: bmp.height, fechar: () => bmp.close() };
    } catch {
      // formato que o createImageBitmap não abre: tenta pelo data:
    }
  }
  const url = await new Promise<string>((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => falha(new Error("ler"));
    leitor.readAsDataURL(arquivo);
  });
  const img = await new Promise<HTMLImageElement>((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error("abrir"));
    i.src = url;
  });
  return { fonte: img, w: img.naturalWidth, h: img.naturalHeight, fechar: () => undefined };
}

export async function prepararFoto(arquivo: Blob): Promise<string> {
  const origem = await abrir(arquivo);
  try {
    if (!origem.w || !origem.h) throw new Error("abrir");
    const canvas = document.createElement("canvas");
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO, LADO);
    const escala = Math.min((LADO * OCUPA) / origem.w, (LADO * OCUPA) / origem.h);
    const dw = origem.w * escala;
    const dh = origem.h * escala;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(origem.fonte, (LADO - dw) / 2, (LADO - dh) / 2, dw, dh);
    let blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.88));
    // Safari (iPhone) não gera WebP e devolve PNG, que numa foto de produto passa de 400 KB e o servidor recusa. JPEG fica em ~40 KB.
    if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
    if (!blob) throw new Error("gerar");
    const texto = await new Promise<string>((ok, falha) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.onerror = () => falha(new Error("ler"));
      leitor.readAsDataURL(blob);
    });
    return texto.replace(/^data:[^,]*,/, "");
  } finally {
    origem.fechar();
  }
}
