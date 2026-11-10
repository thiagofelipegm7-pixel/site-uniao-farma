#!/usr/bin/env python3
"""Aplica as exclusões feitas no painel interno ("Excluir produto").

Lê produtos-removidos.json (lista de nomes normalizados) e tira esses itens do catalogo-nacoes.json e das listas
de receita/controlados/consulte. O produto continua no sistema da loja: só deixa de aparecer no site. Para devolver,
a equipe restaura no painel e ele volta na próxima sincronização (o gerar.py recria tudo a partir do export).
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DADOS = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()


def ler(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def gravar(path, dados):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))


def aplicar(dados_dir: str, removidos) -> dict:
    chaves = {norm(c) for c in removidos if isinstance(c, str) and c.strip()}
    cat_path = os.path.join(dados_dir, "catalogo-nacoes.json")
    rx_path = os.path.join(dados_dir, "receita-nacoes.json")
    cat, rx = ler(cat_path), ler(rx_path)
    cont = {"tirados": 0}

    def sem(lista):
        saida = []
        for i in lista or []:
            if norm(i.get("nome", "")) in chaves:
                cont["tirados"] += 1
            else:
                saida.append(i)
        return saida

    cat["itens"] = sem(cat.get("itens"))
    for lista in ("receita", "controlados", "consulte"):
        rx[lista] = sem(rx.get(lista))
    cat["total"] = len(cat["itens"])
    rx["totalReceita"], rx["totalControlados"], rx["totalConsulte"] = len(rx["receita"]), len(rx["controlados"]), len(rx["consulte"])
    gravar(cat_path, cat)
    gravar(rx_path, rx)
    return cont


def main(argv):
    dados = argv[1] if len(argv) > 1 else DADOS
    arq = os.path.join(dados, "produtos-removidos.json")
    if not os.path.exists(arq):
        print("aplicar_removidos: sem exclusões")
        return 0
    removidos = ler(arq)
    if not isinstance(removidos, list) or not removidos:
        print("aplicar_removidos: lista vazia")
        return 0
    cont = aplicar(dados, removidos)
    print(f"aplicar_removidos: tirados={cont['tirados']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
