#!/usr/bin/env python3
"""Vincula os itens do export à lista pública de preços da CMED/Anvisa (PMC, xlsx).

Uso: python3 vincular_cmed.py <export.json> <lista_pmc.xlsx>
Saída: anvisa-cmed-vinculos.json (só dados públicos: tarja, ativo, registro, forma de vínculo).
Fonte: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
Vínculo por EAN (validado pelo nome) e, na falta, por nome + concentração. Sem vínculo seguro => sem entrada.
"""
import json, re, sys, unicodedata, collections, os

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
GENERICAS = set("OLEO AGUA VITAMINA QUERATINA AMORA BIOTINA ALCOOL GEL CREME SABONETE SHAMPOO CONDICIONADOR LOCAO PROTETOR DESODORANTE ABSORVENTE FRALDA ESCOVA PASTA ENXAGUANTE ACETONA ALGODAO AGULHA SERINGA LUVA MASCARA FITA TESTE COLAGENO OMEGA CHA MEL LEITE BARRA CAPSULAS CAPS SUPLEMENTO COLIRIO SOLUCAO POMADA XAROPE GOTAS SPRAY".split())
RANK = {"preta": 4, "restricao": 3, "vermelha": 2, "sem": 1}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").upper())
    return re.sub(r"[^A-Z0-9 .,/+%]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def toks(s):
    return [t for t in re.split(r"[ /+]+", norm(s)) if t]


def tarja_cod(t):
    t = str(t or "")
    if "Preta" in t: return "preta"
    if "restrição" in t: return "restricao"
    if "Sem Tarja" in t: return "sem"
    if "Vermelha" in t: return "vermelha"
    return None


def nums(s):
    return {n.replace(",", ".").rstrip("0").rstrip(".") if "." in n.replace(",", ".") else n
            for n in re.findall(r"\d+(?:[.,]\d+)?", norm(s))}


def _num(v):
    try:
        x = float(str(v).replace(",", "."))
        return x if x > 0 else None
    except (TypeError, ValueError):
        return None


def main(export, xlsx):
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    it = wb["Lista PMC"].iter_rows(values_only=True)
    h = next(it)
    ix = {n: i for i, n in enumerate(h)}
    # Teto de preço da CMED para Minas Gerais (ICMS 18%): coluna "PMC 18 %" (o nome varia um pouco entre as edições da lista).
    col_pmc = next((i for n, i in ix.items() if re.sub(r"[\s]", "", str(n or "")).upper() in ("PMC18%", "PMC18", "PMC18%(PMC)")), None)
    recs = []
    for r in it:
        if not r[ix["PRODUTO"]]:
            continue
        recs.append({
            "ativo": r[ix["SUBSTÂNCIA"]], "lab": r[ix["LABORATÓRIO"]], "reg": str(r[ix["REGISTRO"]] or ""),
            "eans": [re.sub(r"\D", "", str(r[ix[k]] or "")).lstrip("0") for k in ("EAN 1", "EAN 2", "EAN 3")],
            "prod": r[ix["PRODUTO"]], "apr": r[ix["APRESENTAÇÃO"]], "tarja": tarja_cod(r[ix["TARJA"]]),
            "pmc": _num(r[col_pmc]) if col_pmc is not None else None,
        })
    by_ean, by_prod, by_ativo = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
    for r in recs:
        for e in r["eans"]:
            if len(e) >= 8: by_ean[e].append(r)
        pt = toks(r["prod"])
        if pt: by_prod[pt[0]].append(r)
        at = toks(r["ativo"])
        if at: by_ativo[at[0]].append(r)
    # consenso por substância (só registros com tarja definida)
    cons = {}
    for k, rs in by_ativo.items():
        cons[k] = {r["tarja"] for r in rs if r["tarja"]}

    def nome_ok(nome, r):
        nt = toks(nome)
        if not nt: return False
        a = nt[0][:5]
        return any(t[:5] == a for t in toks(r["prod"])[:2] + toks(r["ativo"])[:2]) or any(t[:5] == a for t in toks(r["ativo"]))

    def pior(rs):
        t = [r["tarja"] for r in rs if r["tarja"]]
        return max(t, key=lambda x: RANK[x]) if t else None

    def pack(rs, metodo):
        ativos = sorted({str(r["ativo"]).strip() for r in rs if r["ativo"]})
        regs = sorted({r["reg"][:9] for r in rs if len(r["reg"]) >= 9})
        t = pior(rs)
        tarjas = {r["tarja"] for r in rs if r["tarja"]}
        pmcs = [r["pmc"] for r in rs if r.get("pmc")]
        return {**({"pmc": max(pmcs)} if pmcs else {}), "tarja": t, "tarja_unanime": len(tarjas) <= 1, "ativo": " + ".join(a.lower() for a in ativos[:3]) if len(ativos) <= 3 else None,
                "registro": regs[0] if len(regs) == 1 else None, "metodo": metodo,
                "cmed_produto": rs[0]["prod"], "cmed_lab": rs[0]["lab"]}

    items = json.load(open(export))["itens"]
    out, st = {}, collections.Counter()
    for x in items:
        nome, e = x["Produto"], re.sub(r"\D", "", x["CodigoDeBarras"] or "").lstrip("0")
        key = f'{x["CodigoDeBarras"]}|{nome}'
        c = [r for r in by_ean.get(e, []) if nome_ok(nome, r)] if e else []
        if c:
            nn = nums(nome)
            n2 = [r for r in c if nn and nn <= nums(r["apr"])] or c
            out[key] = pack(n2, "ean"); st["ean"] += 1; continue
        nt = toks(nome)
        c, nn = [], nums(nome)
        if nt and len(nt[0]) >= 4 and nt[0] not in GENERICAS:
            cp = by_prod.get(nt[0], [])
            ca = [r for r in by_ativo.get(nt[0], []) if r not in cp]
            # marca: o nome do produto bate com a primeira palavra; concentração, quando existe, precisa constar
            n2 = [r for r in cp if nn and nn <= nums(r["apr"])]
            if n2 and len({r["tarja"] for r in n2 if r["tarja"]}) == 1:
                out[key] = pack(n2, "nome+concentracao"); st["nome+conc"] += 1; continue
            tj = {r["tarja"] for r in cp if r["tarja"]}
            if cp and len(tj) == 1 and not nn:
                out[key] = pack(cp, "nome"); st["nome"] += 1; continue
            if cp and len(tj) == 1 and nn and all(r["tarja"] for r in cp):
                out[key] = pack(cp, "nome"); st["nome"] += 1; continue
            # genérico pelo nome da substância: exige concentração igual e tarja unânime
            n3 = [r for r in ca if nn and nn <= nums(r["apr"]) and nome_ok(nome, r)]
            if n3 and len({r["tarja"] for r in n3 if r["tarja"]}) == 1 and all(r["tarja"] for r in n3):
                out[key] = pack(n3, "substancia+concentracao"); st["subst+conc"] += 1; continue
        st["sem_vinculo"] += 1
    # tarja não informada ("- (*)"): usa consenso da substância, só se todos os registros com tarja concordam
    for key, v in out.items():
        if v["tarja"] is None and v.get("ativo"):
            a = toks(v["ativo"])[0]
            tj = cons.get(a, set())
            if tj and tj <= {"vermelha", "restricao"}:
                # só afirma o que todos os registros da substância confirmam; se divergem, fica "vermelha" (receita, sem afirmar retenção)
                v["tarja"] = next(iter(tj)) if len(tj) == 1 else "vermelha"; v["metodo"] += "+consenso_substancia"; st["consenso_subst"] += 1
    json.dump(out, open(os.path.join(HERE, "anvisa-cmed-vinculos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    print(dict(st), len(out))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
