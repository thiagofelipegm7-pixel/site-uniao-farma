#!/usr/bin/env python3
"""Registro do que mudou no catálogo entre uma sincronização e a seguinte, para o painel interno ("O que mudou").

Só guarda nome, categoria, tipo da mudança e preço (nunca quantidade em estoque nem código de barras).
Tipos: "novo" (entrou à venda), "esgotou" (acabou o estoque ou saiu da lista), "voltou" (estava esgotado e voltou),
"preco" (preço mudou, com o valor antes e depois). Guarda os últimos 14 dias, no máximo 1500 registros.
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from datetime import datetime, timedelta

DIAS = 14
MAX_EVENTOS = 1500
LISTAS_RESTRITAS = ("receita", "controlados", "consulte")


def chave(nome: str) -> str:
    s = unicodedata.normalize("NFKD", nome or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()


def estados(cat: dict, rx: dict) -> dict:
    """chave do nome -> (nome, categoria, esgotado, preço) para tudo o que o site lista, com receita e controlado juntos."""
    saida: dict = {}
    for i in cat.get("itens") or []:
        saida[chave(i.get("nome", ""))] = (i.get("nome", ""), i.get("categoria") or "", bool(i.get("esgotado")), i.get("preco"))
    for lista in LISTAS_RESTRITAS:
        for i in rx.get(lista) or []:
            saida.setdefault(chave(i.get("nome", "")), (i.get("nome", ""), "Medicamentos", False, i.get("preco")))
    return saida


def calcular(cat_antigo: dict, rx_antigo: dict, cat_novo: dict, rx_novo: dict, quando: str) -> list[dict]:
    antes, depois = estados(cat_antigo, rx_antigo), estados(cat_novo, rx_novo)
    eventos: list[dict] = []

    def evento(tipo, nome, categoria, **extra):
        eventos.append({"q": quando, "t": tipo, "n": nome, "c": categoria, **extra})

    for k, (nome, categoria, esgotado, preco) in depois.items():
        antigo = antes.get(k)
        if not esgotado and (antigo is None):
            evento("novo", nome, categoria)
        elif antigo is not None:
            _, _, esgotado_antes, preco_antes = antigo
            if esgotado_antes and not esgotado:
                evento("voltou", nome, categoria)
            elif esgotado and not esgotado_antes:
                evento("esgotou", nome, categoria)
            elif not esgotado and isinstance(preco, (int, float)) and isinstance(preco_antes, (int, float)) and round(preco, 2) != round(preco_antes, 2):
                evento("preco", nome, categoria, de=round(preco_antes, 2), para=round(preco, 2))
    for k, (nome, categoria, esgotado, _) in antes.items():
        if k not in depois and not esgotado:
            evento("esgotou", nome, categoria)
    return eventos


def gravar(caminho: str, novos: list[dict], agora_texto: str) -> int:
    """Junta os novos registros aos que já existem, descarta os com mais de 14 dias e grava. Devolve quantos ficaram."""
    existentes: list[dict] = []
    if os.path.exists(caminho):
        try:
            with open(caminho, encoding="utf-8") as f:
                existentes = list((json.load(f) or {}).get("eventos") or [])
        except (OSError, ValueError):
            existentes = []
    try:
        limite = (datetime.fromisoformat(agora_texto[:19]) - timedelta(days=DIAS)).isoformat()
    except ValueError:
        limite = ""
    todos = [e for e in existentes + novos if (e.get("q") or "") >= limite]
    todos = todos[-MAX_EVENTOS:]
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump({"eventos": todos}, f, ensure_ascii=False, separators=(",", ":"))
    return len(todos)
