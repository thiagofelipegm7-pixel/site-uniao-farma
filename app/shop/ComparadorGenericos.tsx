"use client";

export default function ComparadorGenericos({ nome }: { nome: string }) {
  const ehGenerico = /gen[eé]rico/i.test(nome);
  if (ehGenerico) return null;

  return (
    <a
      href={`/nacoes-unidas/produtos?q=${encodeURIComponent(nome.split(" ")[0] + " genérico")}`}
      style={{
        display: "inline-block",
        marginTop: "0.5rem",
        padding: "0.3rem 0.6rem",
        background: "#fff8e1",
        borderRadius: "6px",
        fontSize: "0.75rem",
        color: "#f57c00",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      Ver genérico
    </a>
  );
}
