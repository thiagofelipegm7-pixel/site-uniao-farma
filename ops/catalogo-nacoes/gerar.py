#!/usr/bin/env python3
"""Gera os JSONs estáticos do catálogo da loja Nações Unidas e o CSV de controlados/duvidosos.

Entrada: export do DMaster (cat_full.json). Os campos do export são só estes: CodigoDeBarras, Produto, Apresentacao,
Laboratorio, Estoque, Pvenda, Desconto, Classe, SubClasse, ProdutoControlado, ProdutoAntimicrobiano (sem tarja, sem RMS, sem princípio ativo).
Por isso a classificação usa: (1) flags do export, (2) classe CONTROLADO/CARTELADOS, (3) termos da Portaria 344 em controlados.json,
(4) o motor MIP/LMIP (pasta motor/ deste diretório, cópia do classify.py do dmaster-catalogo com a lista LMIP e o léxico fixos; DMASTER_DIR troca a pasta).
Vínculo com a lista pública de preços da CMED/Anvisa (anvisa-cmed-vinculos.json, gerado por vincular_cmed.py) fornece tarja,
princípio ativo e registro. Com vínculo seguro a tarja da CMED decide (preta = controlado; vermelha = receita; vermelha sob restrição =
receita com retenção; sem tarja = isento). Quem segue em dúvida entra na lista "Consulte o farmacêutico" (sem cesta, sem oferta).
Nunca grava token, código de barras nem a quantidade em estoque. Só publica dois sinais: `esgotado` (estoque zerado, item já publicado antes;
sai das listas e da busca, a página do produto continua aberta) e `restam` (1 a LIMITE_RESTAM unidades, para o aviso "Resta 2").
Uso: python3 gerar.py /caminho/cat_full.json [--sem-csv]
--sem-csv: não reescreve os CSVs de revisão (a sincronização automática usa, porque eles têm código de barras e são uma revisão manual de 31/10).
"""
import csv, json, math, os, re, sys, collections, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DMASTER = os.environ.get("DMASTER_DIR", os.path.join(AQUI, "motor"))
sys.path.insert(0, DMASTER)
import run as R  # motor MIP (classify.classify)

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()

CTL = json.load(open(os.path.join(AQUI, "controlados.json"), encoding="utf-8"))
def rx_termo(t): return re.compile(r"(?<![A-Z])" + re.escape(t.replace("-", " ")).replace(r"\ ", r"[\s\-]*"))
TERMOS = [(rx_termo(t["termo"]), t) for t in CTL["termos"]]
MARCAS = [(re.compile(r"(?<![A-Z0-9])" + re.escape(m["termo"]) + r"(?![A-Z])"), m) for m in CTL["marcas"]]
ETIQ = re.compile(CTL["etiquetas"])
# Antimicrobianos de uso sistêmico (retenção de receita, RDC 20/2011). Tópicos ficam de fora.
ANTIMICROB = re.compile(r"(?<![A-Z])(AMOXICILINA|AMOX|CLAVULAN|NOVAMOX|CLAVULIN|AZITROMICINA|CLARITROMICINA|ERITROMICINA|CEFALEXINA|CEFADROXILA|CEFUROXIMA|AXETILCEFUROXIMA|CEFTRIAXONA|CIPROFLOXACINO|LEVOFLOXACINO|MOXIFLOXACINO|NORFLOXACINO|OFLOXACINO|DOXICICLINA|TETRACICLINA|MINOCICLINA|SULFAMETOXAZOL|BACTRIM|BELFACTRIM|METRONIDAZOL|TINIDAZOL|SECNIDAZOL|NITROFURANTOINA|MACRODANTINA|FOSFOMICINA|CLINDAMICINA|PENICILINA|NOVOCILIN|AMPICILINA|FLUCONAZOL|ITRACONAZOL|NITAZOXANIDA)")
TOPICO = re.compile(r"(?<![A-Z])(CREME|CR|POM|POMADA|GEL|SPRAY|COLIRIO|OFT|OFTALM\w*|VAG|VAGINAL|OVULO|OVL|SOL TOP|LOCAO)(?![A-Z])")
ANTIB_TOP = re.compile(r"TOBRAMICINA|TOBREX|TOBRACORT|TOBRADEX|SULFADIAZINA|MUPIROCINA|MAXIFLOX|MAXITROL|MAXINOM|OTOSPORIN|GENTAMICINA|NEOMICINA|CLORANFENICOL|MONURIL")
VINC = json.load(open(os.path.join(AQUI, "anvisa-cmed-vinculos.json"), encoding="utf-8"))
LISTAS_344 = {"A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5"}
TARJA_SITE = {"preta": "preta", "restricao": "vermelha-retencao", "vermelha": "vermelha"}

