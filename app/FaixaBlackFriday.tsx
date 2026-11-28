/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

/**
 * Faixa da Black Friday. Fica no HTML sempre, mas só aparece com o tema ligado (`html[data-tema="black-friday"]`).
 * Texto sem data de fim (campanha segue por tempo limitado, ou enquanto durarem os estoques): nada de desconto inventado (L-1, CDC).
 * CTA diz o que a pessoa recebe (C-10).
 */
export default function FaixaBlackFriday() {
  return (
    <aside className="faixa-black-friday" aria-label="Black Friday União Farma">
      <p>
        <strong>Black Friday União Farma</strong>
        <span>Ofertas por tempo limitado, ou enquanto durarem os estoques.</span>
      </p>
      <a href="/ofertas">Ver as ofertas</a>
    </aside>
  );
}
