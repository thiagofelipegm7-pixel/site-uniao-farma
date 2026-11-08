/**
 * Foto da receita para anexar ao pedido: reduz para no máximo 1600 px de lado em JPEG (cerca de 300 KB), corrigindo a orientação.
 * A foto fica só no aparelho do cliente (memória do navegador): nada é enviado ao servidor do site. Não usa blob: (política de segurança).
 */
const LADO_MAXIMO = 1600;

export type ReceitaPronta = { arquivo: File; previa: string };

function lerComoTexto(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => falha(new Error("ler"));
    leitor.readAsDataURL(blob);
  });
}

export async function prepararReceita(origem: File): Promise<ReceitaPronta> {
  let fonte: CanvasImageSource;
  let w = 0;
  let h = 0;
  let fechar = () => {};
  try {
    const bmp = await createImageBitmap(origem);
    fonte = bmp;
    w = bmp.width;
    h = bmp.height;
    fechar = () => bmp.close();
  } catch {
    const url = await lerComoTexto(origem);
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("abrir"));
      i.src = url;
    });
    fonte = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  try {
    if (!w || !h) throw new Error("abrir");
    const escala = Math.min(1, LADO_MAXIMO / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * escala);
    canvas.height = Math.round(h * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) throw new Error("gerar");
    return { arquivo: new File([blob], "receita.jpg", { type: "image/jpeg" }), previa: await lerComoTexto(blob) };
  } finally {
    fechar();
  }
}

/** O aparelho consegue mandar o arquivo direto para o WhatsApp pela folha de compartilhar? */
export function podeCompartilhar(arquivo: File): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [arquivo] });
  } catch {
    return false;
  }
}
