"use client";

export default function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#conteudo"
      onClick={(event) => {
        const main = document.getElementById("conteudo");
        if (!main) return;
        event.preventDefault();
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView({ block: "start" });
      }}
    >
      Ir para o conteúdo
    </a>
  );
}
