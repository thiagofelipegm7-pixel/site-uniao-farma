import type { Metadata } from "next";
import "../../metrics-polish.css";

export const metadata: Metadata = {
  title: "Entrar na área interna",
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/interno") ? params.next : "/interno/metricas";

  return (
    <main className="staff-login-page">
      <div className="staff-login-card">
        <p className="eyebrow">Equipe</p>
        <h1>Entrar</h1>
        <p className="metrics-lead">Use o usuário e a senha da loja para ver as métricas.</p>
        {params.erro ? <p className="metrics-error">Usuário ou senha não conferem.</p> : null}
        <form action="/api/interno/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Usuário
            <input name="user" autoComplete="username" defaultValue="uniao" required />
          </label>
          <label>
            Senha
            <input name="pass" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
