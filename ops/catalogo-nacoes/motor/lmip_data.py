import json,re,unicodedata,os
def norm(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().upper()
    return re.sub(r'\s+',' ',s).strip()
SALT_PREFIX=re.compile(r'^(CLORIDRATO|DICLORIDRATO|BROMIDRATO|MALEATO|SULFATO|NITRATO|ACETATO|CITRATO|FENDIZOATO|MUCATO|BUTILBROMETO|FOSFATO|TARTARATO|BESILATO|SUCCINATO|CLORETO|SUBGALATO|SALICILATO|CARBONATO|PALMITATO|ACIDO|HIDROXIDO|OXIDO|SULFETO|IODETO|BICARBONATO)\s+(DE\s+)?')
def canon_of(comp):
    c=norm(comp)
    c=re.sub(r'\(.*?\)','',c).strip()
    c=re.sub(r'\b(MONOIDRATAD[AO]|HEPTAIDRATAD[AO])\b','',c)
    c=re.sub(r'\b(SODICO|SODICA|DIETILAMONIO|POTASSICO)\b$','',c).strip()
    c=re.sub(r'\s+',' ',c).strip()
    return c
def load():
    d=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'lmip.json'),encoding='utf-8'))
    rows=[]
    for i,r in enumerate(d['anexoI']):
        name,forms,conc=r[0],r[2],r[3]
        if i==54: forms,conc='Pomada dermatológica','5 + 200 + 50 mg/g'
        if i==91: forms,conc='Solução oral','0,4 + 20 + 4 + 6 mg/mL'
        if i==247: forms,conc='Suspensão de uso local','25 + 25 + 15 mg/mL'
        if i==25: conc='250 + 106,5 + 187,5 mg'   # IN 388/2025
        if i==26: conc='50 + 21,3 + 32,5 mg/mL'   # IN 388/2025
        if i==46: conc='230 + 178 + 185 mg'
        rows.append((name,forms,conc))
    rows+= [('Ciclopirox','Esmalte','80 mg/mL'),                  # IN 388/2025
            ('Ciclopirox olamina','Creme dermatológico','10 mg/g'),
            ('Ciclopirox olamina','Solução spray dermatológica','10 mg/mL'),
            ('Omeprazol','Cápsula dura, cápsula dura de liberação retardada','20 mg')]  # IN 404/2025
    return rows
