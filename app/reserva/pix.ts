/**
 * Código Pix "copia e cola" (BR Code estático). A chave vem da variável VITE_PIX_CHAVE:
 * sem ela, a tela mostra o aviso de "chave não configurada" e nenhum código é gerado.
 */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function chavePixConfigurada(): string | null {
  const chave = (import.meta.env.VITE_PIX_CHAVE as string | undefined)?.trim();
  return chave ? chave : null;
}

/** Valor em centavos vira o campo 54 do BR Code (ex.: 2380 -> "23.80"); txid vira o campo 62/05 (identificador do pedido). */
export function codigoPixCopiaECola(chave: string, nome: string, cidade: string, valorCentavos?: number, txid?: string): string {
  const valor = valorCentavos && valorCentavos > 0 ? campo("54", (valorCentavos / 100).toFixed(2)) : "";
  const tx = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const base =
    campo("00", "01") +
    campo("01", "11") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    valor +
    campo("58", "BR") +
    campo("59", nome.slice(0, 25)) +
    campo("60", cidade.slice(0, 15)) +
    campo("62", campo("05", tx)) +
    "6304";
  return base + crc16(base);
}
