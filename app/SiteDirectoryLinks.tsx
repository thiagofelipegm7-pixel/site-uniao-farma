const SITE_DIRECTORY_LINKS = [
  { href: "/", label: "Início" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/encarte", label: "Encarte" },
  { href: "/perguntas", label: "Perguntas" },
  { href: "/receita", label: "Enviar receita" },
  { href: "/novidades", label: "Novidades" },
  { href: "/fatima", label: "Farmácia em Fátima" },
  { href: "/nacoes-unidas", label: "Farmácia em Nações Unidas" },
  { href: "/itacolomi", label: "Farmácia no Itacolomi" },
  { href: "/farmacia-em-sabara", label: "Farmácia em Sabará" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega em Sabará" },
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
