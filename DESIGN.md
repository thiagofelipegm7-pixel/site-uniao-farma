# DESIGN.md — Redesenho visual · União Farma Sabará

> Proposta de direção de arte e sistema visual. **Nenhum código do site foi alterado.**
> Base: site ao vivo em 25/10/2026, capturado em 390×844 (mobile, emulação real) e 1440×900, + leitura do repositório (`app/tokens.css`, `app/globals.css`, `site-config.ts`, `unit-photos.ts`).
> Dados (endereço, telefone, horário, preço) **não são citados aqui de propósito**: tudo continua vindo de `site-config.ts` e `offers.ts`.

---

## 0. Diagnóstico geral (vale para todas as páginas)

| Tema | Hoje | Problema | Direção |
|---|---|---|---|
| Cor | `--uf-green #148f8a`, `--teal #1b5e4b`, `--aqua #0e9a8a`, botão "Pedir no WhatsApp" em verde #1a7a3a | 4+ verdes diferentes. Nenhum é o teal da marca | Só `#279B82` / `#187D68` + 2 tons derivados |
| Fundo | `--paper #f6fbf8` / `#f1fbfa` em tudo | Site inteiro "esverdeado", sem respiro, sem contraste entre seções | Base **#FFFFFF**. Teal-50 só em faixas de destaque |
| Preço | Preço em teal (`R$ 13,90`) | Fere a regra da marca. Preço não salta | Preço em **rubi #B81D24**, Poppins 700 |
| CSS | 23 arquivos CSS (`globals` 7.984 linhas, `overrides`, `visual-fixes`, `visual-quality`…) | Camadas de correção. Estilo imprevisível | Um `@theme` + componentes. Remover camadas na implementação |
| Tipo | H1 mobile 22–24px; H2 "Escolha a oferta…" ~40px | Hierarquia invertida: H2 maior que H1 | Escala única (seção 2.2) |
| Toque | Links 20–33px de altura (rodapé, "Outras lojas", "Ver página da unidade", "Consultar na loja") | Falha os 44px | Todo alvo ≥ 44×44 |
| Carrossel | Cards de loja e oferta em scroll horizontal no mobile | 2º card cortado. Nações e Itacolomi ficam escondidas | Lista vertical compacta |
| Barra fixa | `mobile-quick-nav` (85px): Oferta · Lojas · Receita | Não tem WhatsApp. O CTA principal some ao rolar | Barra com WhatsApp como ação principal |
| Mascote | Não está no repositório (`public/` tem só ícone genérico de moto) | Elemento da marca ausente | Criar slot fixo. **Pedir o arquivo original ao dono** (SVG/PNG transparente) |
| Fotos | Fátima = interior (perfumaria) · Nações = fachada · Itacolomi = interior (medicamentos) | Sem padrão: duas mostram prateleira, não a loja | Pedir **fachada de Fátima e Itacolomi**. Até lá, manter as atuais com o rótulo honesto "Interior" |

---

## 1. Análise por página

### 1.1 Home `/`

| | Mobile 390 | Desktop 1440 |
|---|---|---|
| **Funciona** | H1 claro "3 lojas perto de você". Selo "Aberto agora · fecha às…" dinâmico. Fotos reais | 3 cards de loja lado a lado. Header limpo com CTA WhatsApp |
| **Mudaria** | 1ª dobra mostra 1 loja só, cortada. Botão "Como chegar" escondido pela barra. Bloco "Escolha a oferta…" maior que o H1. 3 botões fantasma seguidos ("Consultar preço", "Ver se entrega", "Enviar receita"). 6 cards de categoria + 4 "stats" = muito ruído. "Por que chamar agora" soa como urgência de compra | Hero ocupa a largura toda com o texto colado à esquerda e um vazio à direita. Cards muito altos (~620px). H2 de 4 linhas na coluna esquerda com metade da tela vazia. FAB do WhatsApp duplica o CTA do header |
| **Por quê** | O cliente vem do Instagram/WhatsApp e quer **escolher a loja e falar**. Tudo antes disso é atrito | Menos altura = as 3 lojas e o grupo de ofertas cabem em ~1,5 tela |

### 1.2 Lojas `/fatima`, `/nacoes-unidas`, `/itacolomi`

As 3 páginas usam o mesmo template. A análise vale para todas.

| | Mobile | Desktop |
|---|---|---|
| **Funciona** | Endereço completo e selo de status no topo. Horário em tabela. FAQ útil para SEO. Na Nações, o "Estacionamento gratuito" vem do dado real | Foto + informações em 2 colunas |
| **Mudaria** | Foto 1:1 (~330px) empurra o CTA para baixo da dobra. Botão "Pedir no WhatsApp" em verde fora da marca. "Ligar" é só um link de texto. "Sobre a loja", bairros, pagamento e FAQ vêm todos abertos, num muro de texto sem respiro (~2.000px). "Outras lojas" tem links de 30px. O mapa interativo mostra as 3 lojas e não foca nesta | Bloco "Sobre/FAQ" corre a 1.100px de largura (linha longa demais). Grupo de Ofertas sai do grid (largura diferente das outras seções). Topo com ~120px de respiro morto acima da foto |
| **Por quê** | Na página da loja, o cliente já escolheu: **WhatsApp da loja na 1ª dobra**, sem rolar | Medida de leitura de 60–75 caracteres. Alinhar tudo ao grid |

