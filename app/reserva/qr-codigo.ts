import QRCode from "qrcode";

/** Matriz de módulos do QR code (true = preto), gerada com a biblioteca qrcode (correção de erro M). */
export function qrMatriz(texto: string): boolean[][] {
  const q = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const linhas: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    const linha: boolean[] = [];
    for (let x = 0; x < n; x++) linha.push(Boolean(q.modules.get(x, y)));
    linhas.push(linha);
  }
  return linhas;
}
