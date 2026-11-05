import json,re,csv,collections,sys
import classify as C
from classify import norm,pforms,plp,pstrength,find_cores,match_mip,LEX,WEAK
import brands as B
JUNK=set('ABACAXI ACIDO AFERIMENTO ALBEL ANLOD BABYSEC BENZILA BIOGRIPE BIOSINTETICA CARBONATO CETOR CLIOQ COLIRIO DELTAPIL DIETILAM DIMETIGASS ESPACADOR EUROFARMA EXPEC FLEXMUSCULAR FRALDA GLICOSE INALAR LACRIVISION LIDIAL LISINA MEDOX NITRAT OLAMINA OXIDO PLABEL POMADA POTASSICO SABONETE SALICETIL SEAKALM SODICO SODIO SUCCI VAGINAL VALESSONE VITAMINA ZINCO ORABASE PROCTOSAN OTOMIXYN MELATONINA REPOFLOR NEOLEFRIN MIOSAN FENDIZOATO HEMIFUMARATO HIDRO HIDROC HIDROCLOR HIDROCLOROT SIMETICONA TROMETAMOL LIDOCAINA'.split())
LEX2={w for w in LEX if w not in JUNK and not any(w==C.norm(x) for x in WEAK)}
MEDCL={'GENERICO','ETICO','SIMILAR','REFERENCIA','FRACIONADO'}
SUPCL={'SUPLEMENTOS','ALIMENTOS'}
DRUGLIKE=re.compile(r'\b(XPE|XAROPE|XRP|GTS|GOTAS|COLIRIO|COLIR|SOL OFT|SOL OTO|INJ|AMP|AMPOLA|SUPOS\w*|CPR|CPRS|COMP|CAPS|CAPSULAS?|CPS|DRG|FLACONETE|ENV)\b')
PHYTO=re.compile(r'CASTANHA DA INDIA|ESPINHEIRA|GUACO|CALENDULA|ARNICA|ALOE|CAMOMILA|MELISSA|MARACUJA|GINSENG|GUARANA|BOLDO|PSYLLIUM|SENE\b|CASCARA|HAMAMELIS|ALCACHOFRA|CENTELLA|GENGIBRE|\bHERA\b|VALERIANA|PASSIFLORA|ERVA|PROPOLIS|ECHINACEA|GINKGO|CARDO MARIANO|CIMICIFUGA|SOJA')
MANUAL=re.compile(r'MUCOS|IOIMBINA|YOHIMBINA|APRACUR|CIMEGRIPE|EXPECTOVIC|PARAGORICO|LACDAY|ENTEROGERMINA|ZEROLAC')
def fixpct(n):
    n=re.sub(r'\b0 (\d+)(?=\s*(MG|MCG|ML|G|%))',r'0.\1',n)
    n=re.sub(r'\b(\d) (\d{2})(?=MG/ML)',r'\1.\2',n)
    n=re.sub(r'(\d+(?:[.,]\d+)?)\s*MG\s*/\s*(\d+)\s*ML',lambda m:'%g MG/ML'%(float(m.group(1).replace(',','.'))/float(m.group(2))),n)
    return n
def pct(n):
    m=re.search(r'(\d+(?:[.,]\d+)?)\s*%',n)
    if not m: return None
    t=m.group(1)
    if not re.search(r'[.,]',t) and t.startswith('0') and len(t)>1: t='0.'+t[1:]
    return [float(t.replace(',','.'))*10]
def run_engine(n,cores,forms,lpf,strength,brand):
    if brand: 
        fs=brand[1] or forms
        lpf = brand[2] if brand[2] is not None else lpf
        st=strength
        if st is None and len(cores)==1: st=pct(n)
        if st is None and brand[3]: st=list(brand[3])
        return match_mip(n,cores,set(fs) if fs else set(),lpf,st)
    st=strength
    if st is None and len(cores)==1: st=pct(n)
    return match_mip(n,cores,forms,lpf,st)
