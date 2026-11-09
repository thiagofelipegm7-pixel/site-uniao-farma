#!/usr/bin/env python3
"""Aplica overrides do painel interno: Controlado (Portaria 344) sim/não/automático.

Lê controlados-overrides.json ({ "NOME NORMALIZADO": "sim"|"nao" }) e move itens entre
catalogo-nacoes.json (sem receita) e receita-nacoes.json (receita/controlados).
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


def tirar(lista, chave):
    saida, achado = [], None
    for i in lista:
        if norm(i.get("nome", "")) == chave:
            achado = i
        else:
            saida.append(i)
    return saida, achado


def para_controlado(base: dict) -> dict:
    item = {
        "nome": base["nome"],
        "lab": base.get("lab") or "",
        "preco": base.get("preco"),
        "restam": base.get("restam"),
        "lista": base.get("lista") or "A/B",
        "tarja": base.get("tarja") or "preta",
        "ativo": base.get("ativo") or "",
        "rms": base.get("rms"),
    }
    if base.get("generico") is not None:
        item["generico"] = base["generico"]
    return {k: v for k, v in item.items() if v is not None}


def para_receita(base: dict) -> dict:
    item = {
        "nome": base["nome"],
        "lab": base.get("lab") or "",
        "preco": base.get("preco"),
        "restam": base.get("restam"),
        "tarja": base.get("tarja") if base.get("tarja") not in (None, "preta") else "vermelha",
        "retencao": False if base.get("tarja") == "preta" else bool(base.get("retencao", False)),
        "ativo": base.get("ativo") or "",
        "rms": base.get("rms"),
    }
    return {k: v for k, v in item.items() if v is not None}


def aplicar(dados_dir: str, overrides: dict) -> dict:
    """overrides: chave normalizada -> 'sim'|'nao'. Retorna contagens."""
    cat_path = os.path.join(dados_dir, "catalogo-nacoes.json")
    rx_path = os.path.join(dados_dir, "receita-nacoes.json")
    cat, rx = ler(cat_path), ler(rx_path)
    receita = list(rx.get("receita") or [])
    controlados = list(rx.get("controlados") or [])
    consulte = list(rx.get("consulte") or [])
    itens = list(cat.get("itens") or [])
    cont = {"sim": 0, "nao": 0, "ignorado": 0}

    for chave, estado in overrides.items():
        if estado not in ("sim", "nao"):
            cont["ignorado"] += 1
            continue
        chave = norm(chave)
        itens, a_cat = tirar(itens, chave)
        receita, a_rec = tirar(receita, chave)
        controlados, a_ctl = tirar(controlados, chave)
        consulte, a_con = tirar(consulte, chave)
        base = a_ctl or a_rec or a_con or a_cat
        if not base:
            cont["ignorado"] += 1
            continue
        if estado == "sim":
            controlados.append(para_controlado(base))
            cont["sim"] += 1
        else:
            # Não controlado: fica em receita (ainda pode exigir receita simples); sai do catálogo OTC.
            receita.append(para_receita(base))
            cont["nao"] += 1

    controlados.sort(key=lambda i: norm(i.get("nome", "")))
    receita.sort(key=lambda i: norm(i.get("nome", "")))
    itens.sort(key=lambda i: norm(i.get("nome", "")))
    cat["itens"] = itens
    rx["receita"], rx["controlados"], rx["consulte"] = receita, controlados, consulte
    rx["totalReceita"], rx["totalControlados"], rx["totalConsulte"] = len(receita), len(controlados), len(consulte)
    gravar(cat_path, cat)
    gravar(rx_path, rx)
    return cont


def main(argv):
    dados = argv[1] if len(argv) > 1 else DADOS
    ovr_path = os.path.join(dados, "controlados-overrides.json")
    if not os.path.exists(ovr_path):
        print("aplicar_controlado: sem overrides")
        return 0
    overrides = ler(ovr_path)
    if not isinstance(overrides, dict) or not overrides:
        print("aplicar_controlado: mapa vazio")
        return 0
    cont = aplicar(dados, overrides)
    print(f"aplicar_controlado: sim={cont['sim']} nao={cont['nao']} ignorado={cont['ignorado']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
