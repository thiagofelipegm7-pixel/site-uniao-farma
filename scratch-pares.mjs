import { readFileSync } from "node:fs";
import { criarVocabulario, corrigirPalavra } from "./app/nacoes-unidas/produtos/busca-tolerante.ts";
const a=JSON.parse(readFileSync("public/dados/nacoes/catalogo-busca.json","utf8"));
const b=JSON.parse(readFileSync("public/dados/nacoes/restritos-busca.json","utf8"));
const textos=[...a,...b].map(i=>i.busca);
const full=criarVocabulario(textos);
const out=[];
for(const p of full.palavras){ if(p.w.length<5||/\d/.test(p.w))continue;
  const rest=full.palavras.filter(x=>x.w!==p.w);
  const v={...full,palavras:rest,porPalavra:new Map(rest.map(x=>[x.w,x]))};
  const c=corrigirPalavra(v,p.w); if(c) out.push([p.w,c,p.f,full.porPalavra.get(c).f]);}
console.log(out.length); for(const o of out.sort((x,y)=>y[2]-x[2]).slice(0,70)) console.log(o.join("  →  "));
