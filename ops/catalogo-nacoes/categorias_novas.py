#!/usr/bin/env python3
"""Reclassifica o catálogo público (catalogo-nacoes.json) nas 8 categorias da loja:
Medicamentos, Dermocosméticos, Perfumes, Infantil e Gestante, Beleza, Cuidado Diário, Bem Estar e Categoria a conferir.

O export do DMaster não traz a categoria da loja, então a regra usa o nome e o laboratório do item, na ordem abaixo
(a primeira que casar vence). O que não casa com nenhuma regra e não tem categoria antiga que o ajude vai para
"Categoria a conferir". Para corrigir um item, acrescente o nome em AJUSTES (nome normalizado -> categoria).

Uso: python3 categorias_novas.py [caminho/catalogo-nacoes.json]   (reescreve o arquivo e imprime o resumo)
Depois: node scripts/gerar-assets-catalogo.mjs
"""
import json, os, re, sys, unicodedata, collections

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
ARQ = os.path.join(RAIZ, "app/nacoes-unidas/produtos/dados/catalogo-nacoes.json")

CATEGORIAS = ["Medicamentos", "Dermocosméticos", "Perfumes", "Infantil e Gestante", "Beleza", "Cuidado Diário", "Bem Estar", "Categoria a conferir"]

# Correções manuais: nome normalizado -> categoria.
AJUSTES: dict[str, str] = {
    # Itens do lote infantil e gestação (05/11): lenços, mordedores, testes de gravidez, linha Bebelo etc.
    "ABS POS PARTO GERIAMAX COM 20UND": "Infantil e Gestante",
    "BYE BYE FEVER BEBES C 2UN": "Infantil e Gestante",
    "COND BEBELO MELANCIA 250ML": "Infantil e Gestante",
    "CREME DE PENTEAR SKALINHA CAMO": "Infantil e Gestante",
    "LENC UMEDECIDO HUGGIES NATURAL 48UND": "Infantil e Gestante",
    "LENC UMEDECIDO JOAO E MARIA 90UND": "Infantil e Gestante",
    "LENC UMEDECIDO PIQUITUCHO 140UND": "Infantil e Gestante",
    "MASCARA CAPILAR BEBELO 250G": "Infantil e Gestante",
    "MORDEDOR CENTOPEIA BUBA": "Infantil e Gestante",
    "MORDEDOR LOLLY AGUA FRUTINHAS C7708 01 U": "Infantil e Gestante",
    "MORDEDOR LOLLY AGUA FRUTINHAS C7709 01 M": "Infantil e Gestante",
    "SERINGA 20 ML SEM AGULHA BICO LUER LOCK DESCARPACK": "Categoria a conferir",
    "SERINGA 3ML SEM AGULHA BICO LUER SLIP DESCARPACK": "Categoria a conferir",
    "SERINGA 3ML SEM AGULHA LUER LOCK SR": "Categoria a conferir",
    "SERINGA 5ML SEM AGULHA BICO LUER SLIP DESCARPACK": "Categoria a conferir",
    "SHAMPOO BEBELO MELANCIA 500ML": "Infantil e Gestante",
    "TEST GRAV CLEARBLUE COMPACTO": "Infantil e Gestante",
    # Itens com foto conferida pela loja (lote de bem-estar de 04/11).
    "ADOCANTE ADOCYL STEVIA 80ML": "Bem Estar",
    "ADOCANTE DIETETICO DOCURINHA 1": "Bem Estar",
    "FINI GELAT BEIJO DE MORA15G": "Bem Estar",
    "FINI GELATINA AMORAS DP 15G": "Bem Estar",
    "FINI GELATINA DENTADURA DP 15G": "Bem Estar",
    "FINI TUBES MORANGO DP 15G": "Bem Estar",
    "OLEO DE ALHO EM CAPSULAS C 60 SOFTCAPS": "Bem Estar",
    "OLEO DE COCO COPRA 200ML EXTRAVIRGEM": "Bem Estar",
    "OLEO DE COCO EXTRAVIRGEM 15ML": "Bem Estar",
    "OLEO DE ROSA MOSQUETAS 10ML": "Dermocosméticos",
    "OLEO ROSA MOSQUETA 100 ML": "Dermocosméticos",
    "PRESERV OLLA PLAY C 3UN": "Bem Estar",
    "SUPRINUTRI 400G ORIGINAL E": "Bem Estar",
    "VALDA FRIENDS PAST 25G": "Bem Estar",
    "VINAGRE DE MACA SAO FRANCISCO ORGANICO 500ML": "Bem Estar",
    # Itens com foto conferida pela loja (lote de dermocosméticos de 04/11).
    "ADESIVO RICCA 3867 SECATIVO ACNE FASE CR": "Dermocosméticos",
    "AGUA MICELAR CICATRICURE 200ML": "Dermocosméticos",
    "AGUA MICELAR SOL 5EM1 200ML ELSEVE": "Beleza",
    "BLOQ SOLAR NIVEA FPS50 200 ML": "Dermocosméticos",
    "CARMED ACIDO HIALURONICO 10G": "Dermocosméticos",
    "CERAVE CREME HIDRATANTE 85G": "Dermocosméticos",
    "CERAVE LOCAO HIDRATANTE 340ML": "Dermocosméticos",
    "CERIDRAT CREME CORPORAL E FACIAL 500G": "Dermocosméticos",
    "CERIDRAT LOCAO CORPORAL E FACIAL 473ML": "Dermocosméticos",
    "CETAPHIL CREME HIDRATANTE CORPORAL 453G": "Dermocosméticos",
    "CETAPHIL LOCAO HIDRATANTE CORPORAL 453G": "Dermocosméticos",
    "CICATRICURE CREME FACIAL 30G ANTISSINAIS": "Dermocosméticos",
    "CICATRICURE GEL 30 GR": "Dermocosméticos",
    "COND PALM 350ML HIALURONICO E": "Beleza",
    "CR NIVEA 56 GR LATA": "Dermocosméticos",
    "CR NIVEA FACIAL ANTISSINAIS 100 G": "Dermocosméticos",
    "CR NIVEA FACIAL CONTROLE OLEOSIDADE 100 G": "Dermocosméticos",
    "CR SEBO DE CARNEIRO C UREIA 200 ML7898946058871": "Dermocosméticos",
    "CREME NIVEA FACIAL NUTRITIVO 100 GR": "Dermocosméticos",
    "DESOD STICK DOVE SERUM SAKURA BLOSSOM 72": "Cuidado Diário",
    "EPIDRAT CALM B5 BG 50ML": "Dermocosméticos",
    "FISIOGEL LC CREMOSA 400ML": "Dermocosméticos",
    "GARNIER HIDRAT FAC ANTISSINAIS 8": "Dermocosméticos",
    "HID FAC FACE BEAUT 50G ROSA MOSQUETA E": "Dermocosméticos",
    "KIT PROTETOR SOLAR 70 70FPS FACIAL E CORPORAL": "Dermocosméticos",
    "LOCAO DE LIMPEZA CETAPHIL 120ML": "Dermocosméticos",
    "NEUTROG SUNFRESH FAC OIL F70 4": "Dermocosméticos",
    "NEUTROGENA INTENSIVE EXTRA CARE 400 ML": "Dermocosméticos",
    "OAZ CREME DE UREIA 10 300ML": "Dermocosméticos",
    "OAZ CREME DE UREIA 3 150ML": "Dermocosméticos",
    "OLEO BRONZEADOR SUNLESS CENOURA FPS 6 120 ML": "Dermocosméticos",
    "OLEO BRONZEADOR SUNLESS URUCUM FPS 6 120 ML": "Dermocosméticos",
    "OLEO E SERUM DOVE BIFASICO 110ML": "Dermocosméticos",
    "OLEO SERUM CAP SEDA 060ML TOQUE SEDA E": "Beleza",
    "PROT FACIAL SUNLESS GEL TRANSLUCIDO FPS5": "Dermocosméticos",
    "PROT SOL FAC DERMACHEM 040G F85 NIACINAM": "Dermocosméticos",
    "PROT SOLAR SUNLESS FPS50 60G": "Dermocosméticos",
    "PROT SOLAR SUNLESS FPS60 200G": "Dermocosméticos",
    "PROTETOR SOLAR FACIAL SUNLESS 060G F70 SEM COR TOQ": "Dermocosméticos",
    "PROTETOR SOLAR NIVEA FACIAL FPS70 40ML": "Dermocosméticos",
    "SAB ACTINE CONTROL 70G": "Dermocosméticos",
    "SAB ACTINE PELE ACNEICA 70GRAMAS": "Dermocosméticos",
    "SEBO DE CARNEIRO COM UREIA 10 200ML": "Dermocosméticos",
    "SEDA SERUM TOQUE SEDA 12X100ML": "Beleza",
    "SERUM CORPORAL DOVE GLICOLICO 180ML": "Dermocosméticos",
    "SERUM DOVE CORP NIACINAMID 180ML": "Dermocosméticos",
    "SERUM DOVE CORP NIACINAMIDA 380M": "Dermocosméticos",
    "SERUM DOVE CORPO PRO CERAM 180ML": "Dermocosméticos",
    "SERUM DOVE CORPO PRO CERAM 380ML": "Dermocosméticos",
    "SERUM ELSEVE COLAGENO 100ML": "Beleza",
    "SERUM FACIAL DERMACHEM 30ML CLAREADOR E": "Dermocosméticos",
    "SERUM FACIAL DERMACHEM 30ML HIALURONICO": "Dermocosméticos",
    "SUNLESS PROTETOR FACIAL 60G": "Dermocosméticos",
}

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()

