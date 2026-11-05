import json,re,csv,collections,sys
import os
AQUI=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,AQUI)
from lmip_data import load,norm,canon_of

MEDCL={'GENERICO','SIMILAR','ETICO','REFERENCIA'}
STRIP=re.compile(r'^(CLORIDRATO DE|DICLORIDRATO DE|BROMIDRATO DE|MALEATO DE|FENDIZOATO DE|MUCATO DE|BUTILBROMETO DE|NITRATO DE|SULFATO DE(?= NEOMICINA| HIDROXIQUINOLINA)|CITRATO DE(?= ORFENADRINA| PENTOXIVERINA)|ACETATO DE|PALMITATO DE|TINTURA)\s+')
WEAK={'UREIA','FENOL','TIMOL','IODO','GLICOSE','MENTOL','CANFORA','ENXOFRE','GLICEROL','SORBITOL','MACROGOL','BETAINA','ALANTOINA','COALTAR','TROLAMINA','PROPILENOGLICOL','CARBOMER','HIPROMELOSE','DEXTRANA','OXIDO DE ZINCO','ACIDO BORICO','ACIDO CITRICO','CLORETO DE SODIO','BICARBONATO DE SODIO','CARBONATO DE SODIO','CARBONATO DE CALCIO','CAFEINA','ACIDO ASCORBICO','COLECALCIFEROL','RETINOL','GLICONATO DE ZINCO','SULFATO DE ZINCO','SULFATO DE MAGNESIO','CITRATO DE SODIO','CITRATO DE POTASSIO','CLORETO DE POTASSIO','HIDROXIDO DE MAGNESIO','HIDROXIDO DE ALUMINIO','CARBONATO DE MAGNESIO','RACEALFATOCOFEROL','GUAIACOL','EUCALIPTOL','LEVOMENTOL','SIMETICONA','LACTULOSE','SORBITOL','CLORETO DE AMONIO','BENZOATO DE SODIO','BORATO DE SODIO','ACIDO PROPIONICO','ACIDO BENZOICO','IODETO DE POTASSIO','TERPINA','HIALURONATO DE SODIO','ALGINATO DE SODIO','POLIDOCANOL','ACIDO SALICILICO','DEXPANTENOL','COLAGENASE','NICOTINA','HEPARINA','LAURILSULFATO DE SODIO','FLUORETO DE SODIO','ACIDO AZELAICO'}
SP_ALIAS={'ACIDO ACETILSALICILICO':['AAS','ASPIRINA','ACIDO ACETILSALIC','ACETILSALICILICO'],
 'ACIDO ASCORBICO':['VIT C','VITAMINA C'],'CAFEINA':['CAF'],'DIPIRONA':['DIPIRONA SODICA'],'PARACETAMOL':['PARACET','ACETAMINOFENO'],
 'BUTILBROMETO DE ESCOPOLAMINA':['ESCOPOLAMINA'],'CLORIDRATO DE LIDOCAINA':['LIDOCAINA'],'BACITRACINA ZINCICA':['BACITRACINA'],'MALEATO DE CLORFENIRAMINA':['CLORFENIRAMINA']}

rows=load()
# build LMIP records
FORMFAM=[('VAG',r'VAGINAL'),('OFT',r'OFTALMIC'),('NAS',r'NASAL'),('OTO',r'OTOLOGIC'),('SUPOS',r'SUPOSIT|RETAL'),('SHAMPOO',r'XAMPU'),
 ('PASTILHA',r'PASTILHA|GOMA'),('ADESIVO',r'ADESIVO|EMPLASTO'),('INAL',r'INALATORI'),
 ('LIQORAL',r'SOLUCAO ORAL|XAROPE|SUSPENSAO ORAL|EMULSAO ORAL|^SOLUCAO$|SUSPENSAO DE USO LOCAL|^SOLUCAO\b'),
 ('TOPSEMI',r'CREME|POMADA|GEL(?!ATIN)|^PO DERMAT|PO DERMATOLOGICO|TABLETE|^OLEO'),
 ('TOPLIQ',r'SOLUCAO DERMAT|EMULSAO DERMAT|SUSPENSAO DERMAT|SOLUCAO SPRAY|SOLUCAO CAPILAR|ESMALTE|COLUTORIO'),
 ('PO',r'^PO\b|GRANULADO|PO EFERV|PO ORAL|PO PARA|^PO$'),
 ('SOLID',r'COMPRIMIDO|CAPSULA|DRAGEA')]
def fams(formstr):
    out=set()
    for part in re.split(r',| E ',norm(formstr)):
        part=part.strip()
        if not part: continue
        for f,rx in FORMFAM:
            if re.search(rx,part):
                out.add(f); break
    return out