### 1.3 Receita `/receita`

| | Mobile | Desktop |
|---|---|---|
| **Funciona** | Página curta e objetiva. Passos 1-2-3. Um botão por loja com o status | Os 3 cards em linha |
| **Mudaria** | Os passos 1-2-3 em cards de 3 colunas ficam apertados (texto quebra em 2 linhas). O nome da loja está centralizado e o botão alinhado à esquerda (eixo quebrado). O aviso "Controlado e antibiótico saem na loja" fica fraco no fim | A página termina em ~700px e o resto da tela fica vazio até o rodapé. Um círculo decorativo flutua sem função |
| **Por quê** | Receita é o fluxo de maior intenção. Precisa de passos lineares e do aviso legal **antes** do botão | Preencher a página com o mascote/ilustração ou deixar o rodapé subir. Nada de vazio |

### 1.4 Ofertas `/ofertas`

| | Mobile | Desktop |
|---|---|---|
| **Funciona** | A data "Encarte conferido em…" passa confiança. "Enquanto durar o estoque" em cada card. Grade 3×3 no desktop | Grade regular. A seção "Escolha a unidade" vem logo depois das ofertas |
| **Mudaria** | O 1º botão é o Grupo de Ofertas (deveria ser o secundário). "Avisar novas ofertas" é um 3º CTA concorrendo com os outros. "Em destaque" virou carrossel com o 2º card cortado. O preço está em teal. O título "Em destaque" está colado na borda (sem margem) | Preço pequeno (~16px) e na mesma cor do texto. A arte do encarte já traz selos vermelhos, e repetir outro selo vira poluição |
| **Por quê** | Preço tem que ser lido em 1 segundo. O CTA do card vai para o WhatsApp da loja | Hierarquia: **foto → nome → preço rubi → condição → botão** |

### 1.5 Cabeçalho e rodapé (todas as páginas)

| | Hoje | Mudaria |
|---|---|---|
| Header mobile | Logo + "UNIÃO FARMA". Na home tem botão WhatsApp; nas outras páginas, não | Mesmo header em todas: logo, nome e botão WhatsApp 44×44. Menu dentro da barra inferior |
| Header desktop | Os menus da home e das páginas internas são diferentes (3 itens × 6 itens) | Um menu só: Lojas · Ofertas · Receita · Entrega · Perguntas, com o CTA WhatsApp à direita |
| Rodapé | "CONTATO" em ~48px (maior que o H1). O CNPJ aparece 2×. Links de 20px. O aviso legal é um bloco caixa-alta corrido | 3 colunas de loja (nome, endereço, WhatsApp, horário) + navegação + bloco legal. O aviso "EVITE A AUTOMEDICAÇÃO" fica em destaque próprio |

---

## 2. Sistema visual

### 2.1 Paleta e papéis

Os contrastes foram calculados com a fórmula WCAG 2.1 (luminância relativa). AA exige 4,5 para texto normal e 3,0 para texto grande e elementos de UI.

| Token | Hex | Papel | Contraste | AA |
|---|---|---|---|---|
| `white` | `#FFFFFF` | Fundo base, texto sobre teal-800 | — | — |
| `teal-50` | `#EAF6F2` | Fundo de faixa/seção de destaque, chip neutro | — | — |
| `teal-100` | `#C9EDE3` | Borda ativa suave, texto sobre teal-800 (rodapé) | 8,09 sobre teal-800 | ✅ |
| `teal-500` **marca** | `#279B82` | Ícones, filetes, anel de foco, ilustração, **texto ≥24px** | 3,44 sobre branco · 3,11 sobre teal-50 | ✅ só grande/UI ❌ texto normal |
| `teal-600` **marca** | `#187D68` | **Fundo do CTA primário**, links, H2 de destaque | 5,03 sobre branco · 4,55 sobre teal-50 | ✅ |
| `teal-700` | `#12604F` | Hover/ativo do CTA, selo "Aberto agora" | 7,47 sobre branco | ✅ AAA |
| `teal-800` | `#0E4A3D` | Fundo do rodapé, faixa escura | branco 10,17 | ✅ AAA |
| `ink` | `#111111` | Títulos e texto principal (o "preto" da marca) | 18,88 | ✅ AAA |
| `ink-2` | `#3D4A47` | Texto de apoio (Montserrat) | 9,26 · 8,36 sobre teal-50 | ✅ AAA |
| `ink-3` | `#5B6865` | Legenda, metadado, "Enquanto durar o estoque" | 5,81 | ✅ |
| `line` | `#D5E3DF` | Borda de card/divisor (decorativo, não precisa de 3:1) | — | — |
| `line-strong` | `#6E8C85` | Borda de input/botão secundário (UI, precisa de 3:1) | 3,65 | ✅ UI |
| `ruby-600` | `#B81D24` | **Preço** | 6,48 · 5,90 sobre ruby-50 | ✅ |
| `ruby-500` | `#D11920` | **Fundo de selo** ("Oferta", "Novo") com texto branco | 5,42 | ✅ |
| `ruby-50` | `#FFF1F1` | Fundo do selo de preço suave | ruby-500 4,94 | ✅ |
| `wa` | `#25D366` | **Só no glifo** do WhatsApp (nunca fundo com texto: 1,98 com branco) | — | — |

