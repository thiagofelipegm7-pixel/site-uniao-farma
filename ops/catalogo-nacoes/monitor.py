#!/usr/bin/env python3
"""Monitor do estoque do site (roda no GitHub Actions: catalogo-monitor.yml).

Confere três pontos da cadeia PC -> Worker -> repositório -> site e escreve o relatório em /tmp/monitor-corpo.md.
Regras:
  - Segunda a sábado, das 08h às 21h (Brasília): batimento do PC (heartbeat/delta) com mais de 45 min = problema.
    Conteúdo (geradoEm) pode ficar horas igual se preço/estoque não mudaram — isso NÃO gera alerta.
  - Qualquer horário: a última sincronização no GitHub falhou = problema; o site não publicou o que o repositório já tem = problema.
  - Uma issue por incidente (o workflow atualiza a mesma "Estoque do site desatualizado"; não spamma).
Saída: mantém `problema=true|false` em $GITHUB_OUTPUT. Sempre sai com 0 (quem abre/fecha a issue é o workflow).
Nunca imprime token, estoque nem código de barras.
"""
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

BRT = timezone(timedelta(hours=-3))
LIMITE_BATIMENTO_MIN = 45
ATRASO_DEPLOY_MIN = 30
SITE = "https://xn--uniofarmasabar-8gbu.com.br"
WORKER = "https://dmaster-catalogo.thiagofelipegm7.workers.dev/catalogo?loja=itacolomi"
ARQ_CATALOGO = "app/nacoes-unidas/produtos/dados/catalogo-nacoes.json"


def em_expediente(agora):
    b = agora.astimezone(BRT)
    return 0 <= b.weekday() <= 5 and 8 <= b.hour + b.minute / 60 < 21


def instante(s, fuso=BRT):
    if not s:
        return None
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=fuso)


def horas(agora, quando):
    return None if quando is None else max(0.0, (agora - quando).total_seconds() / 3600)


def fmt(h):
    return "desconhecida" if h is None else (f"{h * 60:.0f} min" if h < 1 else f"{h:.1f} h")


def avaliar(agora, worker, repo_gerado, site_gerado, commit_dados, ultima_execucao):
    """worker: dict com batimentoEm/recebidoEm/geradoEm ou None. Demais: strings ISO / datetime."""
    problemas = []
    dentro = em_expediente(agora)
    bat = (worker or {}).get("batimentoEm") or (worker or {}).get("recebidoEm")
    h_bat = horas(agora, instante(bat, timezone.utc))
    h_site = horas(agora, instante(site_gerado))
    limite_h = LIMITE_BATIMENTO_MIN / 60.0

    if worker is None:
        problemas.append("Não consegui consultar o Worker dmaster-catalogo (token inválido ou Worker fora do ar).")
    if ultima_execucao and ultima_execucao.get("conclusao") in ("failure", "timed_out", "startup_failure"):
        problemas.append(f"A última sincronização terminou com **{ultima_execucao['conclusao']}**: {ultima_execucao.get('url', '')}")
    if dentro:
        if h_bat is not None and h_bat > limite_h:
            problemas.append(
                f"O PC da loja (TERMINAL02) não manda batimento há **{fmt(h_bat)}** "
                f"(limite {LIMITE_BATIMENTO_MIN} min no expediente 8h–21h). "
                r"Confira a tarefa UniaoFarma_Catalogo_Sync e o sync.log em C:\ProgramData\UniaoFarmaSync."
            )
        elif worker and worker.get("geradoEm") and repo_gerado:
            wg = instante(worker.get("geradoEm"))
            rg = instante(repo_gerado)
            if wg and rg and wg > rg + timedelta(minutes=20):
                problemas.append(
                    f"O Worker já tem dados de {worker.get('geradoEm')}, mas o repositório ainda está em {repo_gerado}: "
                    "a sincronização do site atrasou. Veja o workflow catalogo-sync."
                )
    if repo_gerado and site_gerado and instante(repo_gerado) != instante(site_gerado):
        atraso = horas(agora, commit_dados)
        if atraso is None or atraso * 60 > ATRASO_DEPLOY_MIN:
            problemas.append(
                f"O repositório tem dados de {repo_gerado}, mas o site publicado ainda mostra {site_gerado} "
                f"(idade {fmt(h_site)}). Confira o deploy (Workers Builds)."
            )
    elif not site_gerado:
        problemas.append("Não consegui ler a data dos dados no site publicado.")
    return problemas


def baixar_json(url, token=None):
    cab = {"User-Agent": "uniao-farma-monitor", "Accept": "application/json"}
    if token:
        cab["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=cab), timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    agora = datetime.now(timezone.utc)
    token = os.environ.get("CATALOGO_READ_TOKEN", "").strip()
    try:
        w = baixar_json(WORKER, token)
        worker = {
            "recebidoEm": w.get("recebidoEm"),
            "batimentoEm": w.get("batimentoEm"),
            "geradoEm": w.get("geradoEm"),
            "mudancaEm": w.get("mudancaEm"),
        }
    except Exception as e:
        print(f"Worker inacessível: {type(e).__name__}", file=sys.stderr)
        worker = None
    with open(ARQ_CATALOGO, encoding="utf-8") as f:
        repo_gerado = json.load(f).get("geradoEm")
    try:
        site_gerado = baixar_json(f"{SITE}/dados/nacoes/catalogo-index.json?nc={int(agora.timestamp())}").get("geradoEm")
    except Exception as e:
        print(f"Site inacessível: {type(e).__name__}", file=sys.stderr)
        site_gerado = None
    try:
        ts = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", ARQ_CATALOGO],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        commit_dados = datetime.fromtimestamp(int(ts), timezone.utc)
    except Exception:
        commit_dados = None
    ultima = None
    if os.environ.get("RUN_CONCLUSAO"):
        ultima = {"conclusao": os.environ["RUN_CONCLUSAO"], "url": os.environ.get("RUN_URL", "")}

    problemas = avaliar(agora, worker, repo_gerado, site_gerado, commit_dados, ultima)
    linhas = [
        f"Verificado em {agora.astimezone(BRT):%d/%m/%Y %H:%M} (Brasília).",
        "",
        f"- Último batimento do PC: {(worker or {}).get('batimentoEm') or (worker or {}).get('recebidoEm') or 'indisponível'}",
        f"- Última mudança de conteúdo (Worker): {(worker or {}).get('geradoEm') or 'indisponível'}",
        f"- Dados no repositório: {repo_gerado}",
        f"- Dados no site publicado: {site_gerado}",
        f"- Dentro do expediente (seg-sáb, 8h-21h): {'sim' if em_expediente(agora) else 'não'}",
        "",
    ]
    if problemas:
        linhas += ["**Problemas encontrados:**", ""] + [f"- {p}" for p in problemas]
        linhas += [
            "",
            "Painel: " + SITE + "/interno/catalogo",
            "Execuções: https://github.com/thiagofelipegm7-pixel/site-uniao-farma/actions/workflows/catalogo-sync.yml",
        ]
    else:
        linhas.append("Tudo em dia.")
    corpo = "\n".join(linhas) + "\n"
    with open("/tmp/monitor-corpo.md", "w", encoding="utf-8") as f:
        f.write(corpo)
    print(corpo)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"problema={'true' if problemas else 'false'}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