def fmt_rms(reg):
    return f"{reg[0]}.{reg[1:5]}.{reg[5:9]}" if reg and len(reg) == 9 and reg.isdigit() else None

LIMITE_RESTAM = 5  # com 1 a 5 unidades o site mostra "Resta N"

def chave_publica(nome, lab):
    return norm(nome) + "|" + norm(lab)

def publicados_antes(dados):
    """Chaves (nome|laboratório) de tudo que já estava publicado: é o que continua com página mesmo esgotado."""
    vistos = set()
    for arq in ("catalogo-nacoes.json", "receita-nacoes.json"):
        caminho = os.path.join(dados, arq)
        if not os.path.exists(caminho):
            continue
        try:
            d = json.load(open(caminho, encoding="utf-8"))
        except ValueError:
            continue
        listas = [d.get("itens", [])] + [d.get(k, []) for k in ("receita", "controlados", "consulte")]
        for lista in listas:
            for i in lista:
                vistos.add(chave_publica(i.get("nome", ""), i.get("lab", "")))
    return vistos

NAO_PRODUTO = re.compile(r"TAXA DE ENTREGA|APLICACAO|AFERIMENTO|XEROX|MANIPULACAO")

def achar_controlado(n):
    for rx, m in MARCAS:
        if rx.search(n): return m["ativo"], m["lista"], "marca"
    for rx, t in TERMOS:
        if rx.search(n): return t["termo"].lower(), t["lista"], "ativo"
    return None

def categoria(it, tipo, n):
    c = (it.get("Classe") or "").strip().upper()
    if tipo == "mip": return "Medicamentos isentos de prescrição"
    if c in ("SUPLEMENTOS", "ALIMENTOS"): return "Suplementos e alimentos"
    if re.search(r"PROT(ETOR)? SOLAR|\bFPS\b|HIDRAT|LOCAO|CR FACIAL|CREME FACIAL|\bCR NIVEA|VASENOL|BEPANTOL|SABONETE FACIAL|ACQUA|REPAIRING", n): return "Pele e proteção solar"
    if c in ("PERFUMARIA", "KIT DE PRODUTOS"): return "Perfumaria e higiene"
    return "Correlatos e outros"