**Regras de uso**
- O rubi **nunca** vai em link, botão, borda de foco ou erro de formulário. Erro de formulário = `ink` + ícone + texto.
- O selo "Aberto agora" fica em **teal-700**, não em rubi. Vermelho comunica "fechado/alerta", e o selo aberto é estado, não promoção.
- "Fechado · abre às…" fica em `ink-2` sobre `#F1F3F2`, nunca em vermelho.
- Proporção visual por tela: ~80% branco, ~15% teal, ≤5% rubi.

### 2.2 Tipografia

- **Poppins**: H1–H3, preço, botão, selo. Pesos 600 e 700 (remover o 800: um arquivo a menos).
- **Montserrat**: corpo, legenda, rótulos, FAQ. Pesos 400 e 600.
- Carregar com `font-display: swap`, subset `latin` e self-host em woff2 (sem Google Fonts em runtime). Total de 4 arquivos.
- Números de preço com `font-variant-numeric: tabular-nums`.

| Estilo | Fonte | Mobile (390) tam/alt/peso | Desktop (1440) tam/alt/peso | Uso |
|---|---|---|---|---|
| `display` | Poppins | 32 / 38 / 700 | 52 / 58 / 700 | H1 da home |
| `h1` | Poppins | 28 / 34 / 700 | 44 / 50 / 700 | H1 das páginas internas |
| `h2` | Poppins | 22 / 28 / 700 | 32 / 38 / 700 | Título de seção |
| `h3` | Poppins | 18 / 24 / 600 | 20 / 28 / 600 | Card, FAQ |
| `price` | Poppins | 26 / 28 / 700 | 30 / 32 / 700 | Preço (rubi) |
| `price-sm` | Poppins | 20 / 24 / 700 | 22 / 26 / 700 | Preço em card compacto |
| `lead` | Montserrat | 17 / 26 / 400 | 19 / 30 / 400 | Subtítulo |
| `body` | Montserrat | 16 / 24 / 400 | 16 / 26 / 400 | Texto (mín. 16 no mobile, evita zoom do iOS) |
| `small` | Montserrat | 14 / 20 / 400 | 14 / 20 / 400 | Endereço, legenda |
| `eyebrow` | Montserrat | 12 / 16 / 600, +0,08em, caixa-alta | 13 / 16 / 600 | Sobretítulo |
| `button` | Poppins | 16 / 20 / 600 | 16 / 20 / 600 | Botões |
| `legal` | Montserrat | 13 / 20 / 600, caixa-alta | 13 / 20 / 600 | Aviso Anvisa |

- Medida máxima do texto: `65ch`.
- Usar `text-wrap: balance` em H1/H2 e `text-wrap: pretty` em parágrafos.

### 2.3 Espaço, grid, raio, sombra

**Espaçamento** em base 4: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

| Uso | Mobile | Desktop |
|---|---|---|
| Margem lateral | 20 | auto (container 1200) |
| Padding interno do card | 16 | 24 |
| Gap entre cards | 12 | 24 |
| Espaço entre seções | 48 | 96 |
| Título → conteúdo | 16 | 24 |

**Grid**

| Breakpoint | Colunas | Gutter | Container |
|---|---|---|---|
| < 640 | 4 | 16 | 100% − 40 |
| 640–1023 | 8 | 20 | 100% − 64 |
| ≥ 1024 | 12 | 24 | 1200 máx. |

**Raios:** `sm 8` (selo, input) · `md 12` (botão) · `lg 16` (card) · `xl 24` (foto hero) · `pill 999` (selo de status).

**Sombras** (discretas: farmácia de bairro, não app de banco)

| Token | Valor | Uso |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgb(17 17 17 / .06)` | Botão secundário |
| `shadow-card` | `0 1px 2px rgb(17 17 17 / .04), 0 4px 16px rgb(14 74 61 / .06)` | Card em repouso |
| `shadow-raise` | `0 2px 4px rgb(17 17 17 / .06), 0 12px 28px rgb(14 74 61 / .10)` | Hover no card (só desktop) |
| `shadow-bar` | `0 -1px 0 #D5E3DF, 0 -8px 24px rgb(17 17 17 / .06)` | Barra fixa inferior |

**Foco:** `outline: 3px solid #279B82; outline-offset: 2px` em tudo (≥ 3:1 sobre branco e sobre teal-50). Sobre fundo teal-800 o anel é `#FFFFFF`.

### 2.4 Componentes

Todos os alvos de toque têm **≥ 44×44 px**. A altura padrão dos botões é **48**.

