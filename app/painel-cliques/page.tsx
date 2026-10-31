import type { Metadata } from "next";
import { getClickReport } from "../click-counter";
import { CLICK_PANEL_DAYS } from "../click-counter-rules";
import "./painel.css";

// Página interna: protegida por senha no middleware (PAINEL_SENHA), fora do sitemap e noindex.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel de cliques",
  robots: { index: false, follow: false, nocache: true },
};

const STORE_LABEL: Record<string, string> = {
  fatima: "Fátima",
  nacoes_unidas: "Nações Unidas",
  itacolomi: "Itacolomi",
  geral: "Geral (sem loja)",
};

function dayLabel(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

export default async function ClickPanelPage() {
  const report = await getClickReport();
  const whatsapp = report.byButton.find((item) => item.button === "whatsapp")?.total ?? 0;
  const ifood = report.byButton.find((item) => item.button === "ifood")?.total ?? 0;

  return (
    <main className="click-panel">
      <h1>Painel de cliques</h1>
      <p className="click-panel-lead">
        Últimos {CLICK_PANEL_DAYS} dias. Contagem própria do site, sem cookies, sem IP e sem identificar ninguém.
        Bots óbvios ficam de fora. É um número de cliques nos botões, não de pedidos.
      </p>
      {report.storage === "memoria" ? (
        <p className="click-panel-warn">Banco D1 não ligado neste ambiente: contagem só em memória, some ao reiniciar.</p>
      ) : null}

      <section aria-label="Resumo" className="click-panel-cards">
        <div><strong>{report.total}</strong><span>cliques no total</span></div>
        <div><strong>{whatsapp}</strong><span>WhatsApp</span></div>
        <div><strong>{ifood}</strong><span>iFood</span></div>
      </section>

      <section>
        <h2>Por loja</h2>
        <table>
          <thead>
            <tr><th scope="col">Loja</th><th scope="col">WhatsApp</th><th scope="col">iFood</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {report.byStore.map((row) => (
              <tr key={row.store}>
                <th scope="row">{STORE_LABEL[row.store] ?? row.store}</th>
                <td>{row.whatsapp}</td><td>{row.ifood}</td><td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Por dia</h2>
        <table>
          <thead>
            <tr><th scope="col">Dia</th><th scope="col">WhatsApp</th><th scope="col">iFood</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {report.days.map((row) => (
              <tr key={row.day}>
                <th scope="row">{dayLabel(row.day)}</th>
                <td>{row.whatsapp}</td><td>{row.ifood}</td><td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Páginas com mais cliques</h2>
        <table>
          <thead>
            <tr><th scope="col">Página</th><th scope="col">WhatsApp</th><th scope="col">iFood</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {report.byPath.length === 0 ? (
              <tr><td colSpan={4}>Ainda sem cliques.</td></tr>
            ) : (
              report.byPath.map((row) => (
                <tr key={row.path}>
                  <th scope="row">{row.path}</th>
                  <td>{row.whatsapp}</td><td>{row.ifood}</td><td>{row.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
