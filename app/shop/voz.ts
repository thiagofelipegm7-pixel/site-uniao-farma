/** Busca por voz: ajudantes puros (testáveis sem navegador). O reconhecimento em si é do navegador (Web Speech API), sem custo no servidor. */

/** Código de erro do reconhecimento → aviso curto, em português, que diz o que fazer. null = não avisar. */
export function avisoDeErroVoz(codigo: string): string | null {
  switch (codigo) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "Microfone bloqueado. Libere o microfone nas configurações do navegador para usar a voz.";
    case "no-speech":
      return "Não ouvi nada. Toque no microfone e fale de novo.";
    case "audio-capture":
      return "Não encontrei um microfone neste aparelho.";
    case "network":
      return "Sem conexão para entender a voz. Digite sua busca.";
    case "language-not-supported":
      return "Este navegador não entende português por voz. Digite sua busca.";
    default:
      return "Não consegui entender. Tente de novo ou digite sua busca.";
  }
}

export const AVISO_SEM_RESULTADO_VOZ = "Não entendi. Toque no microfone e fale de novo.";

/** Texto falado → termo de busca: sem pontuação nas pontas, sem espaços repetidos, no máximo 80 caracteres. */
export function limparTranscricao(bruto: string): string {
  return bruto
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?¿¡…-]+|[\s.,;:!?¿¡…-]+$/g, "")
    .slice(0, 80)
    .trim();
}

type ConstrutorVoz = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type ReconhecedorVoz = InstanceType<ConstrutorVoz>;

/** O navegador sabe reconhecer voz? (Chrome, Edge, Safari e Samsung Internet sim; Firefox não.) */
export function construtorDeVoz(janela: unknown = typeof window === "undefined" ? undefined : window): ConstrutorVoz | null {
  const j = janela as { SpeechRecognition?: ConstrutorVoz; webkitSpeechRecognition?: ConstrutorVoz } | undefined;
  return j?.SpeechRecognition ?? j?.webkitSpeechRecognition ?? null;
}