#### Botão primário: WhatsApp da loja
- Fundo `teal-600`, texto branco, Poppins 600 16px, raio 12, altura 48 (52 no hero) e largura total no mobile.
- Ícone do WhatsApp: glifo 20px branco, à esquerda.
- Rótulo sempre com a loja: "Falar com a loja Fátima", "WhatsApp · Nações Unidas".

| Estado | Estilo |
|---|---|
| repouso | `bg teal-600` |
| hover | `bg teal-700` + `translateY(-1px)` |
| foco | anel 3px `teal-500` offset 2 |
| ativo | `bg teal-800`, `translateY(0)`, `scale(.98)` |
| desabilitado | não usar. Se a loja estiver fechada, o botão continua ativo, com a nota "Responde a partir das…" (o dado vem de `schedule`) |

#### Botão secundário: Grupo de Ofertas
- Fundo branco, borda 1,5px `teal-600`, texto `teal-600`, altura 48, raio 12.
- Ícone "grupo" ou "megafone", em linha. Nunca vermelho.
- Hover: `bg teal-50` (4,55 ✅). Ativo: `bg #D9EFE8` + texto e borda `teal-700` (teal-600 daria só 4,19 ❌). Foco: igual ao primário.

#### Botão terciário: "Como chegar" e "Ligar"
- Fundo transparente, texto `teal-600`, sublinhado no hover, altura 44 com padding 12/16 e ícone de 18px.
- No mobile, "Como chegar" e "Ligar" ficam lado a lado (2 colunas de 50%).

#### Card de loja
Duas variantes:

| Variante | Onde | Estrutura |
|---|---|---|
| **Compacto** (mobile) | Home, /receita, /ofertas | Linha: foto 88×88 (raio 12) à esquerda · bairro (h3) + endereço curto (small) + selo de status · abaixo, botão primário de largura total. Altura ~190px: as 3 lojas cabem em ~1,3 tela |
| **Completo** (desktop e tablet) | Home ≥1024 | Foto 4:3 no topo (raio 16 em cima) · rótulo "Fachada/Interior" no canto da foto · bairro (h3) · endereço · selo · botão primário · linha com "Como chegar" e "Página da loja" (44px) |

- Borda 1px `line`, sombra `shadow-card`, fundo branco.
- Hover (desktop): `shadow-raise` + foto `scale(1.03)` dentro de `overflow:hidden`.
- O card inteiro **não** é um link: são 2 ou 3 ações separadas, para evitar link aninhado e clique acidental.

#### Card de oferta
Ordem fixa: **imagem → marca → nome → preço → condição → botão**.
- Imagem: proporção 1:1 com `object-fit: contain`, fundo branco e padding 12. A arte do encarte não é cortada.
- Marca: eyebrow `ink-3`. Nome: h3 `ink`, máximo de 2 linhas (`line-clamp`).
- Preço: `price` em **ruby-600**, com "R$" a 60% do tamanho. Só aparece se existir em `offers.ts`.
- Condição: small `ink-3` ("Enquanto durar o estoque", o mesmo texto de hoje).
- Botão: primário "Consultar na loja", que abre o seletor de loja.
- Selo opcional no canto superior esquerdo: pill `ruby-500`/branco 12px 600 ("Oferta da semana"). **Só um selo por card.** Se a arte já tiver um selo, o card não leva outro.
- Se o item for **medicamento isento de prescrição**, o card ganha a linha legal `legal` abaixo do botão: "EVITE A AUTOMEDICAÇÃO. Informe-se com o farmacêutico."
- Proibido no card: "o mais barato", "menor preço", "melhor que…", preço riscado sem preço "de" real, "cura", "acaba com", "resolve".

#### Selo "Aberto agora"

| Estado (calculado a partir de `schedule` e `hours-exceptions`) | Estilo |
|---|---|
| Aberto | pill `teal-700`, texto branco 13px Poppins 600, ponto 8px `#7FE0C6` · "Aberto agora · fecha às HH:MM" |
| Fecha em ≤ 60 min | mesmo pill, texto "Fecha às HH:MM". Sem vermelho e sem pânico |
| Fechado | pill `#F1F3F2`, texto `ink-2` (8,30 ✅) · "Fechado · abre às HH:MM" |

- O ponto pulsa (`opacity` 1→.4, 2s) **só** com `prefers-reduced-motion: no-preference`.
- Altura 28, sem ação (não é alvo de toque). `role="status"` não é necessário, porque o selo é estático por página.

#### Barra fixa do celular
- Altura **64 + `env(safe-area-inset-bottom)`**, fundo branco, `shadow-bar` e 3 slots. **Não é "flutuante"**: fica colada à borda, sem margem.

| Página | Slot 1 | Slot 2 (destaque, 50% da largura) | Slot 3 |
|---|---|---|---|
| Home, /ofertas, /receita | Lojas | **WhatsApp**: abre o seletor de loja | Ofertas (ou Receita, na página /ofertas) |
| Loja | Como chegar | **WhatsApp desta loja**: direto, sem seletor | Ligar |

