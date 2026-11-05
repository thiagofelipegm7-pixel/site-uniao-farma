/** Os 8 departamentos da loja: cada um tem a sua página em /departamentos/<slug>. O slug é o da categoria do catálogo. */
export type Departamento = { slug: string; nome: string; resumo: string };

export const DEPARTAMENTOS: readonly Departamento[] = [
  { slug: "medicamentos", nome: "Medicamentos", resumo: "Medicamentos isentos de prescrição. Leia a bula; em caso de dúvida, fale com o farmacêutico." },
  { slug: "dermocosmeticos", nome: "Dermocosméticos", resumo: "Hidratantes, protetores solares, séruns, águas micelares e cuidados com a pele." },
  { slug: "perfumes", nome: "Perfumes", resumo: "Colônias e body splashes." },
  { slug: "infantil-e-gestante", nome: "Infantil e Gestante", resumo: "Fraldas, lenços umedecidos, higiene do bebê, testes de gravidez e itens para a gestação." },
  { slug: "beleza", nome: "Beleza", resumo: "Cabelos, unhas, depilação e maquiagem." },
  { slug: "cuidado-diario", nome: "Cuidado Diário", resumo: "Higiene pessoal, saúde bucal, absorventes, desodorantes e itens do dia a dia." },
  { slug: "bem-estar", nome: "Bem Estar", resumo: "Suplementos, chás, alimentos e produtos de bem-estar." },
  { slug: "categoria-a-conferir", nome: "Categoria a conferir", resumo: "Itens que ainda estão sem categoria definida." },
] as const;

export function acharDepartamento(slug: string): Departamento | null {
  return DEPARTAMENTOS.find((d) => d.slug === slug) ?? null;
}
