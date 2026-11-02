#!/usr/bin/env python3
"""Gera os JSONs estáticos do catálogo da loja Nações Unidas e o CSV de controlados/duvidosos.

Entrada: export do DMaster (cat_full.json). Os campos do export são só estes: CodigoDeBarras, Produto, Apresentacao,
Laboratorio, Estoque, Pvenda, Desconto, Classe, SubClasse, ProdutoControlado, ProdutoAntimicrobiano (sem tarja, sem RMS, sem princípio ativo).
Por isso a classificação usa: (1) flags do export, (2) classe CONTROLADO/CARTELADOS, (3) termos da Portaria 344 em controlados.json,
(4) o motor MIP/LMIP (classify.py da pasta dmaster-catalogo, fora deste repositório: variável DMASTER_DIR).
Regra: dúvida = não publica. Nunca grava token nem estoque (só a data dos dados).
Uso: python3 gerar.py /caminho/cat_full.json
"""
import csv, json, os, re, sys, collections, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DMASTER = os.environ.get("DMASTER_DIR", "/workspace/dmaster-catalogo")
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

def main(path):
    d = json.load(open(path, encoding="utf-8"))
    gerado = d["geradoEm"]
    pub, rec, ctl, rel = [], [], [], []
    cont = collections.Counter()
    vistos = set()
    for it in d["itens"]:
        nome = re.sub(r"\s+", " ", it["Produto"]).strip()
        n = norm(nome)
        base = dict(CodigoDeBarras=it["CodigoDeBarras"], Produto=nome, Laboratorio=(it.get("Laboratorio") or "").strip(), Classe=it["Classe"], Estoque=it["Estoque"], Pvenda=it["Pvenda"])
        def rep(cat, motivo, ativo="", lista=""):
            rel.append(dict(base, categoria=cat, ativo=ativo, lista=lista, motivo=motivo)); cont[cat] += 1
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
        if tipo == "duvidoso":
            rep("duvidoso", motivo, ativo, lista); continue
        if it["Estoque"] <= 0:
            rep("sem_estoque", f"sem estoque no export ({tipo})", ativo, lista); continue
        preco = it["Pvenda"] if it["Pvenda"] and it["Pvenda"] > 0 else None
        item = {"nome": nome, "lab": "" if re.fullmatch(r"(?i)diversos|china", base["Laboratorio"]) else base["Laboratorio"], "preco": preco}
        chave = (norm(nome), item["lab"], preco)
        if chave in vistos:
            rep("duplicado", "mesmo nome/laboratório/preço já publicado"); continue
        vistos.add(chave)
        if tipo in ("livre", "mip"):
            item.update(categoria=categoria(it, tipo, n), isMIP=tipo == "mip"); pub.append(item); cont["publicado"] += 1
        elif tipo == "controlado":
            item.update(ativo=ativo, lista=lista); ctl.append(item); cont["controlado_publicado"] += 1
            rep("controlado_publicado", motivo, ativo, lista)
        else:
            item.update(retencao=tipo == "receita_retencao"); rec.append(item); cont["receita"] += 1
    pub.sort(key=lambda x: x["nome"]); rec.sort(key=lambda x: x["nome"]); ctl.sort(key=lambda x: x["nome"])
    dados = os.path.join(RAIZ, "app", "nacoes-unidas", "produtos", "dados")
    os.makedirs(dados, exist_ok=True)
    meta = {"loja": "nacoes", "geradoEm": gerado, "fonte": "Export DMaster da loja Nações Unidas (sem estoque, sem código de barras)"}
    json.dump(dict(meta, total=len(pub), itens=pub), open(os.path.join(dados, "catalogo-nacoes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(dict(meta, totalReceita=len(rec), totalControlados=len(ctl), receita=rec, controlados=ctl), open(os.path.join(dados, "receita-nacoes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    rel_pub = [r for r in rel if r["categoria"] in ("controlado_publicado", "duvidoso")]
    out = os.path.join(AQUI, "relatorio-controlados-e-duvidosos.csv")
    campos = ["categoria", "Produto", "Laboratorio", "Classe", "Pvenda", "ativo", "lista", "motivo", "CodigoDeBarras"]
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";", extrasaction="ignore"); w.writeheader()
        for r in sorted(rel_pub, key=lambda r: (r["categoria"], r["Produto"])): w.writerow(r)
    print(dict(cont))
    return pub, rec, ctl, rel

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/workspace/cat_full.json")
