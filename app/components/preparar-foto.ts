/** Prepara a foto escolhida no celular/PC: quadrada 400x400, fundo branco, produto inteiro, em WebP (PNG onde o navegador não gera WebP). Devolve base64 sem o prefixo. */
const LADO = 400;
const OCUPA = 0.98;

export async function prepararFoto(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("abrir"));
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("abrir");
    const canvas = document.createElement("canvas");
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO, LADO);
    const escala = Math.min((LADO * OCUPA) / w, (LADO * OCUPA) / h);
    const dw = w * escala;
    const dh = h * escala;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (LADO - dw) / 2, (LADO - dh) / 2, dw, dh);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.88));
    if (!blob) throw new Error("gerar");
    const texto = await new Promise<string>((ok, falha) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.onerror = () => falha(new Error("ler"));
      leitor.readAsDataURL(blob);
    });
    return texto.replace(/^data:[^,]*,/, "");
  } finally {
    URL.revokeObjectURL(url);
  }
}