def lp(formstr): return bool(re.search(r'LIBERACAO (PROLONGADA|RETARDADA)',norm(formstr)))
NUMRX=r'(\d+(?:[.,]\d+)?)'
def tonum(t):
    if re.fullmatch(r'\d+\.\d{3}',t): return None  # ambiguous
    return float(t.replace(',','.'))
def lmip_nums(conc):
    c=norm(conc); c=re.split(r'\(|; OU',c)[0]
    toks=re.findall(NUMRX+r'\s*(MG|MCG|G|UI|U\.?I\.?|U|ML)?',c)
    vals=[]
    for t,u in toks:
        if u=='ML': continue
        v=float(t.replace(',','.')) if not re.fullmatch(r'\d{1,3}(\.\d{3})+',t) else float(t.replace('.',''))
        if u=='G': v*=1000
        if u=='MCG': v/=1000
        vals.append(v)
    return vals
recs=[]
for name,forms,conc in rows:
    comps=[canon_of(c) for c in re.split(r'\s*\+\s*|,\s',name) ] if not name.startswith('Tintura') else ['MATRICARIA CHAMOMILLA','LIDOCAINA','POLIDOCANOL']
    core=[]
    for c in comps:
        c=STRIP.sub('',c).strip()
        core.append(c)
    recs.append(dict(core=frozenset(core),forms=forms,fams=fams(forms),lp=lp(forms),nums=lmip_nums(conc),conc=conc,name=name))
CORES=set(c for r in recs for c in r['core'])
# lexicon of drug words from generics
FILL=set('CX COMP COMPR CPR CPS CAP CAPS DE E C COM PARA SOL XPE XRP GTS GOTAS ORAL CREME GEL POM SUSP INJ AMP FR ENV DRG REVEST EFERV LP XR RETARD SR MG ML G UI MCG SODICA POTASSICA CALCICA CLORIDRATO MALEATO SULFATO BROMIDRATO TARTARATO SUCCINATO FUMARATO BESILATO MESILATO FOSFATO DIPROPIONATO VALERATO ACETATO CITRATO NITRATO LACTATO ESTEARATO PROPIONATO BENZOATO DIPIRONA'.split())
def prephrase(n):
    n=norm(n); m=re.search(r'\d',n)
    return n[:m.start()] if m else n
LEX=set(json.load(open(os.path.join(AQUI,'lexico.json'),encoding='utf-8')))  # palavras de ativos dos genéricos (fixo; veja README)

# ---------- product side ----------
PF=[('VAG',r'VAG(INAL)?|OVULO|CR VAG'),('OFT',r'COLIRIO|OFT|OFTALM'),('NAS',r'NAS(AL)?|SPR NAS|SPRAY NASAL|SOL NAS'),('OTO',r'OTO|OTOLOG'),
 ('SUPOS',r'SUPOS|SUP'),('SHAMPOO',r'XAMPU|SHAMPOO'),('PASTILHA',r'PASTILHA|PAST|GOMA'),('ADESIVO',r'ADESIVO|EMPLASTO|ADES'),
 ('LIQORAL',r'XPE|XRP|XAROPE|GTS|GOTAS|SUSP|SUSPENSAO|SOL ORAL|SOLUCAO ORAL|SOL OR|EMULSAO ORAL|SOLUCAO|SOL'),
 ('TOPSEMI',r'CREME|CREM|CR|POM|POMADA|PDA|GEL|BISN'),
 ('TOPLIQ',r'SOL DERM|SOLUCAO DERM|SPRAY|LOCAO|SPR|COLUTORIO'),
 ('PO',r'ENV|ENVELOPE|SACHES?|GRANULADO|PO'),
 ('SOLID',r'COMP\w*|CPRS?|CPS|CAPS?|CAPSULAS?|DRG|DRAGEAS?|COM REV|CP|CR[0-9]*')]
PF=[(f,r'(?<![A-Z])(?:'+rx+r')(?![A-Z])') for f,rx in PF]
def pforms(n):
    out=set()
    for f,rx in PF:
        if re.search(rx,n): out.add(f)
    if 'TOPSEMI' in out and 'SOLID' in out and re.search(r'(?<![A-Z])CR(?![A-Z])',n) and not re.search(r'(?<![A-Z])(COMP\w*|CPRS?|CPS|CAPS?|CP)(?![A-Z])',n): out.discard('SOLID')
    if not out and re.search(r'\d\s*ML|MG/ML|MG/G',n): out|={'LIQORAL','TOPLIQ'}
    return out