- Slots laterais: ícone 22 + rótulo 12px, área ≥ 64×56. Ativo = cor `teal-600` + barra de 3px no topo.
- Slot central: botão primário de 48px de altura.
- **Anti-sobreposição:** `body { padding-bottom: calc(64px + env(safe-area-inset-bottom) + 16px) }` e `scroll-padding-bottom` igual. Assim nenhum conteúdo, mapa ou rodapé fica escondido.
- O FAB redondo do WhatsApp **sai** no mobile (fica duplicado com a barra) e **fica** só no desktop ≥1024, a 24px das bordas, com 56×56.
- A barra **some** quando o teclado virtual abre (`visualViewport` resize) e quando um modal está aberto.

#### Cabeçalho
- Mobile: altura 60, fundo branco, borda inferior 1px `line`, `position: sticky` (não `fixed`, para não cobrir as âncoras). Contém logo 36 + "União Farma" (Poppins 600 16) e, à direita, botão ícone WhatsApp 44×44 (`teal-600`).
- Desktop: altura 72 e container 1200. Logo, depois o menu centralizado (Lojas · Ofertas · Receita · Entrega · Perguntas, Montserrat 600 15, alvo 44) e, à direita, o botão primário "WhatsApp" de 44 de altura.
- Link ativo: texto `teal-600` + sublinhado de 2px com offset 6. Hover: `teal-700`.
- Ao rolar mais de 8px, o header ganha `shadow-xs` (sem mudar de altura, para não causar CLS).

#### Rodapé
- Fundo `teal-800`, texto branco/`teal-100` e links com sublinhado. Todos os alvos ficam em linhas de 44px.
- Ordem no mobile:
  1. Aviso **EVITE A AUTOMEDICAÇÃO**: o texto de `company.ts`, em faixa própria com borda esquerda de 4px `teal-500` e estilo `legal`.
  2. As 3 lojas, cada uma com nome (h3 branco), endereço, botão WhatsApp **branco com texto teal-800** e link "Ligar".
  3. Botão secundário Grupo de Ofertas (versão invertida: borda e texto brancos).
  4. Navegação, Instagram (ícone 44×44), razão social, CNPJ (**1×**), farmacêutico responsável e links legais.
- No desktop: grade de 4 colunas (Loja × 3 + Navegação), com o aviso legal em faixa de largura total acima e a linha legal abaixo.
- "CONTATO" gigante sai. Títulos do rodapé usam `h3` com 18px.

#### Mascote "Fazemos entregas:"
- O slot existe nas páginas Home, Loja e /receita (variante pequena) e em /entrega-de-medicamentos-em-sabara.
- Composição: o mascote recortado (PNG/WebP transparente, ≤ 40 KB, `width`/`height` fixos) à direita, sobre um círculo `teal-50`. À esquerda, "Fazemos entregas:" em Poppins 700 `teal-600`, seguido da frase de `SITE_OPTIONS.delivery.coverageText` e do botão "Perguntar entrega à loja".
- **Pendência:** o arquivo do mascote não está no repositório. Não desenhar um novo nem usar ilustração genérica (a `entrega-icon.jpeg` é um pictograma de banco). Enquanto o arquivo não chegar, o bloco fica só com o texto.

### 2.5 Microinterações

O CSS usa apenas `transform` e `opacity`, sem JavaScript e sem biblioteca.

| Interação | Duração / curva | Reduced motion |
|---|---|---|
| Hover do botão (`translateY(-1px)` + cor) | 150ms `ease-out` | Só a cor |
| Press (`scale(.98)`) | 100ms | Remover o scale |
| Hover do card (sombra + foto `scale(1.03)`) | 200ms `cubic-bezier(.2,.7,.2,1)` | Só a sombra |
| Ponto do selo "Aberto" pulsando | 2s `ease-in-out` infinito | Ponto estático |
| Seção entra na tela (`opacity 0→1`, `translateY 8→0`) | 300ms, uma vez, via `animation-timeline: view()` (progressivo: sem suporte = sem animação) | Desligado |
| `<details>` do FAQ (chevron gira 180°) | 150ms | Sem rotação animada |
| Barra fixa (troca de slot ativo) | 150ms de cor | Igual |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

---

## 3. Layout por página

Legenda: **[novo]**, **[muda]**, **[sai]**, **[mantém]**.

### 3.1 Home

