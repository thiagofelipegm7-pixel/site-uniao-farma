/**
 * Pedido por sintoma ("dor de cabeça", "febre"): a busca mostra os medicamentos SEM RECEITA que a loja tem e que as pessoas costumam
 * procurar para isso. É uma lista fixa e curta, escrita por gente (não pela IA), com aviso de bula e de farmacêutico na tela.
 * Receita, controlado e antimicrobiano nunca entram: só o que o catálogo público já vende sem receita. Revisão do responsável técnico recomendada.
 */
/** `comReceita`: a loja trata estes produtos como "sob receita"; aparecem como cartão restrito (sem preço, sem cesta), como em qualquer busca por nome. */
export type SintomaOTC = { rotulo: string; padrao: RegExp; termos: readonly string[]; comReceita?: boolean };

export const SINTOMAS_OTC: readonly SintomaOTC[] = [
  { rotulo: "dor de cabeça", padrao: /\b(dor(es)?\s+(de|na|da)\s+cabeca|cefaleia|enxaqueca)\b/, termos: ["dipirona", "paracetamol", "ibuprofeno"] },
  { rotulo: "febre", padrao: /\bfebre\b/, termos: ["dipirona", "paracetamol"] },
  { rotulo: "dor no corpo ou muscular", padrao: /\b(dor(es)?\s+(no|nas|nos|de|na)\s+(corpo|costas|musculo|musculos|coluna|pescoco)|torcicolo|dor muscular)\b/, termos: ["dorflex", "dipirona", "paracetamol"] },
  { rotulo: "dor de garganta", padrao: /\b(dor\s+(de|na)\s+garganta|garganta\s+inflamada)\b/, termos: ["strepsils", "garganta"] },
  { rotulo: "cólica", padrao: /\bcolicas?\b/, termos: ["buscopan", "dipirona"] },
  { rotulo: "azia e má digestão", padrao: /\b(azia|queimacao|ma digestao|estomago)\b/, termos: ["sal de fruta"] },
  { rotulo: "gases", padrao: /\b(gases?|barriga inchada|estufamento)\b/, termos: ["simeticona", "luftal"] },
  { rotulo: "alergia", padrao: /\b(alergia|alergico|coceira|espirro)\b/, termos: ["loratadina"] },
  { rotulo: "gripe e resfriado", padrao: /\b(gripe|resfriado|coriza|nariz entupido)\b/, termos: ["cimegripe", "benegrip"] },
  { rotulo: "assadura de bebê", padrao: /\bassaduras?\b/, termos: ["hipoglos", "bepantol"] },
  // Contracepção de emergência: a pessoa digita o nome popular; a loja tem estes produtos (cadastrados como sob receita).
  { rotulo: "pílula do dia seguinte", padrao: /\bpilulas?\s+(do\s+)?(dia\s+)?(seguinte|depois)\b|\bpilulas?\s+de\s+emergencia\b|\bdia\s+seguinte\b/, termos: ["hora h uno", "poslov", "neodia", "saya control", "pilem"], comReceita: true },
  { rotulo: "pílula", padrao: /\bpilulas?\b|\banticoncepcion(al|ais)\b/, termos: ["ciclo 21", "level", "microvlar", "neovlar", "nordette", "triquilar", "hora h uno", "poslov", "neodia", "saya control", "pilem"], comReceita: true },
];

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Sintoma conhecido na busca digitada, com as buscas de medicamentos sem receita que ele abre. Null se não reconhecer. */
export function sintomaConhecido(consulta: string): SintomaOTC | null {
  const t = semAcento(consulta);
  return SINTOMAS_OTC.find((s) => s.padrao.test(t)) ?? null;
}