def plp(n): return bool(re.search(r'\bLP\b|\bXR\b|\bSR\b|RETARD|PROLONG|\bLD\b|\bLIB PROL|\bMR\b|\bOD\b',n))
def pstrength(n,forms):
    # returns list of numbers in mg-ish or None
    solid='SOLID' in forms and not (forms-{'SOLID','PO'})
    m=re.search(NUMRX+r'((?:\s*[+/]\s*'+NUMRX+r')*)\s*(MG|MCG|G|UI)\b(\s*/\s*(ML|G))?',n)
    # careful with pack-size grams for non solids
    for m in re.finditer(NUMRX+r'((?:\s*[+/]\s*'+NUMRX+r')*)\s*(MG|MCG|G|UI)\b(\s*/\s*(ML|G))?',n):
        unit=m.group(4); per=m.group(6)
        if unit=='G' and not solid and not per: continue
        if unit=='G' and not per and re.search(r'\bCX\b|FR|BG|BISN|TUBO',n[max(0,m.start()-4):m.start()]): continue
        grp=m.group(1)+m.group(2)
        nums=re.findall(NUMRX,grp)
        vals=[]
        for t in nums:
            if re.fullmatch(r'\d+\.\d{3}',t): return 'AMBIG'
            v=float(t.replace(',','.'))
            if unit=='G': v*=1000
            if unit=='MCG': v/=1000
            vals.append(v)
        return vals
    return None

_ITEMS=None
def _items():
    global _ITEMS
    if _ITEMS is None:
        items=[(c,c) for c in CORES]
        for k,al in SP_ALIAS.items():
            core=STRIP.sub('',k).strip()
            for a in al: items.append((core,a))
        items.sort(key=lambda x:-len(x[1]))
        out=[]
        for core,a in items:
            full=re.compile(r'(?<![A-Z])'+re.escape(a).replace(r'\ ',r'[\s\W]*')+r'(?![A-Z])')
            pre=[]
            if ' ' not in a and len(a)>=9:
                for L in range(len(a)-1,6,-1):
                    pre.append(re.compile(r'(?<![A-Z])'+re.escape(a[:L])+r'(?![A-Z])'))
            out.append((core,full,pre))
        _ITEMS=out
    return _ITEMS
def find_cores(n):
    found=set(); work=' '+n+' '
    for core,full,pre in _items():
        if full.search(work):
            found.add(core); work=full.sub(' @ ',work,count=1); continue
        for p in pre:
            if p.search(work):
                found.add(core); work=p.sub(' @ ',work,count=1); break
    return found,work

def match_mip(n,cores,forms,lpflag,strength,brand_fixed=None):
    """return (status,reason) status in MIP/NO/REV"""
    cand=[r for r in recs if r['core']==frozenset(cores)]
    if not cand: return 'NO','combinação/ativo não consta na LMIP'
    if not forms: return 'REV','ativo consta na LMIP mas forma farmacêutica não identificada no nome'
    cand2=[r for r in cand if (r['fams']&forms) and (r['lp']==lpflag or not lpflag and not r['lp'] or (not r['lp'] and False))]
    # LP: product LP must match LP row; non-LP product matches non-LP rows (or rows with both)
    cand2=[]
    for r in cand:
        if not (r['fams']&forms): continue
        if lpflag and not r['lp']: continue
        if (not lpflag) and r['lp'] and not re.search(r',',r['forms']): continue
        cand2.append(r)
    if not cand2: return 'NO','forma farmacêutica não consta na LMIP para esse ativo'
    if strength=='AMBIG' : return 'REV','concentração ambígua no nome'
    if strength is None: return 'REV','ativo/forma constam na LMIP mas concentração não aparece no nome'
    ok=False; over=False
    for r in cand2:
        nums=r['nums']
        if len(nums)<len(strength) or not nums: 
            continue
        if len(cores)==1:
            if strength[0]<=nums[0]+1e-9: ok=True
            else: over=True
        else:
            if len(strength)==len(nums) and all(a<=b+1e-9 for a,b in zip(sorted(strength),sorted(nums))): ok=True
            else: over=True
    if ok: return 'MIP','ativo+forma+concentração dentro da LMIP (IN 285/2024 consolidada)'
    if over: return 'NO','concentração acima do limite MIP ou diferente da LMIP'
    return 'REV','não consegui comparar concentração'

BRANDS={}   # filled in brands.py
def classify_item(it):
    n=norm(it['Produto']); cl=it['Classe']
    forms=pforms(n); lpf=plp(n)
    cores,rest=find_cores(n)
    ph=prephrase(it['Produto'])
    # brand map
    b=None
    for rx,(bc,bnote) in BRANDS.items():
        if re.search(rx,n): b=(bc,bnote); break
    if b and not cores:
        cores=set(b[0])
    strength=pstrength(n,forms)
    # unexplained lexicon words (extra drugs)
    extra=[w for w in re.findall(r'[A-Z]{5,}',re.sub(r'\bSODICA?\b|\bPOTASSICA?\b','',prephrase(n))) if w in LEX and not any(w in c or c in w or w[:7] in c for c in cores)]
    return dict(n=n,cores=cores,forms=forms,lp=lpf,strength=strength,extra=extra,brand=b)