| # | Mobile 390 | Desktop 1440 | Δ |
|---|---|---|---|
| 1 | Header sticky 60 | Header 72 | [muda] o mesmo em todo o site |
| 2 | Hero: eyebrow "Farmácia de bairro em Sabará" · H1 `display` "3 lojas perto de você" · lead com os 3 bairros | Hero em 2 colunas: à esquerda (6 col) o texto + CTA "Falar no WhatsApp" (abre o seletor) + secundário Grupo; à direita (6 col), a foto da fachada da Nações (raio 24) com o selo do status | [muda] o desktop ganha CTA e foto; o mobile não ganha CTA no hero, porque os cards já cumprem esse papel |
| 3 | **3 cards de loja compactos, empilhados** | 3 cards completos (4 col cada) | [muda] carrossel → lista. Altura do card no desktop: 620 → ~500 |
| 4 | Faixa `teal-50`: mascote "Fazemos entregas:" | Mesma faixa, mascote à direita | [novo] |
| 5 | Ofertas da semana: 2 cards em grade 2×1 + link "Ver todas as ofertas" (44px) | 4 cards em grade de 4 | [muda] carrossel → grade; preço em rubi |
| 6 | Card do Grupo de Ofertas: texto curto + botão secundário | Igual, centralizado em 8 col | [muda] passa a usar o botão secundário |
| 7 | Receita: 1 linha + botão terciário "Enviar receita" → /receita | Card em 6 col ao lado de "Entrega" | [muda] substitui os 3 botões fantasma |
| 8 | FAQ (4 perguntas em `<details>`) | FAQ em 8 col | [mantém] o conteúdo |
| 9 | Rodapé | Rodapé | [muda] |
| — | "Por que chamar agora" | — | [sai] o tom de urgência; o conteúdo útil vai para o bloco 5 |
| — | 4 "stats" (3 UNIDADES, ENTREGA…) e 6 categorias | — | [sai] da home; as categorias vão para links de SEO no rodapé |
| — | "Fotos da loja" + carrossel do Instagram | Link "Mais fotos no Instagram" no rodapé | [sai] o carrossel (pesa e duplica fotos) |

**Meta:** home mobile de ~6.400px → ~3.200px.

### 3.2 Loja (template único)

| # | Mobile | Desktop | Δ |
|---|---|---|---|
| 1 | Header | Header | |
| 2 | Breadcrumb (44px) | Breadcrumb | [mantém] |
| 3 | **Topo:** foto 16:9 (≤ 220px de altura) · eyebrow bairro · H1 `h1` · endereço · selo · **botão primário WhatsApp da loja** · linha "Como chegar | Ligar". Tudo isso cabe na 1ª dobra de 844px | 2 colunas: foto 4:3 (6 col) + bloco de info (6 col), com os mesmos elementos | [muda] foto 1:1 → 16:9; o CTA sobe para a dobra; botão na cor da marca |
| 4 | Comodidades confirmadas (ex.: estacionamento gratuito), em chips `teal-50`, só se `amenities` for verdadeiro | Igual | [muda] vira chip |
| 5 | Horário (tabela, com o dia atual em negrito e `teal-50`) | 3 cards: Horário · Entrega (com mascote pequeno) · Receita | [muda] destaque do dia de hoje |
| 6 | Sobre a loja (máx. 65ch) | 8 col | [muda] respiro de 24 entre os parágrafos |
| 7 | Bairros atendidos + formas de pagamento + como pedir, em lista com ícones | 2 colunas | [muda] |
| 8 | FAQ em `<details>`, **fechado** por padrão | 8 col | [muda] o muro de texto vira acordeão (o JSON-LD continua igual) |
| 9 | Mapa **só desta loja**: imagem estática + botão "Abrir no Maps"; o iframe só carrega ao tocar | Mapa 6 col + endereço 6 col | [muda] performance: sem iframe no carregamento |
| 10 | Outras lojas: 2 cards compactos | 2 cards | [muda] links de 30px → cards |
| 11 | Grupo de Ofertas (secundário) | Igual, no grid | [muda] alinhado |
| 12 | Rodapé · barra "Como chegar / **WhatsApp** / Ligar" | Rodapé + FAB | [muda] |

### 3.3 Receita

| # | Mobile | Desktop | Δ |
|---|---|---|---|
| 1 | H1 "Envie a receita para a loja" + lead | 2 colunas: texto (7 col) + ilustração/mascote (5 col) | [muda] preenche o vazio |
| 2 | Passos em **lista vertical** numerada (1 Foto nítida ou Memed · 2 Escolha a loja · 3 A loja confirma) | Passos em linha (3 × 4 col) | [muda] o mobile deixa de ter 3 colunas apertadas |
| 3 | **Aviso** em faixa `teal-50` com borda esquerda `teal-500`: "Controlado e antibiótico: retirada na loja, com retenção da receita." | Igual | [muda] sobe para antes dos botões |
| 4 | 3 cards de loja compactos com o botão "Enviar receita · {loja}" | 3 × 4 col | [muda] alinhamento à esquerda (eixo único) |
| 5 | Privacidade: "Envie só a receita. Não mande outros documentos." (small `ink-3`) | Igual | [mantém] |
| 6 | Rodapé | Rodapé, logo depois do conteúdo | [sai] o círculo decorativo e o vazio |

### 3.4 Ofertas

