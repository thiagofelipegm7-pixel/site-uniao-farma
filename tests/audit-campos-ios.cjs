/* eslint-disable @typescript-eslint/no-require-imports -- script de linha de comando (CommonJS) */
// Procura campos de texto/seleção com letra menor que 16 px no iPhone (o Safari amplia a página ao tocar neles).
// Uso: node tests/audit-campos-ios.cjs http://localhost:4173
const {chromium,devices}=require('playwright');
const BASE=process.argv[2] || "http://localhost:4173";
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13'],locale:'pt-BR'});const p=await ctx.newPage();
const achados=new Map();
const olhar=async(nome)=>{await p.waitForTimeout(600);const r=await p.evaluate(()=>[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), select, textarea')].filter(e=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);return b.width>0&&b.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'}).map(e=>({el:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/)[0]:'')+(e.name?'[name='+e.name+']':'')+(e.placeholder?'['+e.placeholder.slice(0,20)+']':''),fs:parseFloat(getComputedStyle(e).fontSize)})).filter(x=>x.fs<16));for(const x of r){const k=x.el+' '+x.fs;if(!achados.has(k))achados.set(k,new Set());achados.get(k).add(nome)}};
const aceitar=async()=>{const a=p.getByText('Aceitar',{exact:true});if(await a.count())await a.first().click().catch(()=>{})};
await p.goto(BASE+'/');await p.waitForTimeout(1200);await aceitar();await olhar('home');
await p.goto(BASE+'/nacoes-unidas/produtos?q=dipirona');await p.waitForTimeout(2200);await olhar('lista');
const f=p.getByRole('button',{name:/Filtrar/});if(await f.count()){await f.first().click();await p.waitForTimeout(600);await olhar('filtro');await p.keyboard.press('Escape')}
await p.locator('.pv-cesta-botao').first().click();await p.waitForTimeout(400);
await p.goto(BASE+'/nacoes-unidas/produtos/acetona-ideal-100-ml');await olhar('produto');
await p.goto(BASE+'/reserva');await p.waitForTimeout(1200);await olhar('cesta');
await p.getByRole('button',{name:/Continuar: entrega ou retirada/}).first().click();await p.waitForTimeout(700);await olhar('retirada');
await p.getByText('Entrega no seu bairro').first().click();await p.waitForTimeout(500);await olhar('entrega');
await p.goto(BASE+'/entrega-de-medicamentos-em-sabara');await p.waitForTimeout(1000);await olhar('entrega-bairros');
await p.goto(BASE+'/departamentos/medicamentos');await p.waitForTimeout(2200);await olhar('medicamentos');
await p.goto(BASE+'/ofertas');await p.waitForTimeout(1000);await olhar('ofertas');
await p.goto(BASE+'/receita');await p.waitForTimeout(1000);await olhar('receita');
await p.goto(BASE+'/whatsapp');await p.waitForTimeout(1000);await olhar('whatsapp');
for(const [k,v] of achados) console.log(k,'|',[...v].join(', '));
console.log('total tipos:',achados.size);
await b.close()})();