def rx(p): return re.compile(p)
INFANTIL = rx(r"\b(FRALDA|FRALD|BABY|BEBE|INFANT\w*|KIDS?|CHUPETA|MAMADEIRA|BICO|GESTANTE|GRAVIDEZ|TOALHAS? UMEDECIDAS?|LENCO UMEDECIDO|LENCOS? UMED\w*|APTAMIL|NAN|NESTOGENO|ENFAMIL|ISABABY|HIPOPO|PEQUENO PRINCIPE|PROTETOR DE SEIO|ASSADURA|ASSADURAS)\b")
PERFUME = rx(r"\b(PERFUME|PERF|COLONIA|DEO COL\w*|DEO COLONIA|BODY SPLASH|SPLASH|EAU|AGUA DE COLONIA|FRAGRANCIA)\b")
BELEZA = rx(r"\b(SHAMPOO|SH|SHAMP|CONDICIONADOR|COND|CR PENT\w*|CREME PENT\w*|CR P PENTEAR|MASC\w* CAPILAR|MASCARA|TINT\w*|COLORACAO|COLOR|ESMALTE|ACETONA|DEPILAT\w*|DEPIL|BATOM|MAQUIAGEM|ALISANTE|ALISAMENTO|RELAXAMENTO|CACHEADO|CACHOS|CAPILAR|FINALIZADOR|GEL FIXADOR|GELATINA|LAPIS|DELINEADOR|PINCEL|BASE LIQ\w*|PO COMPACTO|SOMBRA|BLUSH|RIMEL|SECADOR|PRANCHA|PENTE|ESCOVA DE CABELO|LIXA|ALICATE|CILIOS|REMOVEDOR|CERA DEPIL\w*|BRILHO LABIAL|HIDRATANTE CAPILAR|OLEO CAPILAR|AMPOLA CAPILAR|TRATAMENTO CAPILAR|BOTOX CAPILAR|OLEO DE ARGAN)\b")
LABS_BELEZA = {"SALON LINE", "EMBELLEZE", "NIELY", "WELLA", "LOREAL", "BIOEXTRATO", "TRESEMME", "ELSEVE", "SEDA", "PANTENE", "PALMOLIVE NATURALS"}
CUIDADO = rx(r"\b(SAB|SABONETE|SABAO|DESOD\w*|DES|ROLL ON|AEROSSOL|CR DENT\w*|CREME DENTAL|PASTA DENTAL|ESCOVA DENTAL|ESC DENT\w*|FIO DENTAL|ENXAG\w*|ANTISEPT\w*|LISTERINE|PLAX|ABS|ABSORVENTE|PROTETOR DIARIO|PAPEL HIG\w*|COTONETE|HASTES?|ALGODAO|BARBEAD\w*|GILLETTE|LAMINA|APARELHO DE BARBEAR|ALCOOL|HIGIENE|LENCO|PROT LABIAL|PROTETOR LABIAL|CHICLE|BALA|HALLS|DROPS|PASTILHA|ADOCANTE|ESCOVA|DENTAL|BANHO|SPRAY|CURATIVO|BAND AID|GAZE|ESPARADRAPO|ATADURA|LUVA\w*|MASCARA DESC\w*)\b")
BEM_ESTAR = rx(r"\b(PRESERVATIVO|CAMISINHA|LUBRIFICANTE|GEL INTIMO|JONTEX|PRUDENCE|VITAMIN\w*|MULTIVIT\w*|WHEY|CREATINA|COLAGENO|OMEGA|MELATONINA|CHA|CHAS|PROBIOTICO|TERMOMETRO|TENSIOMETRO|APARELHO DE PRESSAO|GLICOSIMETRO|FITA GLICEMIA|TESTE)\b")