| # | Mobile | Desktop | Δ |
|---|---|---|---|
| 1 | H1 "Ofertas da semana em Sabará" · "Encarte conferido em {data}. Vale enquanto durar o estoque de cada loja." | Igual, 8 col | [mantém] o texto |
| 2 | Filtros em chips de 44px (Todas · Cabelos · Bebê · Higiene…), com scroll horizontal **com dica visual** (fade na borda), somente se houver mais de 6 ofertas | Chips em linha | [novo] opcional; só usa categorias que existem em `offers.ts` |
| 3 | **Grade 2 colunas** de cards de oferta | Grade 4 colunas | [muda] carrossel → grade; 3 → 4 colunas no desktop |
| 4 | Faixa do aviso **EVITE A AUTOMEDICAÇÃO** (sempre que a página listar medicamentos) | Igual | [novo] reforço local |
| 5 | Card do Grupo de Ofertas (secundário) + "Avisar novas ofertas" como link terciário dentro do mesmo card | Igual | [muda] 3 CTAs → 1 card |
| 6 | "Em qual loja consultar?": 3 cards compactos | 3 × 4 col | [mantém] |
| 7 | FAQ | FAQ 8 col | [mantém] |
| 8 | Rodapé | Rodapé | |

---

## 4. Tokens Tailwind 4 (`@theme`)

Os tokens abaixo substituem `app/tokens.css`, mais as variáveis `:root` de `globals.css`. Os aliases antigos podem ser mantidos durante a migração.

```css
@import "tailwindcss";

@theme {
  /* reset da paleta padrão: só cores da marca */
  --color-*: initial;

  --color-white: #FFFFFF;
  --color-transparent: transparent;
  --color-current: currentColor;

  --color-teal-50:  #EAF6F2;
  --color-teal-100: #C9EDE3;
  --color-teal-500: #279B82; /* marca – ícone, foco, texto ≥24px */
  --color-teal-600: #187D68; /* marca – CTA, link */
  --color-teal-700: #12604F; /* hover, selo aberto */
  --color-teal-800: #0E4A3D; /* rodapé */

  --color-ink:   #111111;
  --color-ink-2: #3D4A47;
  --color-ink-3: #5B6865;
  --color-line:        #D5E3DF;
  --color-line-strong: #6E8C85;
  --color-neutral-100: #F1F3F2;

  --color-ruby-50:  #FFF1F1;
  --color-ruby-500: #D11920; /* fundo de selo */
  --color-ruby-600: #B81D24; /* preço */

  --color-wa: #25D366; /* só glifo */

  /* papéis semânticos */
  --color-bg: var(--color-white);
  --color-bg-soft: var(--color-teal-50);
  --color-fg: var(--color-ink);
  --color-fg-muted: var(--color-ink-2);
  --color-fg-subtle: var(--color-ink-3);
  --color-cta: var(--color-teal-600);
  --color-cta-hover: var(--color-teal-700);
  --color-cta-active: var(--color-teal-800);
  --color-link: var(--color-teal-600);
  --color-price: var(--color-ruby-600);
  --color-badge: var(--color-ruby-500);
  --color-status-open: var(--color-teal-700);
  --color-focus: var(--color-teal-500);
  --color-border: var(--color-line);

  /* fontes */
  --font-display: "Poppins", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Montserrat", ui-sans-serif, system-ui, sans-serif;

  /* tipo (mobile → desktop via clamp, 390px → 1440px) */
  --text-display: clamp(2rem, 1.536rem + 1.905vw, 3.25rem);
  --text-display--line-height: 1.15;
  --text-h1: clamp(1.75rem, 1.379rem + 1.524vw, 2.75rem);
  --text-h1--line-height: 1.18;
  --text-h2: clamp(1.375rem, 1.143rem + 0.952vw, 2rem);
  --text-h2--line-height: 1.22;
  --text-h3: clamp(1.125rem, 1.079rem + 0.19vw, 1.25rem);
  --text-h3--line-height: 1.35;
  --text-price: clamp(1.625rem, 1.532rem + 0.381vw, 1.875rem);
  --text-price--line-height: 1.05;
  --text-price-sm: clamp(1.25rem, 1.204rem + 0.19vw, 1.375rem);
  --text-price-sm--line-height: 1.15;
  --text-lead: clamp(1.0625rem, 1.016rem + 0.19vw, 1.1875rem);
  --text-lead--line-height: 1.55;
  --text-body: 1rem;
  --text-body--line-height: 1.6;
  --text-small: 0.875rem;
  --text-small--line-height: 1.45;
  --text-eyebrow: clamp(0.75rem, 0.727rem + 0.095vw, 0.8125rem);
  --text-eyebrow--line-height: 1.25;
  --text-eyebrow--letter-spacing: 0.08em;
  --text-legal: 0.8125rem;
  --text-legal--line-height: 1.55;

  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* espaço: base 4px → p-4 = 16px */
  --spacing: 0.25rem;
  --spacing-gutter: 1.25rem;     /* margem lateral mobile */
  --spacing-section: clamp(3rem, 1.886rem + 4.571vw, 6rem);
  --spacing-tap: 2.75rem;        /* 44px */
  --spacing-btn: 3rem;           /* 48px */
  --spacing-bar: 4rem;           /* 64px barra mobile */
  --spacing-header: 3.75rem;     /* 60px */

  --container-site: 75rem;       /* 1200px */
  --container-prose: 65ch;

  --breakpoint-sm: 40rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 90rem;

  /* raios */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-pill: 999px;

  /* sombras */
  --shadow-xs: 0 1px 2px rgb(17 17 17 / 0.06);
  --shadow-card: 0 1px 2px rgb(17 17 17 / 0.04), 0 4px 16px rgb(14 74 61 / 0.06);
  --shadow-raise: 0 2px 4px rgb(17 17 17 / 0.06), 0 12px 28px rgb(14 74 61 / 0.10);
  --shadow-bar: 0 -1px 0 #D5E3DF, 0 -8px 24px rgb(17 17 17 / 0.06);

  /* movimento */
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;

  --animate-pulse-dot: pulse-dot 2s ease-in-out infinite;
  @keyframes pulse-dot { 50% { opacity: 0.4; } }
}

@layer base {
  html { background: var(--color-bg); color: var(--color-fg); font-family: var(--font-sans); }
  h1, h2, h3, .price, button, .btn { font-family: var(--font-display); }
  h1, h2 { text-wrap: balance; }
  p { text-wrap: pretty; }
  :focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
  .on-dark :focus-visible { outline-color: var(--color-white); }
  body.has-bar { padding-bottom: calc(var(--spacing-bar) + env(safe-area-inset-bottom) + 1rem); }
  html { scroll-padding-top: calc(var(--spacing-header) + 1rem); scroll-padding-bottom: calc(var(--spacing-bar) + 1rem); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  }
}

@layer components {
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; min-height:var(--spacing-btn); min-width:var(--spacing-tap); padding:0 1.25rem; border-radius:var(--radius-md); font-weight:600; transition: background-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
  .btn-primary { background:var(--color-cta); color:#fff; }
  .btn-primary:hover { background:var(--color-cta-hover); transform:translateY(-1px); }
  .btn-primary:active { background:var(--color-cta-active); transform:scale(.98); }
  .btn-secondary { background:#fff; color:var(--color-cta); box-shadow: inset 0 0 0 1.5px var(--color-cta); }
  .btn-secondary:hover { background:var(--color-teal-50); }
  .btn-secondary:active { background:#D9EFE8; color:var(--color-teal-700); box-shadow: inset 0 0 0 1.5px var(--color-teal-700); }
  .price { color:var(--color-price); font-size:var(--text-price); line-height:var(--text-price--line-height); font-weight:700; font-variant-numeric: tabular-nums; }
  .badge-offer { background:var(--color-badge); color:#fff; border-radius:var(--radius-pill); font: 600 .75rem/1 var(--font-display); padding:.375rem .625rem; }
  .status-open { background:var(--color-status-open); color:#fff; border-radius:var(--radius-pill); min-height:1.75rem; }
  .status-closed { background:var(--color-neutral-100); color:var(--color-ink-2); border-radius:var(--radius-pill); min-height:1.75rem; }
  @media (prefers-reduced-motion: reduce) { .btn-primary:hover, .btn-primary:active { transform:none; } }
}
```

