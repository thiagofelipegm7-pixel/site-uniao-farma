/**
 * As vitrines de produtos da home (ordem, título e filtro). Fonte única: a página (servidor) usa esta lista para montar os produtos
 * no HTML e o `HomePage` usa a mesma lista para desenhar as seções. Assim o conteúdo já chega pronto para quem não executa JavaScript
 * (robôs de IA, S-24 de SEO-IA.md) e a página não "pula" quando os produtos chegam (S-25).
 * Módulo sem código de servidor: pode ser importado por componentes do navegador.
 */
export type VitrineHome = {
  /** Ordem na página: cada vitrine não repete produto das anteriores. */
  posicao: number;
  id: string;
  titulo: string;
  grupo?: string;
  lab?: string;
  /** Preço máximo em centavos. */
  ate?: number;
  ordem?: "conversao";
  /** Menos itens que isto e a vitrine não aparece. */
  minimo?: number;
  n: number;
  source: string;
};

export const VITRINES_HOME: readonly VitrineHome[] = [
  { posicao: 0, id: "vitrine-mais-pedidos", titulo: "Mais pedidos", ordem: "conversao", minimo: 4, n: 12, source: "home_mais_pedidos" },
  { posicao: 1, id: "vitrine-higiene", titulo: "Cuidado Diário", grupo: "cuidado-diario", n: 12, source: "home_higiene" },
  { posicao: 2, id: "vitrine-farmax", titulo: "Farmax", lab: "FARMAX", n: 12, source: "home_farmax" },
  { posicao: 3, id: "vitrine-pele", titulo: "Dermocosméticos", grupo: "dermocosmeticos", n: 12, source: "home_pele" },
  { posicao: 4, id: "vitrine-sem-receita", titulo: "Medicamentos", grupo: "medicamentos", n: 12, source: "home_mips" },
  { posicao: 5, id: "vitrine-suplementos", titulo: "Bem Estar", grupo: "bem-estar", n: 12, source: "home_suplementos" },
  { posicao: 6, id: "vitrine-dove", titulo: "Dove", lab: "DOVE", n: 12, source: "home_dove" },
  { posicao: 7, id: "vitrine-ate-10", titulo: "Até R$ 10,00", ate: 1000, n: 12, source: "home_ate_10" },
];

export function vitrineHome(id: string): VitrineHome {
  const v = VITRINES_HOME.find((x) => x.id === id);
  if (!v) throw new Error(`Vitrine da home desconhecida: ${id}`);
  return v;
}
