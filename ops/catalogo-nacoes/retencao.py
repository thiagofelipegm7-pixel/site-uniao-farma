#!/usr/bin/env python3
"""Camadas 1 e 2 de "informações corretas": segura para revisão o que não pode ir ao ar sem uma pessoa conferir.

Roda na sincronização, entre categorias_novas.py e gerar-assets-catalogo.mjs, sobre os JSONs que acabaram de ser gerados.
O que é segurado fica de fora do site (ou mantém o valor que já estava no ar) e entra na fila de revisão
(dados/revisao-pendente.json), que o painel interno mostra. Quem aprova é uma pessoa, e a aprovação fica registrada
(quem, quando, valor antigo e novo) no banco do site; a sincronização baixa as aprovações antes de rodar (aprovacoes.json).

Regras (docs/decisoes-camadas-informacao.md):
  preco_zero      preço zero ou ausente: não publica
  nome_vazio      nome vazio: não publica
  variacao        preço variou mais de 20% de uma vez: mantém o preço que já estava no ar e pede revisão
  pmc             preço acima do teto da CMED (PMC): bloqueia a publicação (ilegal vender acima); override registrado libera
  sem_categoria   produto sem categoria definida ("Categoria a conferir"): não publica
  enquadramento   medicamento na lista "consulte" (enquadramento não confirmado): não publica
Nada aqui grava código de barras nem estoque: a fila só tem nome, laboratório, preços e o motivo.
"""
import json, os, re, sys, unicodedata
from datetime import datetime, timezone

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DADOS = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")
LIMITE_VARIACAO = 0.20
SEM_CATEGORIA = ("", None, "Categoria a conferir")
CATEGORIAS_VALIDAS = {"Medicamentos", "Dermocosméticos", "Perfumes", "Infantil e Gestante", "Beleza", "Cuidado Diário", "Bem Estar"}
ROTULO = {
    "preco_zero": "Preço zero ou ausente",
    "nome_vazio": "Nome vazio",
    "variacao": "Preço variou mais de 20% de uma vez",
    "pmc": "Preço acima do teto da CMED (PMC)",
    "sem_categoria": "Sem categoria definida",
    "enquadramento": "Enquadramento do medicamento não confirmado",
}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()


def chave(nome, lab):
    return norm(nome) + "|" + norm(lab)


def _preco(i):
    p = i.get("preco")
    return float(p) if isinstance(p, (int, float)) and p > 0 else None


def aprovado(aprovacoes, k, tipo, valor=None):
    """Há aprovação registrada para essa chave e esse tipo? Para preço/PMC, vale só para o preço aprovado."""
    a = (aprovacoes or {}).get(k, {}).get(tipo)
    if not a:
        return False
    if tipo in ("variacao", "pmc"):
        return valor is not None and abs(float(a.get("valor", -1)) - float(valor)) < 0.005
    if tipo == "enquadramento":
        return True
    return True