def classify(it):
    n=fixpct(norm(it['Produto'])); cl=it['Classe']; med=cl in MEDCL
    if it.get('ProdutoControlado') in (True,1,'1') or it.get('ProdutoAntimicrobiano') in (True,1,'1'):
        pass
    if cl in ('CONTROLADO','CARTELADOS'): return 'EXC','classe '+cl+' (controlado/cartelado)'
    if re.search(r'TAXA DE ENTREGA',n): return 'EXC','não é produto (taxa de entrega)'
    if re.search(r'PAREGORICO|PAREGORICO|REPOPIL|ANTICONCEP|PILULA',n): return 'EXC','contém ópio ou hormônio (controlado/exige receita)'
    if re.search(r'LAKESIA|PROCTAN|NEVRIX|IMEGOV|MINANCORA|HIPOGLOS|BASILICAO|SUPOSITORIO DE GLICERINA|SAL AMARGO|CLORETO DE MAGNESIO|BICARBONATO|SPRAY MEL E PROPOLIS|RESFRILIV|FARMAIODINE|ANTIMICOTICA|NATUS GERIN|PROPOLIS|SORO FISIOLOGICO|VIOLETA GENCIANA|DOUTORSAN|NOCALVE|RIODEINE|CANFORA|VASELINA LIQ|GLICERINA BI|PLANTA GOLD|MERTIOLATE|ALCOOL IODADO|SOROX|VALESSONE|PERILAC|FUMAGUM|SPRAY MEL|NAC 600|CIMICIFUGA|NICOTINA',n): return 'REV','produto comumente tratado como medicamento/antisséptico/fitoterápico; não mapeado na LMIP; RT confirmar'
    lv=r'\b(REPELENTE|TESTE GRAVIDEZ|TINT |TINT$|HID MONANGE|K MED GEL LUBRIF|K-SEX|BEPANTOL BABY)' if med else B.LIVRE
    if re.search(lv,n) and not re.search(r'\bNOXX\b',n): return 'LIVRE','produto não medicamento (correlato/higiene/alimento/cosmético)'
    forms=pforms(n); lpf=plp(n); strength=pstrength(n,forms)
    # brand map
    brand=None
    for rx,cores,fams,lp,conc,note in B.BR:
        if cores and re.search(rx,n):
            brand=(cores,fams,lp,conc,note); break
    if brand:
        cores=set(brand[0])
        r=run_engine(n,cores,forms,lpf,strength,brand)
        if r[0]=='MIP': return 'MIP',brand[4]+' | '+r[1]
        if r[0]=='REV': return 'REV','marca '+brand[4]+': '+r[1]
        return 'EXC','marca '+brand[4]+': '+r[1]
    groups=B.REV+(B.REVVIT if (med or cl in ('LIBERADO','VAREJINHO')) else [])
    for rx,why in groups:
        if re.search(rx,n):
            if cl in SUPCL and 'fitoter' not in why: continue
            return 'REV',why
    if cl=='LIBERADO' and re.search(r'CARTELA|\bCICLO\b|ANTICONCEP',n) : return 'EXC','anticoncepcional hormonal (exige receita)'
    cores,rest=find_cores(n)
    cores={c for c in cores}
    nonweak={c for c in cores if c not in {norm(w) for w in WEAK}}
    extra=[w for w in re.findall(r'[A-Z]{6,}',rest) if w in LEX2]
    if cores=={'ACIDO ACETILSALICILICO'}:
        sa=pstrength(n,forms)
        if isinstance(sa,list) and sa and sa[0]<300: return 'EXC','AAS em dose baixa (uso cardiovascular) fora da indicação MIP'
    use=cores if (med or nonweak) else set()
    if use:
        if extra: r=('NO','contém outro ativo fora da combinação LMIP: '+','.join(extra))
        else: r=run_engine(n,use,forms,lpf,strength,None)
        if r[0]=='MIP': return 'MIP',r[1]+' | ativos: '+' + '.join(sorted(use))
        if r[0]=='REV': return 'REV',r[1]+' | ativos: '+' + '.join(sorted(use))
        if cores=={'PARACETAMOL'} and 'LIQORAL' in forms and 'forma farmac' in r[1]: return 'REV','paracetamol líquido (gotas/solução): forma não localizada no anexo da LMIP parseado; RT confirmar | ativos: PARACETAMOL'
        return 'EXC',r[1]+' | ativos: '+' + '.join(sorted(use))
    if med:
        if extra: return 'EXC','ativo de medicamento sem prescrição dispensada fora da LMIP: '+','.join(extra)
        return 'EXC','marca/ativo não mapeado na LMIP; assumido medicamento com receita'
    # non-med classes
    if extra: return 'EXC','contém ativo de medicamento ('+','.join(extra)+') em classe não-medicamento'
    if MANUAL.search(n): return 'REV','possível medicamento/probiótico em classe '+cl+'; RT confirmar'
    if cl not in SUPCL and DRUGLIKE.search(n) and re.search(r'\d',n) : return 'REV','forma tipo medicamento em classe '+cl+'; RT confirmar'
    if cl not in SUPCL and PHYTO.search(n) and DRUGLIKE.search(n): return 'REV','possível fitoterápico; RT confirmar'
    return 'LIVRE','classe '+cl+' (não medicamento)'
