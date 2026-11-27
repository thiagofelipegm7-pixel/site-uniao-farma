# União Farma — regras do site

## Ordem de prioridade das regras (cumprimento rigoroso e obrigatório)

Estas regras devem ser **severamente seguidas**. Quando duas entrarem em conflito, vale a de cima, e quem trabalhar no site deve dizer qual regra venceu:

1. **Acessibilidade AAA** — [`ACCESSIBILITY.md`](./ACCESSIBILITY.md). Regra número 1: nunca cede.
2. **Conversão** — [`CONVERSAO.md`](./CONVERSAO.md), as 23 Leis Definitivas de Conversão.
3. **Direção artística** — o resto deste arquivo. Vale sempre que não contrariar as duas primeiras.

Acima das três, como **limite legal**: as regras R-xx de `CONFORMIDADE.md` (RDC 44 e 96, LGPD, consumidor). Nenhuma das três regras pode violá-las. As regras V-xx e P-xx do mesmo arquivo, e as regras S-xx de `SEO-IA.md` (33 leis de SEO para IA), valem no nível logo abaixo da conversão e acima da direção artística.

Leia e aplique integralmente os quatro documentos abaixo em toda mudança de interface, texto, formulário, dado, oferta, conteúdo ou código de página. Cada regra tem um ID (A-xx, C-xx, R-xx, V-xx, P-xx, S-xx) para citar na resposta e no Pull Request.

@ACCESSIBILITY.md
@CONVERSAO.md
@CONFORMIDADE.md
@SEO-IA.md

# União Farma — direção artística

Resumo da taxonomia de design do site. Vale para todas as páginas. Em caso de dúvida, siga estas regras (respeitando a ordem de prioridade acima).

## Princípios

- Sem linha: nada de bordas nem divisores.
- Profundidade vem de sombra 3D e de menos elementos, nunca de contorno.
- Menos elementos na tela. Branco e preto resolvem quase tudo.

## Paleta (únicas cores permitidas)

| Uso | Cor |
| --- | --- |
| Verde-água no cabeçalho (`header.shop-header`) e nos botões de adicionar à cesta (página de produto e botão + dos cartões) | `#9FE3D6` |
| Fundo, superfícies e cartões | `#FFFFFF` |
| Texto, botões e único tom escuro | `#000000` |
| Erro | `#B3261E` |
| Aviso | `#FFE600` |

Proibido: qualquer cinza (`#c4c8cd`, `#bdbdbd`, `#d5d9dd`...), verde fora do cabeçalho, degradê perolado, sombra colorida, sombra com luz branca, `inset`.

## Superfícies e botões

- Superfície padrão: cartão branco.
- Botão principal: pílula preta com texto branco. Sem borda.
- Seleção e estados: resolvidos com preto e branco, sem cinza.

## Sombras

Sem sombra em cabeçalho, campo de busca, sacola e ícones. Quando houver profundidade, ela é sombra preta suave, sem tom colorido.

## Tipografia e composição

1. Escala tipográfica pequena e coerente.
2. Títulos dos cards menores que os títulos das seções.
3. Peso 400 no texto; 400 ou 500 nos títulos.
4. Títulos retos. Nada de itálico.
5. Texto dos cards 1 px menor que o texto semelhante fora deles.
6. Texto dos botões 1 px menor que o texto ao redor.
7. Quanto maior a letra, menos espaçamento entre as letras.
8. Entrelinha ajustada nos títulos grandes.
9. Espaço generoso entre as seções.
10. Títulos de várias linhas equilibrados (`text-wrap: balance`). Nada de palavra solta na última linha.
11. Sem etiquetas decorativas, badges nem botões redundantes.
12. Uma sans serif para o texto e uma única família para todos os títulos.
13. Preferir fotos reais e de qualidade.

## Implementação (CSS)

- Camada `@layer base-direcao` é declarada primeiro (`base-direcao-layer.css`). `!important` de camada anterior vence `!important` fora de camada. Overrides da direção ficam **dentro** do bloco `base-direcao` no fim de `app/base-direcao.css`.
- Regras só da home: `app/home-direcao.css`.
- Escopos por página: `html body:has(#vitrine-higiene)`, `html body:has(.recipe-page)`, `html body:has(.blog-pagina)`, `html body header.shop-header`.
- Para vencer regras globais com `!important`, dobre a classe (`.a.a`) ou acrescente ancestrais.

## Páginas já alinhadas

- Cesta e Pix (BR Code estático, QR, comprovante em duas páginas).
- Home, blog (Popular, Últimos conteúdos, carrosséis por tema; rodapé oculto) e receita.
- Loja: listagem, departamento e produto (escopo `html body:has(.catalogo-nacoes)`), aviso de cookies e círculos de marcas. Lista restrita (medicamentos com receita) e texto do produto também conferidos.
- Painel interno: ajustado, mas ainda não conferido visualmente (exige login).

## Pendências conhecidas

- Resquícios de verde em `app/receita-polish.css` (regras de `.direct-unit-*`, sem uso na página de receita) e no gatilho `.receita-gatilho` de outras páginas. A janela "Ler receita" já está em preto e branco (bloco no fim de `app/base-direcao.css`).

## Conteúdo de saúde

Artigos do blog ficam `publicado: false` até revisão de farmacêutico. Nunca publicar conteúdo de saúde sem revisão.

## Segredos

A chave Pix (`VITE_PIX_CHAVE`) fica só em `.env.local` (fora do git). Nunca colocar chaves ou tokens em arquivos versionados.

## Arquivo de referência

A taxonomia completa em HTML (seções 1 a 11) está em `docs/taxonomia-direcao-artistica.html`, se existir. Caso contrário, peça para regenerar.