def aplicar(cat_novo, rx_novo, cat_antigo, rx_antigo, pmc_teto, aprovacoes, agora=None):
    """Devolve (catálogo, listas de receita, retidos). Não altera os argumentos de entrada."""
    agora = agora or datetime.now(timezone.utc).isoformat(timespec="seconds")
    cat = json.loads(json.dumps(cat_novo))
    rx = json.loads(json.dumps(rx_novo))
    retidos = []

    antes = {}
    for i in cat_antigo.get("itens", []):
        antes[chave(i.get("nome", ""), i.get("lab", ""))] = _preco(i)
    for lista in ("receita", "controlados", "consulte"):
        for i in rx_antigo.get(lista, []):
            antes.setdefault(chave(i.get("nome", ""), i.get("lab", "")), _preco(i))

    def reter(i, codigo, detalhe, preco_atual=None):
        retidos.append({"chave": chave(i.get("nome", ""), i.get("lab", "")), "nome": i.get("nome", ""), "lab": i.get("lab", ""), "motivo": codigo,
                        "rotulo": ROTULO[codigo], "detalhe": detalhe, "precoNovo": _preco(i), "precoAtual": preco_atual, "desde": agora})

    def filtrar(itens, catalogo):
        saida = []
        for i in itens:
            nome = (i.get("nome") or "").strip()
            k = chave(nome, i.get("lab", ""))
            if not nome:
                reter(i, "nome_vazio", "O estoque trouxe um item sem nome.")
                continue
            preco = _preco(i)
            if preco is None:
                reter(i, "preco_zero", "O estoque trouxe o item sem preço de venda (zero ou vazio).")
                continue
            teto = (pmc_teto or {}).get(k)
            if teto and preco > teto + 0.005 and not aprovado(aprovacoes, k, "pmc", preco):
                reter(i, "pmc", f"Preço R$ {preco:.2f} acima do teto da CMED (R$ {teto:.2f}).", antes.get(k))
                continue
            if catalogo:
                cat_aprov = (aprovacoes or {}).get(k, {}).get("categoria")
                if i.get("categoria") in SEM_CATEGORIA:
                    if cat_aprov and cat_aprov.get("valor") in CATEGORIAS_VALIDAS:
                        i["categoria"] = cat_aprov["valor"]
                    else:
                        reter(i, "sem_categoria", "O motor não achou categoria para este produto.")
                        continue
            antigo = antes.get(k)
            if antigo and abs(preco - antigo) / antigo > LIMITE_VARIACAO and not aprovado(aprovacoes, k, "variacao", preco):
                reter(i, "variacao", f"Preço foi de R$ {antigo:.2f} para R$ {preco:.2f} ({(preco - antigo) / antigo * 100:+.0f}%). Mantido R$ {antigo:.2f} no site.", antigo)
                i["preco"] = antigo
            saida.append(i)
        return saida

    cat["itens"] = filtrar(cat.get("itens", []), True)
    cat["total"] = len(cat["itens"])
    for lista in ("receita", "controlados"):
        rx[lista] = filtrar(rx.get(lista, []), False)
    consulte = []
    for i in filtrar(rx.get("consulte", []), False):
        k = chave(i.get("nome", ""), i.get("lab", ""))
        if aprovado(aprovacoes, k, "enquadramento"):
            consulte.append(i)
        else:
            reter(i, "enquadramento", "Medicamento sem enquadramento confirmado (sem receita, com receita ou controlado).")
    rx["consulte"] = consulte
    rx["totalReceita"], rx["totalControlados"], rx["totalConsulte"] = len(rx["receita"]), len(rx["controlados"]), len(rx["consulte"])
    retidos.sort(key=lambda r: (r["motivo"], r["nome"]))
    return cat, rx, retidos


def _ler(p, padrao):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return padrao


def main(antigo_dir, aprovacoes_path=None):
    """Aplica sobre os arquivos de DADOS recém-gerados; `antigo_dir` tem os arquivos publicados antes (backup da sincronização)."""
    cat_novo = _ler(os.path.join(DADOS, "catalogo-nacoes.json"), None)
    rx_novo = _ler(os.path.join(DADOS, "receita-nacoes.json"), None)
    if not cat_novo or not rx_novo:
        raise SystemExit("catálogo gerado não encontrado")
    cat_antigo = _ler(os.path.join(antigo_dir, "catalogo-nacoes.json"), {"itens": []})
    rx_antigo = _ler(os.path.join(antigo_dir, "receita-nacoes.json"), {})
    pmc = _ler(os.path.join(AQUI, ".pmc-teto.json"), {})
    aprov = _ler(aprovacoes_path or os.path.join(AQUI, "aprovacoes.json"), {})
    cat, rx, retidos = aplicar(cat_novo, rx_novo, cat_antigo, rx_antigo, pmc, aprov)
    for nome, d in (("catalogo-nacoes.json", cat), ("receita-nacoes.json", rx)):
        with open(os.path.join(DADOS, nome), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    anterior = _ler(os.path.join(DADOS, "revisao-pendente.json"), {}).get("itens", [])
    desde = {r["chave"] + "|" + r["motivo"]: r["desde"] for r in anterior}
    for r in retidos:
        r["desde"] = desde.get(r["chave"] + "|" + r["motivo"], r["desde"])
    with open(os.path.join(DADOS, "revisao-pendente.json"), "w", encoding="utf-8") as f:
        json.dump({"geradoEm": cat.get("geradoEm"), "total": len(retidos), "itens": retidos}, f, ensure_ascii=False, separators=(",", ":"))
    por = {}
    for r in retidos:
        por[r["motivo"]] = por.get(r["motivo"], 0) + 1
    print("Retidos para revisão:", por or "nenhum")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
