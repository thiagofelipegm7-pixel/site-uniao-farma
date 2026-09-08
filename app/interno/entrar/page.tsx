import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar na área interna",
  robots: { index: false, follow: false },
};

export default function StaffLoginPage({
  searchParams,
}: {
  searchParams: { erro?: string; next?: string };
}) {
  const nextPath = searchParams.next?.startsWith("/interno")
    ? searchParams.next
    : "/interno/metricas";

  return (
    <main className="legal-page">
      <div className="legal-container" style={{ maxWidth: 420 }}>
        <p className="section-kicker">Equipe</p>
        <h1>Entrar</h1>
        <p>Use o usuário e a senha da loja para ver as métricas.</p>
        {searchParams.erro ? <p>Usuário ou senha não conferem.</p> : null}
        <form action="/api/interno/login" method="post" style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Usuário
            <input name="user" autoComplete="username" defaultValue="uniao" required />
          </label>
          <label>
            Senha
            <input name="pass" type="password" autoComplete="current-password" required />
          </label>
          <button className="button button-whatsapp" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