SEM_PERF = rx(r"\b(S|C|COM|SEM)\s*(PERF\w*|PERFUMADO)\b|\bPERFUMAD\w*")
CABELO = rx(r"\b(SHAMPOO|SH|SHAMP|CONDICIONADOR|COND|CR PENT\w*|CREME PENT\w*|CAPILAR|CACHOS?|CACHEADO|ALISANTE|ALIS|MASC\w* CAPILAR|TINT\w*|COLORACAO|FINALIZADOR|GEL FIXADOR|TRATAMENTO CAPILAR)\b")

def categoria_nova(nome, lab, antiga, is_mip):
    n = norm(nome); l = norm(lab)
    if n in AJUSTES: return AJUSTES[n]
    if is_mip or antiga == "Medicamentos isentos de prescrição": return "Medicamentos"
    if INFANTIL.search(n) or l in {"ISABABY"}: return "Infantil e Gestante"
    if PERFUME.search(SEM_PERF.sub(" ", n)): return "Perfumes"
    if CABELO.search(n) or l in LABS_BELEZA: return "Beleza"
    if re.match(r"(DES|DESOD\w*|SAB|SABONETE)\b", n): return "Cuidado Diário"
    if antiga == "Pele e proteção solar": return "Dermocosméticos"
    if BELEZA.search(n) or l in LABS_BELEZA: return "Beleza"
    if antiga == "Suplementos e alimentos" or BEM_ESTAR.search(n): return "Bem Estar"
    if CUIDADO.search(n): return "Cuidado Diário"
    if antiga == "Perfumaria e higiene": return "Cuidado Diário"
    return "Categoria a conferir"

def main(path=ARQ):
    d = json.load(open(path, encoding="utf-8"))
    cont = collections.Counter(); amostra = collections.defaultdict(list)
    for it in d["itens"]:
        antiga = it.get("categoriaAntiga") or it["categoria"]
        it["categoriaAntiga"] = antiga
        it["categoria"] = categoria_nova(it["nome"], it.get("lab", ""), antiga, it.get("isMIP") is True)
        cont[it["categoria"]] += 1
        if len(amostra[it["categoria"]]) < 6: amostra[it["categoria"]].append(it["nome"])
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for c in CATEGORIAS: print(f"{cont[c]:5d}  {c:22s} {amostra[c]}")
    print(sum(cont.values()), "itens")

if __name__ == "__main__":
    main(*(sys.argv[1:2]))
