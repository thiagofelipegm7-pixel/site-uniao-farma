/**
 * Busca por voz: usa o reconhecimento de fala do próprio navegador (Chrome, Edge, Safari). O áudio vai do aparelho ao serviço do navegador;
 * o site só recebe o texto, que cai no campo de busca como se a pessoa tivesse digitado. Nada de áudio é guardado ou enviado pela União Farma.
 */

/** Tipos mínimos da API (ainda não vêm no TypeScript padrão). */
export type ReconhecimentoFala = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function criarReconhecimento(janela: Window): ReconhecimentoFala | null {
  const w = janela as unknown as { SpeechRecognition?: new () => ReconhecimentoFala; webkitSpeechRecognition?: new () => ReconhecimentoFala };
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

/** Texto falado pronto para o campo: sem ponto final nem espaços sobrando, no máximo 80 letras (o tamanho que a busca aceita). */
export function limparFala(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().replace(/[.!?,;:]+$/g, "").trim().slice(0, 80);
}

/** Mensagem para quem toca no microfone e algo não deu certo. */
export function mensagemDeErroDeFala(erro: string): string {
  if (erro === "not-allowed" || erro === "service-not-allowed") return "Permita o microfone no navegador para buscar falando.";
  if (erro === "no-speech") return "Não ouvi nada. Toque no microfone e fale de novo.";
  if (erro === "audio-capture") return "Não encontrei o microfone neste aparelho.";
  if (erro === "network") return "Sem conexão para entender a fala. Digite a busca.";
  if (erro === "aborted") return "";
  return "Não consegui entender. Digite a busca.";
}
