import type { Metadata } from "next";
import CampoSenha from "./CampoSenha";
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
    <div className="staff-login-page">
      <div className="staff-login-card">
        <h1>Entrar</h1>
        {params.erro ? <p className="metrics-error" role="alert">Usuário ou senha não conferem. Confira se o Caps Lock está desligado e tente novamente.</p> : null}
        <form action="/api/interno/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Usuário
            <input name="user" autoComplete="username" required />
          </label>
          <CampoSenha />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
