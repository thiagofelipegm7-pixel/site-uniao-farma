#!/usr/bin/env python3
"""Aplica overrides de categoria do painel interno.

Lê categorias-overrides.json ({ "NOME NORMALIZADO": "Bem Estar"|... }) e redefine
a categoria no catalogo-nacoes.json. Itens movidos para fora de Medicamentos saem
das listas receita/controlados (segurança). Consulte movido para outra categoria
aparece normalmente nela. Não marca controlado ao entrar em Medicamentos.
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
VALIDAS = {"Medicamentos", "Dermocosméticos", "Perfumes", "Infantil e Gestante", "Beleza", "Cuidado Diário", "Bem Estar"}


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


def aplicar(dados_dir: str, overrides: dict) -> dict:
    cat_path = os.path.join(dados_dir, "catalogo-nacoes.json")
    rx_path = os.path.join(dados_dir, "receita-nacoes.json")
    ovr_ctl_path = os.path.join(dados_dir, "controlados-overrides.json")
    cat, rx = ler(cat_path), ler(rx_path)
    itens = list(cat.get("itens") or [])
    receita = list(rx.get("receita") or [])
    controlados = list(rx.get("controlados") or [])
    consulte = list(rx.get("consulte") or [])
    ctl_ovr = ler(ovr_ctl_path) if os.path.exists(ovr_ctl_path) else {}
    if not isinstance(ctl_ovr, dict):
        ctl_ovr = {}
    cont = {"aplicados": 0, "ignorados": 0, "limpos_restritos": 0}

    for chave_bruta, categoria in overrides.items():
        if categoria not in VALIDAS:
            cont["ignorados"] += 1
            continue
        chave = norm(chave_bruta)
        # achar no catálogo ou nas listas restritas
        itens, a_cat = tirar(itens, chave)
        receita, a_rec = tirar(receita, chave)
        controlados, a_ctl = tirar(controlados, chave)
        consulte, a_con = tirar(consulte, chave)
        base = a_cat or a_rec or a_ctl or a_con
        if not base:
            cont["ignorados"] += 1
            continue

        if categoria != "Medicamentos":
            # fora de Medicamentos: não pode ficar em receita/controlados; limpa override de controlado
            if a_rec or a_ctl:
                cont["limpos_restritos"] += 1
            if chave in ctl_ovr:
                del ctl_ovr[chave]
            # monta item de catálogo
            item = {
                "nome": base.get("nome") or chave_bruta,
                "lab": base.get("lab") or "",
                "preco": base.get("preco"),
                "categoria": categoria,
                "isMIP": False,
            }
            if base.get("restam") is not None:
                item["restam"] = base["restam"]
            if base.get("origem"):
                item["origem"] = base["origem"]
            if base.get("categoriaAntiga"):
                item["categoriaAntiga"] = base["categoriaAntiga"]
            elif a_con or base.get("origem") == "consulte":
                item["categoriaAntiga"] = "Consulte o farmacêutico"
                item["origem"] = "consulte"
            itens.append(item)
            # se era consulte e saiu, remove da lista consulte também (já tiramos)
        else:
            # Medicamentos: se veio de receita/controlados, devolve à lista de origem; senão catálogo Medicamentos
            if a_ctl:
                controlados.append(a_ctl)
            elif a_rec:
                receita.append(a_rec)
            else:
                item = dict(base)
                item["categoria"] = "Medicamentos"
                if a_con or item.get("origem") == "consulte":
                    item["origem"] = item.get("origem") or "consulte"
                    item["categoriaAntiga"] = item.get("categoriaAntiga") or "Consulte o farmacêutico"
                    # consulte fica no catálogo comum (como categorias_novas)
                itens.append(item)
                if a_con:
                    # mantém também em consulte? categorias_novas inclui consulte no catálogo a partir de rx.consulte
                    consulte.append(a_con)
            # não cria controlado sozinho
        cont["aplicados"] += 1

    itens.sort(key=lambda i: norm(i.get("nome", "")))
    receita.sort(key=lambda i: norm(i.get("nome", "")))
    controlados.sort(key=lambda i: norm(i.get("nome", "")))
    cat["itens"] = itens
    rx["receita"], rx["controlados"], rx["consulte"] = receita, controlados, consulte
    rx["totalReceita"], rx["totalControlados"], rx["totalConsulte"] = len(receita), len(controlados), len(consulte)
    gravar(cat_path, cat)
    gravar(rx_path, rx)
    gravar(ovr_ctl_path, ctl_ovr)
    return cont


def main(argv):
    dados = argv[1] if len(argv) > 1 else DADOS
    ovr_path = os.path.join(dados, "categorias-overrides.json")
    if not os.path.exists(ovr_path):
        print("aplicar_categoria: sem overrides")
        return 0
    overrides = ler(ovr_path)
    if not isinstance(overrides, dict) or not overrides:
        print("aplicar_categoria: mapa vazio")
        return 0
    cont = aplicar(dados, overrides)
    print(f"aplicar_categoria: aplicados={cont['aplicados']} limpos_restritos={cont['limpos_restritos']} ignorados={cont['ignorados']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
