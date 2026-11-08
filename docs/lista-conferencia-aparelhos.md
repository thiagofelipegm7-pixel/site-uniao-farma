# Lista de conferência — 3 aparelhos de referência

**Data:** 8 de novembro de 2026

## Aparelhos
- iOS
- Android
- PC

(Modelos específicos a definir no momento do teste.)

## Lista de conferência

Em cada aparelho, conferir:

- [ ] Abrir a home e buscar um produto em até 3 toques
- [ ] Adicionar à cesta e enviar pelo WhatsApp
- [ ] Ver preço, estoque e foto do produto
- [ ] Testar em 4G (não só Wi-Fi)
- [ ] Conferir rodapé com AFE e Alvará

## Parte automática (roda no computador, em segundos)

`tests/teste-aparelhos.cjs` repete a lista acima em três perfis emulados no Chromium: PC, Android de entrada (Pixel 7, 4G e CPU 4 vezes mais lenta) e iPhone 13.
Confere: home abre em até 2,5 s, busca até a cesta em 3 toques, preço e foto no produto, mensagem do WhatsApp pronta, rodapé com Alvará e AFE,
sem rolagem lateral, campos de 16 px (o iPhone não amplia a página) e sem erro de JavaScript.

```bash
npm run build
npx vinext start -p 4311 &
node tests/teste-aparelhos.cjs http://localhost:4311
```

Resultado de 08/11/2026: tudo certo nos três perfis (home em 1,6 s no Android emulado).

## Parte manual (precisa dos aparelhos de verdade)

O emulador **não** substitui o Safari do iPhone nem a rede real. Antes da abertura, uma pessoa confere num iPhone, num Android e num PC:

- [ ] Home abre e a busca acha o produto (digitar "dipirona")
- [ ] Tocar no produto da lista de sugestões abre a página dele (iPhone: com o teclado aberto)
- [ ] Adicionar à cesta, passar pelos 3 passos e tocar em "Enviar pedido pelo WhatsApp": o WhatsApp abre com a mensagem pronta
- [ ] Produto com receita: pede a foto da receita e o aviso de anexar aparece depois do envio
- [ ] Foto, preço e "acabou" corretos (comparar com a loja)
- [ ] Tudo isso em 4G, com o Wi-Fi desligado
- [ ] Rodapé com Alvará Sanitário e AFE nas páginas Início, Ofertas e Perguntas
