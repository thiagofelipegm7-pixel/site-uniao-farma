/** Departamentos da loja. Só os não provisórios têm página/link público em /departamentos/<slug>. */
export type Departamento = {
  slug: string;
  nome: string;
  resumo: string;
  /** Interno: não gera menu, carrossel, sitemap, link nem página pública. Itens vão para a categoria definitiva. */
  provisorio?: boolean;
};

export const DEPARTAMENTOS: readonly Departamento[] = [
  { slug: "medicamentos", nome: "Medicamentos", resumo: "Todos os medicamentos da loja: sem receita (com cesta) e, em lista de preços, com receita e controlados. Leia a bula; em caso de dúvida, fale com o farmacêutico." },
  { slug: "dermocosmeticos", nome: "Dermocosméticos", resumo: "Hidratantes, protetores solares, séruns, águas micelares e cuidados com a pele." },
  { slug: "perfumes", nome: "Perfumes", resumo: "Colônias e body splashes." },
  { slug: "infantil-e-gestante", nome: "Infantil e Gestante", resumo: "Fraldas, lenços umedecidos, higiene do bebê, testes de gravidez e itens para a gestação." },
  { slug: "beleza", nome: "Beleza", resumo: "Cabelos, unhas, depilação e maquiagem." },
  { slug: "cuidado-diario", nome: "Cuidado Diário", resumo: "Higiene pessoal, saúde bucal, absorventes, desodorantes e itens do dia a dia." },
  { slug: "bem-estar", nome: "Bem Estar", resumo: "Suplementos, chás, alimentos e produtos de bem-estar." },
  // Mantido só para alinhar CATEGORIAS_ORDEM / ops; nunca aparece no site.
  { slug: "categoria-a-conferir", nome: "Categoria a conferir", resumo: "Itens que ainda estão sem categoria definida.", provisorio: true },
] as const;

export function acharDepartamento(slug: string): Departamento | null {
  return DEPARTAMENTOS.find((d) => d.slug === slug) ?? null;
}

/** Departamentos com página e links públicos (exclui provisórios como "a conferir"). */
export function departamentosPublicos(): readonly Departamento[] {
  return DEPARTAMENTOS.filter((d) => !d.provisorio);
}