---

## 5. Conformidade e guarda-corpos

**Anvisa (Lei 9.294/96, RDC 96/2008)**
- O aviso "EVITE A AUTOMEDICAÇÃO" (texto de `company.ts`) aparece no rodapé de todas as páginas e em /ofertas, sempre que houver medicamento.
- Copy proibida: cura, "acaba com", "resolve", "sem efeitos colaterais", "o mais barato de Sabará", "menor preço", comparação com outra farmácia ou rede.
- A urgência de compra de medicamento sai ("Por que chamar agora" → "Ofertas da semana").
- Medicamento de venda sob prescrição não aparece em card de oferta.

**Dados**
- Nenhum valor novo. Preço, estoque, telefone, endereço, horário e comodidades vêm de `site-config.ts`, `offers.ts` e `hours-exceptions.ts`.
- Os textos de exemplo deste documento são rótulos de UI, não dados.

**Acessibilidade (meta: Lighthouse 100)**
- Contraste AA verificado (seção 2.1).
- Alvos ≥ 44px, incluindo os links do rodapé e o breadcrumb.
- Um H1 por página, sem pular níveis.
- `<details>` nativo no FAQ.
- Foco visível em tudo.
- `aria-current="page"` na navegação.
- Barra fixa com `<nav aria-label="Ações rápidas">`.
- Nada sai da viewport: o `scrollWidth` hoje já é 390, mas os carrosséis escondem conteúdo. Eles saem.

**Performance**
- Zero biblioteca nova. Animações só em CSS (`transform`/`opacity`, `animation-timeline` progressivo).
- Fontes: 4 arquivos woff2 self-host com `preload` apenas no Poppins 700.
- Iframe do mapa só depois de clique.
- Fotos com `srcset` 360/480/768/1024 (o padrão já existe em `responsive-images.ts`) e `fetchpriority="high"` só na foto do topo.
- Consolidar os 23 CSS em `theme.css` + `components.css` (meta: < 30 KB gzip).

## 6. Pendências com o dono (não inventar)
1. Arquivo original do **mascote entregador** (SVG ou PNG transparente).
2. **Fotos de fachada** de Fátima e Itacolomi (hoje são de prateleira).
3. Confirmar se a lista de ofertas inclui medicamentos isentos de prescrição (isso define o aviso por card).
4. Aprovar a remoção dos blocos marcados como **[sai]**.
