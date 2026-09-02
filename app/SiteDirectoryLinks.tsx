const SITE_DIRECTORY_LINKS = [
  { href: "/", label: "Início" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/receita", label: "Enviar receita" },
  { href: "/novidades", label: "Novidades" },
  { href: "/farmacia-em-sabara", label: "Farmácia em Sabará" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega em Sabará" },
  { href: "/perfumaria-em-sabara", label: "Perfumaria em Sabará" },
  { href: "/unidades/nossa-senhora-de-fatima", label: "Unidade Fátima" },
  { href: "/unidades/nacoes-unidas", label: "Unidade Nações Unidas" },
  { href: "/unidades/itacolomi", label: "Unidade Itacolomi" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

export function SiteDirectoryLinks() {
  return (
    <>
      {SITE_DIRECTORY_LINKS.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </>
  );
}