def main(path, escrever_csv=True):
    d = json.load(open(path, encoding="utf-8"))
    gerado = d["geradoEm"]
    pub, rec, ctl, cons, rel = [], [], [], [], []
    cont = collections.Counter()
    vistos = set()
    dados_dir = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")
    antes = publicados_antes(dados_dir)
    pmc_teto = {}  # chave pública -> teto de preço da CMED (PMC), só quando o vínculo traz o PMC; lido por retencao.py
    for it in d["itens"]:
        nome = re.sub(r"\s+", " ", it["Produto"]).strip()
        n = norm(nome)
        base = dict(CodigoDeBarras=it["CodigoDeBarras"], Produto=nome, Laboratorio=(it.get("Laboratorio") or "").strip(), Classe=it["Classe"], Estoque=it["Estoque"], Pvenda=it["Pvenda"])
        info = {}
        def rep(cat, motivo, ativo="", lista=""):
            rel.append(dict(base, categoria=cat, ativo=ativo, lista=lista, motivo=motivo, **info)); cont[cat] += 1
        if NAO_PRODUTO.search(n) or it["Classe"] == "SERVICOS" or not nome:
            rep("nao_produto", "serviço/taxa, não é produto"); continue
        flagctl = it.get("ProdutoControlado") in (1, True, "1") or it["Classe"] in ("CONTROLADO", "CARTELADOS")
        flagabx = it.get("ProdutoAntimicrobiano") in (1, True, "1")
        ach = achar_controlado(n)
        etq = ETIQ.search(n)
        st, why = R.classify(it)
        tipo = None; ativo = ""; lista = ""; motivo = ""
        if ach and ach[1] == "duvida":
            tipo = "duvidoso"; motivo = f"ativo que pode ser controlado conforme forma/dose: {ach[0]}"; ativo = ach[0]; lista = "duvida"
        elif ach and ach[1] == "D1":
            tipo = "duvidoso"; motivo = f"precursor (lista D1): {ach[0]}; RT confirmar como tratar"; ativo = ach[0]; lista = "D1"
        elif ach or etq:
            tipo = "controlado"; lista = ach[1] if ach else (etq.group(1) if etq else "")
            ativo = ach[0] if ach else ""
            motivo = "flag do export" if flagctl else ("etiqueta de lista no nome" if etq and not ach else "ativo/marca da Portaria 344")
            if flagctl and ach: motivo = "flag do export + ativo/marca da Portaria 344"
            if not ativo: motivo += "; princípio ativo não identificado (não informado)"
        elif flagabx or ANTIMICROB.search(n) and not TOPICO.search(n) or flagctl and (ANTIMICROB.search(n) or ANTIB_TOP.search(n)):
            tipo = "receita_retencao"
        elif flagctl:
            tipo = "duvidoso"; motivo = "export marca como controlado/retido, mas nenhum ativo da Portaria 344 foi identificado; RT confirmar"
        elif st in ("MIP", "LIVRE"):
            tipo = "mip" if st == "MIP" else "livre"
        elif st == "REV":
            tipo = "duvidoso"; motivo = "enquadramento regulatório a confirmar: " + why
        elif st == "EXC":
            if "não mapeado" in why:
                tipo = "duvidoso"; motivo = "marca/ativo não identificado: pode ser controlado ou não; RT confirmar"
            else:
                tipo = "receita"
        era_duvidoso = tipo == "duvidoso"
        tipo_antes = tipo
        # --- tarja pública da CMED/Anvisa (vínculo por EAN validado pelo nome, ou por nome + concentração)
        v = VINC.get(f'{it["CodigoDeBarras"]}|{it["Produto"]}')
        tarja = v["tarja"] if v else None
        evid = "sem vínculo seguro com a CMED/Anvisa"
        conf = "baixa"
        if v:
            evid = f'CMED/Anvisa 09/10/2026 ({v["metodo"]}): {v["cmed_produto"]}, tarja {tarja or "não informada"}'
            conf = "alta" if v["metodo"].startswith("ean") and tarja else ("media" if tarja else "baixa")
        lista_pt = ach[1] if ach and ach[1] in LISTAS_344 else None
        if v and tarja:
            if tarja == "preta":
                tipo = "controlado"; lista = lista_pt or "A/B"
                if not ativo: ativo = v.get("ativo") or ""
            elif tarja == "restricao":
                if lista_pt: tipo = "controlado"; lista = lista_pt; ativo = ativo or v.get("ativo") or ""
                elif tipo != "controlado": tipo = "receita_retencao"
            elif tarja == "vermelha":
                if tipo not in ("controlado", "receita_retencao"):
                    tipo = "receita_retencao" if (flagabx or (ANTIMICROB.search(n) and not TOPICO.search(n))) else "receita"
            elif tarja == "sem":
                if tipo in ("duvidoso", "livre"): tipo = "mip"
            if tipo != tipo_antes and not era_duvidoso:
                motivo = (motivo + "; " if motivo else "") + f"QA: era {tipo_antes}, a tarja da CMED indica {tipo}"
                cont["qa_movido"] += 1
        info = dict(tipo_original=tipo_antes, evidencia=evid, confianca=conf, tarja_cmed=tarja or "", era_duvidoso="sim" if era_duvidoso else "")
        if tipo == "duvidoso" and not v:
            pass
        extra = {}
        if v and tipo in ("receita", "receita_retencao", "controlado", "duvidoso"):
            if v.get("ativo") and tipo != "controlado": extra["ativo"] = v["ativo"]
            rms = fmt_rms(v.get("registro"))
            if rms: extra["rms"] = rms
            if tarja in TARJA_SITE: extra["tarja"] = TARJA_SITE[tarja]
        if tipo == "controlado" and v and v.get("ativo") and not ativo: ativo = v["ativo"]
        # sem estoque: itens do carrinho só saem com estoque; as listas de preço (sem cesta) mantêm os 972 que o Thiago pediu
        sem_cesta = tipo in ("receita", "receita_retencao", "controlado", "duvidoso")
        lab_item = "" if re.fullmatch(r"(?i)diversos|china", base["Laboratorio"]) else base["Laboratorio"]
        unidades = math.floor(it["Estoque"]) if isinstance(it["Estoque"], (int, float)) else 0
        esgotado = unidades <= 0
        # Esgotado: só segue no site o que já tinha sido publicado (a página fica aberta; as listas escondem). O resto nunca entra.
        if esgotado and not (era_duvidoso and sem_cesta) and chave_publica(nome, lab_item) not in antes:
            rep("sem_estoque", f"sem estoque no export ({tipo})", ativo, lista); continue
        preco = it["Pvenda"] if it["Pvenda"] and it["Pvenda"] > 0 else None
        if v and isinstance(v.get("pmc"), (int, float)) and v["pmc"] > 0:
            pmc_teto[chave_publica(nome, lab_item)] = float(v["pmc"])
        item = {"nome": nome, "lab": lab_item, "preco": preco}
        if esgotado:
            item["esgotado"] = True
        elif unidades <= LIMITE_RESTAM:
            item["restam"] = unidades
        gen = it["Classe"] == "GENERICO"  # só nas listas restritas: a ilustração da caixa (receita.ts) usa
        chave = (norm(nome), item["lab"], preco)
        if chave in vistos:
            rep("duplicado", "mesmo nome/laboratório/preço já publicado"); continue
        vistos.add(chave)
        info["secao"] = {"livre": "sem receita", "mip": "sem receita", "receita": "receita", "receita_retencao": "receita com retenção", "controlado": "controlado", "duvidoso": "consulte o farmacêutico"}[tipo]
        if tipo in ("livre", "mip"):
            item.update(categoria=categoria(it, tipo, n), isMIP=tipo == "mip"); pub.append(item); cont["publicado"] += 1
            if era_duvidoso: cont["duvidoso_para_sem_receita"] += 1; rep("duvidoso_para_sem_receita", motivo, ativo, lista)
        elif tipo == "controlado":
            item.update(ativo=ativo, lista=lista, **{k: x for k, x in extra.items() if k != "ativo"}, **({"generico": True} if gen else {})); ctl.append(item); cont["controlado_publicado"] += 1
            if era_duvidoso: cont["duvidoso_para_controlado"] += 1
            rep("controlado_publicado", motivo, ativo, lista)
        elif tipo == "duvidoso":
            item.update(**extra, **({"generico": True} if gen else {})); cons.append(item); cont["consulte_farmaceutico"] += 1
            rep("duvidoso", motivo, ativo, lista)
        else:
            item.update(retencao=tipo == "receita_retencao", **extra, **({"generico": True} if gen else {})); rec.append(item); cont["receita"] += 1
            if era_duvidoso: cont["duvidoso_para_receita"] += 1; rep("duvidoso_para_receita", motivo, ativo, lista)
            elif motivo: rep("qa_movido_para_receita", motivo, ativo, lista)
    pub.sort(key=lambda x: x["nome"]); rec.sort(key=lambda x: x["nome"]); ctl.sort(key=lambda x: x["nome"]); cons.sort(key=lambda x: x["nome"])
    dados = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")
    os.makedirs(dados, exist_ok=True)
    meta = {"loja": "nacoes", "geradoEm": gerado, "fonte": "Export DMaster da loja Nações Unidas (sem estoque, sem código de barras); tarja, princípio ativo e registro da lista pública CMED/Anvisa de 09/10/2026"}
    json.dump(dict(meta, total=len(pub), itens=pub), open(os.path.join(dados, "catalogo-nacoes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(dict(meta, totalReceita=len(rec), totalControlados=len(ctl), totalConsulte=len(cons), receita=rec, controlados=ctl, consulte=cons), open(os.path.join(dados, "receita-nacoes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    if escrever_csv:
        # CSV de revisão do Thiago: os 972 antes duvidosos + itens movidos na conferência. Coluna categoria_final em branco.
        rev = [r for r in rel if r.get("era_duvidoso") == "sim" or r["categoria"] == "qa_movido_para_receita"]
        campos = ["Produto", "Laboratorio", "Classe", "Pvenda", "origem", "onde_esta_no_site", "confianca", "ativo", "lista", "tarja_cmed", "evidencia", "motivo", "CodigoDeBarras", "categoria_final", "observacao"]
        out = os.path.join(AQUI, "revisao-thiago.csv")
        SEC = {"duvidoso_para_sem_receita": "sem receita", "duvidoso_para_receita": "receita", "controlado_publicado": "controlado", "duvidoso": "consulte o farmacêutico", "sem_estoque": "fora do site (sem estoque)", "duplicado": "fora do site (duplicado)", "qa_movido_para_receita": "receita (movido na conferência)"}
        with open(out, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=campos, delimiter=";", extrasaction="ignore"); w.writeheader()
            for r in sorted(rev, key=lambda r: (SEC.get(r["categoria"], r["categoria"]), r["Produto"])):
                r = dict(r); r["onde_esta_no_site"] = r.get("secao") or SEC.get(r["categoria"], r["categoria"]); r["categoria_final"] = ""; r["observacao"] = ""; r["origem"] = "um dos 972 duvidosos" if r.get("era_duvidoso") == "sim" else "conferência de item já publicado"
                w.writerow(r)
        rel_pub = [r for r in rel if r["categoria"] in ("controlado_publicado", "duvidoso")]
        out = os.path.join(AQUI, "relatorio-controlados-e-duvidosos.csv")
        campos = ["categoria", "Produto", "Laboratorio", "Classe", "Pvenda", "ativo", "lista", "motivo", "CodigoDeBarras"]
        with open(out, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=campos, delimiter=";", extrasaction="ignore"); w.writeheader()
            for r in sorted(rel_pub, key=lambda r: (r["categoria"], r["Produto"])): w.writerow(r)
    with open(os.path.join(AQUI, ".pmc-teto.json"), "w", encoding="utf-8") as f:
        json.dump(pmc_teto, f, ensure_ascii=False)  # só preço público da CMED por nome; sem código de barras nem estoque
    print(dict(cont))
    return pub, rec, ctl, rel

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args[0] if args else "/workspace/cat_full.json", escrever_csv="--sem-csv" not in sys.argv)
