#!/usr/bin/env python3
"""Sincroniza o catálogo do site com o último envio do PC da loja (Worker dmaster-catalogo).

Fluxo: baixa o export (ou lê --arquivo), valida, roda o mesmo pipeline do export de 31/10
(gerar.py -> categorias_novas.py -> scripts/gerar-assets-catalogo.mjs) e confere o resultado.
Se qualquer conferência falhar, restaura os arquivos como estavam e sai com erro: o site segue com o JSON anterior
(o JSON versionado no repositório é o fallback). Nunca grava token, estoque nem código de barras nos arquivos públicos
(o gerar.py já não grava; aqui só se confere de novo).

Uso:  CATALOGO_READ_TOKEN=... python3 sincronizar.py            (baixa do Worker)
      python3 sincronizar.py --arquivo export.json               (teste local)
      --forcar: ignora só os limites de queda de itens e de variação de preços (para uma mudança grande e consciente)
Saída: linha "mudou=true|false" (também em $GITHUB_OUTPUT) e resumo em $GITHUB_STEP_SUMMARY.
"""
import json, os, shutil, subprocess, sys, tempfile, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DADOS = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")
PUBLICO = os.path.join(RAIZ, "public", "dados", "nacoes")
URL_PADRAO = "https://dmaster-catalogo.thiagofelipegm7.workers.dev/catalogo?loja=itacolomi"
LOJA = "itacolomi"

MIN_ITENS_ORIGEM = 1000          # export bem abaixo do normal (~3400) = algo errado no PC/Worker
MAX_IDADE_HORAS = 36             # o PC envia a cada 3h; mais que isso = PC parado
MIN_FRACAO_COM_PRECO = 0.90      # entre os itens com estoque, quantos têm Pvenda > 0
MIN_FRACAO_ITENS = 0.80          # catálogo novo >= 80% do atual (queda > 20% é recusada)
MAX_SEM_PRECO_SITE = 0.02        # itens do catálogo sem preço (acima do que já havia)
MAX_FRACAO_PRECOS_ALTERADOS = 0.25  # mais que isso de itens com preço diferente = recusa (reajuste em massa precisa de olho humano)
CAMPOS_PROIBIDOS = {"Estoque", "estoque", "CodigoDeBarras", "codigoDeBarras", "ean", "EAN", "token", "Token", "Desconto"}
ARQUIVOS_META = ("catalogo-nacoes.json", "receita-nacoes.json")


class Recusa(Exception):
    """Dados inválidos ou suspeitos: não publicar."""


def analisar_data(texto):
    """Aceita 'AAAA-MM-DDTHH:MM:SS' (hora local do PC, UTC-3) ou com Z/offset."""
    if not isinstance(texto, str):
        return None
    try:
        d = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone(timedelta(hours=-3)))


def validar_origem(dados, agora=None):
    """Confere o export do PC. Levanta Recusa com o motivo."""
    agora = agora or datetime.now(timezone.utc)
    if not isinstance(dados, dict) or not isinstance(dados.get("itens"), list):
        raise Recusa("export sem lista de itens")
    if dados.get("loja") != LOJA:
        raise Recusa(f"loja inesperada: {dados.get('loja')!r}")
    itens = dados["itens"]
    if len(itens) < MIN_ITENS_ORIGEM:
        raise Recusa(f"export com só {len(itens)} itens (mínimo {MIN_ITENS_ORIGEM})")
    for i, it in enumerate(itens[:200] + itens[-200:]):
        if not isinstance(it, dict) or not all(k in it for k in ("CodigoDeBarras", "Produto", "Pvenda", "Estoque", "Classe")):
            raise Recusa("itens do export sem os campos esperados")
    gerado = analisar_data(dados.get("geradoEm"))
    if gerado is None:
        raise Recusa("geradoEm ausente ou inválido")
    recebido = analisar_data(dados.get("recebidoEm")) or gerado
    idade = agora - recebido
    if idade > timedelta(hours=MAX_IDADE_HORAS):
        raise Recusa(f"último envio do PC é de {recebido.isoformat()} (há mais de {MAX_IDADE_HORAS}h): o PC parou de enviar?")
    if gerado.astimezone(timezone.utc) > agora + timedelta(hours=1):
        raise Recusa("geradoEm no futuro")
    com_estoque = [it for it in itens if isinstance(it.get("Estoque"), (int, float)) and it["Estoque"] > 0]
    if not com_estoque:
        raise Recusa("nenhum item com estoque")
    com_preco = sum(1 for it in com_estoque if isinstance(it.get("Pvenda"), (int, float)) and it["Pvenda"] > 0)
    if com_preco / len(com_estoque) < MIN_FRACAO_COM_PRECO:
        raise Recusa(f"só {com_preco} de {len(com_estoque)} itens com estoque têm preço")
    return gerado


