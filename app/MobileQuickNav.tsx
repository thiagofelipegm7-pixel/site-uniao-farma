import { IntentIcon } from "./IntentIcons";
import "./mobile-buttons.css";

export default function MobileQuickNav() {
  return (
    <nav className="mobile-quick-nav" aria-label="Atalhos do site">
      <a href="/ofertas">Ofertas</a>
      <a className="is-primary" href="/#unidades-rapidas">Unidades</a>
      <a href="/receita">
        <IntentIcon intent="recipe" />
        Receita
      </a>
    </nav>
  );
}
