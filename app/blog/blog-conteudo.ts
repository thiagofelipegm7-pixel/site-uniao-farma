/**
 * Artigos do blog da União Farma. Cada artigo entra aqui como dado.
 * Só aparece no site o que tem `publicado: true`: os rascunhos ficam fora até uma revisão (conteúdo de saúde
 * precisa ser revisado por farmacêutico antes de publicar).
 */

export const TEMAS = [
  { slug: "saude", nome: "Saúde" },
  { slug: "medicamentos", nome: "Medicamentos" },
  { slug: "alimentacao", nome: "Alimentação" },
  { slug: "atividade-fisica", nome: "Atividade física" },
  { slug: "beleza", nome: "Beleza" },
] as const;

export type Tema = (typeof TEMAS)[number]["slug"];

export type BlocoArtigo =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "titulo"; texto: string };

export type Artigo = {
  slug: string;
  titulo: string;
  resumo: string;
  tema: Tema;
  publicadoEm: string; // AAAA-MM-DD
  publicado: boolean;
  /** Foto do card (caminho em /public). Sem foto, o card mostra o bloco com a etiqueta do tema. */
  imagem?: string;
  corpo: BlocoArtigo[];
};

/**
 * Lista de artigos. Todos são RASCUNHOS (`publicado: false`): para publicar, um farmacêutico revisa o texto
 * e a flag vira `true`.
 */
export const ARTIGOS: Artigo[] = [
  {
    slug: "dor-de-garganta-quando-cuidar-em-casa",
    titulo: "Dor de garganta: quando cuidar em casa e quando procurar o médico",
    resumo: "Os sinais mais comuns, os cuidados que ajudam em casa e os sintomas que pedem consulta.",
    tema: "saude",
    publicadoEm: "2026-11-20",
    publicado: false,
    corpo: [
      { tipo: "paragrafo", texto: "A dor de garganta costuma aparecer com arranhado, dificuldade para engolir e secura. Na maioria das vezes, ela é causada por vírus e melhora sozinha em poucos dias." },
      { tipo: "titulo", texto: "Cuidados que ajudam em casa" },
      { tipo: "paragrafo", texto: "Descansar a voz, beber bastante líquido e manter o ambiente úmido aliviam o desconforto. Água morna com mel pode ajudar em adultos e em crianças maiores de 1 ano. Mel não deve ser dado a bebês com menos de 1 ano." },
      { tipo: "titulo", texto: "Quando procurar o médico" },
      { tipo: "paragrafo", texto: "Procure atendimento se a febre for alta ou durar mais de três dias, se houver dificuldade para engolir a saliva ou para respirar, se aparecerem manchas na pele, ou se os sintomas durarem mais de uma semana ou voltarem com frequência." },
      { tipo: "paragrafo", texto: "Antes de usar qualquer medicamento para dor ou febre, confira a dose com o farmacêutico, principalmente em crianças." },
    ],
  },
  {
    slug: "como-guardar-medicamentos-em-casa",
    titulo: "Como guardar medicamentos em casa",
    resumo: "Onde guardar, o que observar na embalagem e como descartar o que venceu.",
    tema: "medicamentos",
    publicadoEm: "2026-11-20",
    publicado: false,
    corpo: [
      { tipo: "paragrafo", texto: "Guardar os medicamentos do jeito certo mantém a eficácia e evita acidentes, sobretudo com crianças." },
      { tipo: "titulo", texto: "Onde guardar" },
      { tipo: "paragrafo", texto: "Prefira um lugar seco, fresco e longe da luz direta. O banheiro e a cozinha, com vapor e calor, não são bons lugares. Mantenha tudo fora do alcance de crianças e animais de estimação." },
      { tipo: "paragrafo", texto: "Deixe o remédio na embalagem original, com a bula. Ela traz o prazo de validade e as orientações de conservação." },
      { tipo: "titulo", texto: "Medicamentos que vencerem ou sobrarem" },
      { tipo: "paragrafo", texto: "Não jogue remédios no lixo comum nem na pia. Leve-os a uma farmácia ou a um ponto de coleta indicado pela prefeitura." },
    ],
  },
  {
    slug: "cartao-de-vacinas-em-dia",
    titulo: "Cartão de vacinas em dia: por que isso importa em qualquer idade",
    resumo: "Vacinas protegem também adultos e idosos, e o calendário muda conforme a idade e a condição de saúde.",
    tema: "saude",
    publicadoEm: "2026-11-20",
    publicado: false,
    corpo: [
      { tipo: "paragrafo", texto: "A vacinação não é só para crianças. Adultos e idosos também precisam de doses de reforço e de vacinas específicas para a idade e para algumas condições de saúde." },
      { tipo: "titulo", texto: "Como saber o que está em dia" },
      { tipo: "paragrafo", texto: "Confira a caderneta ou o cartão de vacinas e compare com o calendário vacinal do Ministério da Saúde. Em caso de dúvida, o médico ou a unidade de saúde indicam o que falta." },
      { tipo: "titulo", texto: "Antes de se vacinar" },
      { tipo: "paragrafo", texto: "Informe ao profissional sobre gravidez, alergias e medicamentos em uso. Ele orienta sobre o intervalo entre as doses e os cuidados depois da aplicação." },
    ],
  },
];

export function artigosPublicados(): Artigo[] {
  return ARTIGOS.filter((a) => a.publicado).sort((a, b) => (a.publicadoEm < b.publicadoEm ? 1 : -1));
}

export function artigoPublicado(slug: string): Artigo | undefined {
  return artigosPublicados().find((a) => a.slug === slug);
}

export function nomeDoTema(tema: Tema): string {
  return TEMAS.find((t) => t.slug === tema)?.nome ?? tema;
}

export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