def _precos(catalogo):
    return {i["nome"]: i.get("preco") for i in catalogo["itens"]}


def total_restritos(rx):
    return len(rx["receita"]) + len(rx["controlados"]) + len(rx["consulte"])


def validar_saida(cat_antigo, rx_antigo, cat_novo, rx_novo, forcar=False):
    """Compara o catálogo gerado com o atual. Levanta Recusa com o motivo."""
    n = len(cat_novo["itens"])
    if n == 0:
        raise Recusa("catálogo gerado vazio")
    sem_preco = sum(1 for i in cat_novo["itens"] if not (isinstance(i.get("preco"), (int, float)) and i["preco"] > 0))
    sem_preco_antes = sum(1 for i in cat_antigo["itens"] if not (isinstance(i.get("preco"), (int, float)) and i["preco"] > 0))
    if sem_preco / n > MAX_SEM_PRECO_SITE + sem_preco_antes / max(1, len(cat_antigo["itens"])):
        raise Recusa(f"{sem_preco} de {n} itens do catálogo sem preço")
    for lista in ("receita", "controlados", "consulte"):
        if not rx_novo[lista]:
            raise Recusa(f"lista '{lista}' ficou vazia")
    for i in cat_novo["itens"]:
        if i.get("categoria") in (None, ""):
            raise Recusa(f"item sem categoria: {i.get('nome')}")
        proibidos = CAMPOS_PROIBIDOS & set(i)
        if proibidos:
            raise Recusa(f"campo proibido no catálogo público: {sorted(proibidos)}")
    for lista in ("receita", "controlados", "consulte"):
        for i in rx_novo[lista]:
            proibidos = CAMPOS_PROIBIDOS & set(i)
            if proibidos:
                raise Recusa(f"campo proibido na lista pública: {sorted(proibidos)}")
    if not forcar:
        if n < len(cat_antigo["itens"]) * MIN_FRACAO_ITENS:
            raise Recusa(f"catálogo caiu de {len(cat_antigo['itens'])} para {n} itens (mais de 20%)")
        if total_restritos(rx_novo) < total_restritos(rx_antigo) * MIN_FRACAO_ITENS:
            raise Recusa(f"listas de receita/controlados caíram de {total_restritos(rx_antigo)} para {total_restritos(rx_novo)} (mais de 20%)")
        antes, depois = _precos(cat_antigo), _precos(cat_novo)
        comuns = [k for k in antes if k in depois]
        if comuns:
            mudou = sum(1 for k in comuns if antes[k] != depois[k])
            if mudou / len(comuns) > MAX_FRACAO_PRECOS_ALTERADOS:
                raise Recusa(f"{mudou} de {len(comuns)} preços mudaram de uma vez (limite {int(MAX_FRACAO_PRECOS_ALTERADOS * 100)}%); use --forcar se for um reajuste real")


def sem_data(d):
    return {k: v for k, v in d.items() if k != "geradoEm"}


def mudou_de_verdade(cat_antigo, rx_antigo, cat_novo, rx_novo):
    """True se houve mudança de itens/preços/listas ou se a data dos dados mudou.

    A data (geradoEm) é publicada em /api/catalogo-status e no site, e é o que o monitor usa para saber se o estoque está em dia:
    por isso cada envio novo e válido do PC vira commit, mesmo sem mudança de preço (no máximo 5 por dia)."""
    if sem_data(cat_antigo) != sem_data(cat_novo) or sem_data(rx_antigo) != sem_data(rx_novo):
        return True
    return (cat_antigo.get("geradoEm") or "") != (cat_novo.get("geradoEm") or "")


