"use client";

const categorias = [
  { nome: "Medicamentos", href: "/nacoes-unidas/produtos?grupo=medicamentos" },
  { nome: "Higiene", href: "/nacoes-unidas/produtos?grupo=higiene" },
  { nome: "Bebê", href: "/nacoes-unidas/produtos?grupo=bebe" },
  { nome: "Beleza", href: "/nacoes-unidas/produtos?grupo=beleza" },
  { nome: "Ofertas", href: "/nacoes-unidas/produtos?grupo=ofertas" },
];

export default function CategoriasAtalho() {
  return (
    <div style={{
      display: "flex",
      gap: "0.5rem",
      overflowX: "auto",
      padding: "0.5rem 1rem",
      scrollbarWidth: "none",
    }}>
      {categorias.map((c) => (
        <a
          key={c.nome}
          href={c.href}
          style={{
            flex: "none",
            padding: "0.4rem 0.85rem",
            background: "#e8f7f5",
            color: "#0e7370",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {c.nome}
        </a>
      ))}
    </div>
  );
}