def ler(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def baixar(url, token):
    if not token:
        raise Recusa("CATALOGO_READ_TOKEN ausente")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json", "User-Agent": "uniao-farma-sync"})
    ultimo = None
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            ultimo = f"HTTP {e.code}"
            if e.code in (401, 403, 404):
                break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            ultimo = type(e).__name__
        import time; time.sleep(5 * (tentativa + 1))
    raise Recusa(f"não consegui baixar o export do Worker ({ultimo})")


def rodar(*cmd):
    r = subprocess.run(cmd, cwd=RAIZ, capture_output=True, text=True)
    if r.returncode != 0:
        raise Recusa(f"falhou: {' '.join(os.path.basename(c) for c in cmd[:2])}: {r.stderr.strip()[-400:]}")
    return r.stdout


def guardar(destino):
    shutil.copytree(DADOS, os.path.join(destino, "dados"), ignore=shutil.ignore_patterns("*.ts"))
    shutil.copytree(PUBLICO, os.path.join(destino, "publico"))


def restaurar(origem):
    for nome in os.listdir(os.path.join(origem, "dados")):
        shutil.copy2(os.path.join(origem, "dados", nome), os.path.join(DADOS, nome))
    shutil.rmtree(PUBLICO)
    shutil.copytree(os.path.join(origem, "publico"), PUBLICO)


def saida_github(chave, valor):
    print(f"{chave}={valor}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"{chave}={valor}\n")


def anotar(nivel, titulo, texto):
    """Anotação do GitHub Actions (vira linha na página da execução e no painel /interno/catalogo, que lê pela API pública)."""
    if os.environ.get("GITHUB_ACTIONS"):
        msg = str(texto).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")[:600]
        print(f"::{nivel} title={titulo}::{msg}")


def resumo(texto):
    print(texto)
    anotar("notice", "Catálogo", texto)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(texto + "\n\n")


def main(argv):
    forcar = "--forcar" in argv
    arquivo = argv[argv.index("--arquivo") + 1] if "--arquivo" in argv else None
    origem = ler(arquivo) if arquivo else baixar(os.environ.get("CATALOGO_URL", URL_PADRAO), os.environ.get("CATALOGO_READ_TOKEN", "").strip())
    gerado = validar_origem(origem)
    cat_antigo, rx_antigo = ler(os.path.join(DADOS, "catalogo-nacoes.json")), ler(os.path.join(DADOS, "receita-nacoes.json"))
    antigo_gerado = analisar_data(cat_antigo.get("geradoEm"))
    if antigo_gerado and gerado <= antigo_gerado:
        resumo(f"Sem novidade: o envio do PC ({origem['geradoEm']}) não é mais novo que o catálogo do site ({cat_antigo['geradoEm']}).")
        saida_github("mudou", "false")
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        guardar(tmp)
        try:
            export = os.path.join(tmp, "export.json")
            with open(export, "w", encoding="utf-8") as f:
                json.dump({"geradoEm": origem["geradoEm"], "itens": origem["itens"]}, f, ensure_ascii=False)
            for sub in ("catalogo", "restritos"):
                shutil.rmtree(os.path.join(PUBLICO, sub), ignore_errors=True)  # páginas antigas que não existem mais não ficam para trás
            rodar(sys.executable, os.path.join(AQUI, "gerar.py"), export, "--sem-csv")
            rodar(sys.executable, os.path.join(AQUI, "categorias_novas.py"))
            rodar("node", os.path.join(RAIZ, "scripts", "gerar-assets-catalogo.mjs"))
            cat_novo, rx_novo = ler(os.path.join(DADOS, "catalogo-nacoes.json")), ler(os.path.join(DADOS, "receita-nacoes.json"))
            validar_saida(cat_antigo, rx_antigo, cat_novo, rx_novo, forcar)
        except Recusa:
            restaurar(tmp)
            raise
        if not mudou_de_verdade(cat_antigo, rx_antigo, cat_novo, rx_novo):
            restaurar(tmp)
            resumo(f"Sem mudanças nos itens, preços ou listas desde {cat_antigo['geradoEm']}.")
            saida_github("mudou", "false")
            return 0
    antes, depois = _precos(cat_antigo), _precos(cat_novo)
    resumo(
        f"Catálogo atualizado com os dados de {cat_novo['geradoEm']}: {len(cat_antigo['itens'])} → {len(cat_novo['itens'])} itens sem receita, "
        f"{total_restritos(rx_antigo)} → {total_restritos(rx_novo)} nas listas de receita/controlados/consulte; "
        f"{sum(1 for k in antes if k in depois and antes[k] != depois[k])} preços alterados, {len(set(depois) - set(antes))} itens novos, {len(set(antes) - set(depois))} fora."
    )
    conferir = [i["nome"] for i in cat_novo["itens"] if i.get("categoria") == "Categoria a conferir"]
    if conferir:
        resumo(f"{len(conferir)} item(ns) novo(s) sem categoria definida (ficam só na busca até entrarem em AJUSTES de categorias_novas.py): " + "; ".join(conferir[:20]))
    saida_github("mudou", "true")
    saida_github("dados_de", cat_novo["geradoEm"])
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Recusa as e:
        print(f"RECUSADO: {e}", file=sys.stderr)
        anotar("error", "Atualização recusada", e)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
                f.write(f"**Atualização recusada (o site segue com o catálogo anterior):** {e}\n")
        sys.exit(1)
    except Exception as e:  # erro inesperado: também aparece no painel, e nada é publicado
        print(f"ERRO: {type(e).__name__}: {e}", file=sys.stderr)
        anotar("error", "Erro inesperado na sincronização", f"{type(e).__name__}: {e}")
        sys.exit(1)
