# SEO PARA IA — 33 Leis de AI SEO, AEO e GEO

**Escopo:** visibilidade do site da União Farma em buscas tradicionais e em respostas de IA (Google AI Overviews, Google AI Mode, ChatGPT, Perplexity, Gemini, Copilot). Cobre conteúdo, estrutura de página, código, autoridade externa e medição.
**Origem:** "Manual Definitivo de Padrões Web: As 33 Leis de AI SEO, AEO e GEO", consolidação de cursos da WsCube Tech e da Ahrefs, recebido em 26/11/2026.
**Aviso:** os números do manual (percentuais, correlações, estudos) **não foram verificados por IA**. Trate-os como direção, não como garantia.
**Obrigatoriedade:** cumprimento rigoroso.

## Lugar na ordem de prioridade

Ordem do projeto: **R-xx legais** (limite, `CONFORMIDADE.md`) > 1) `ACCESSIBILITY.md` > 2) `CONVERSAO.md` > este documento (mesmo nível de V-xx/P-xx de `CONFORMIDADE.md`) > 3) direção artística do `CLAUDE.md`.

Em conflito, vale a regra de cima e a resposta diz qual regra venceu.

## Limites inegociáveis (valem para todas as leis)

- **X-1 Nada inventado e nada artificial:** não criar menções, avaliações, depoimentos, perguntas de fórum ou contas falsas para "treinar" a IA. Participação em comunidades é genuína e identificada.
- **X-2 Medicamento:** toda divulgação fora do site (YouTube, Reddit, posts, descrições, FAQ) segue R-06 e R-10: nada de imagem, promoção ou destaque de medicamento de prescrição. Preço pode ser divulgado.
- **X-3 Saúde:** conteúdo de saúde (artigo, vídeo, FAQ) só vai ao ar depois da revisão de farmacêutico. Texto de IA nunca é publicado sem revisão humana (S-14).
- **X-4 Dados pessoais:** medição e atribuição (S-29 a S-31) respeitam R-11 (LGPD e consentimento de cookies). A pergunta "Como nos conheceu?" é opcional e de resposta única.
- **X-5 Acessibilidade:** páginas e vídeos novos cumprem `ACCESSIBILITY.md` (legenda e transcrição em vídeo, alt, títulos).

## Fatos do manual que sustentam as leis (não verificados)

- A IA usa **dados de treinamento** (atualizados cerca de a cada 6 meses) **e busca em tempo real (RAG)**. O RAG faz: entender a intenção e as entidades; recuperar com *query fan-out* (uma pergunta vira 5 a 28 subconsultas, a maioria sem volume de busca); avaliar (descartar fonte pouco confiável, confusa ou velha); sintetizar.
- Cada plataforma escolhe fontes de forma diferente (sobreposição de apenas 14% entre as mais citadas): tratar como mercados separados.
  - **Google AI Overviews:** sites institucionais, YouTube e Reddit; 10,7% das menções com link.
  - **Google AI Mode:** YouTube por ampla margem, Wikipédia, Quora; 36,8% com link.
  - **ChatGPT:** grandes veículos e editoras, Reddit, Wikipédia; 26,9% com link; sobreposição baixa com o Top 10 do Google.
  - **Perplexity:** mais próximo do ranking clássico do Google e do YouTube; 51,6% com link.
- Em média 28% das menções de marca em IA têm link; os outros 72% funcionam como recomendação sem clique.
- Tráfego de IA é pequeno, mas converte muito mais; AI Overview reduz o clique no 1º resultado do Google.
- Contagem de palavras quase não influencia a citação (correlação 0,04); mais da metade das páginas citadas tem menos de 1.000 palavras.
- Menções de marca na web correlacionam mais com visibilidade em IA (0,664) do que backlinks e DR.

## Regras

### A. Estratégia e planejamento
- **S-01 SEO clássico é a base:** nunca abandone SEO técnico, links internos e autoridade para "fazer só IA". A IA recupera páginas que a busca já encontra. **Verificar:** a mudança preserva indexação, sitemap, títulos e links internos?
- **S-02 Mapa de entidades:** liste e use de forma consistente a marca (União Farma), lojas, bairros (Nações Unidas, Fátima, Itacolomi), serviços (entrega, retirada, leitura de receita), pessoas (farmacêutico RT) e produtos. **Verificar:** os nomes das entidades são escritos sempre iguais no site, no Google Perfil da Empresa e nas redes?
- **S-03 Seis lacunas:** audite frente aos concorrentes: visibilidade, narrativa (o que a IA diz da marca), tópico, formato (vídeo, guia, comparativo), menções web e demanda de marca. Classifique cada correção em **Corrigir** (página existente), **Construir** (ativo novo) ou **Influenciar** (menção externa). **Verificar:** cada lacuna tem uma ação em uma dessas três frentes?
- **S-04 Fórmula BID:** aprove palavra-chave só com **Business** (gera receita?), **Intent** (formato igual ao que já ranqueia no Google) e **Difficulty** (autoridade de quem ocupa o Top 10). **Verificar:** a pauta passou pelos três critérios?
- **S-05 Filtro de IA:** pesquise a palavra-chave no Google. Se um AI Overview já responde por completo, não invista em clique informacional; mire ação ("calculadora", "localizador", "verificador") e termos transacionais ("comprar", "preço", "entrega"). **Verificar:** a pauta informacional foi checada contra o AI Overview?
- **S-06 Cobertura de tópico (*query fan-out*):** em temas comerciais e informacionais, cubra todas as subperguntas lógicas do tópico, incluindo "melhor", "versus", "alternativa" e "avaliação" onde só concorrentes aparecem. **Verificar:** as subperguntas do tema têm resposta no site? (X-2 e X-3 valem para temas de saúde.)

### B. Conteúdo citável
- **S-07 Concisão:** sem enchimento para bater número de palavras. Páginas diretas, de 1.000 a 1.500 palavras em artigo completo e abaixo de 1.000 em resposta objetiva. **Verificar:** cada parágrafo acrescenta informação?
- **S-08 Frescor real:** atualize com dado, preço e exemplo novos; **nunca só a data**. Priorize páginas que já têm links e perderam tráfego (*sleeper pages*). **Verificar:** a atualização muda conteúdo de verdade? Conteúdo de saúde atualizado passou por revisão (X-3)?
- **S-09 Formatos que a IA extrai:** listas classificatórias, comparativos "X vs. Y", estudo de caso com experimento próprio e pesquisa com número concreto. Publique no pico de consultas em alta (Google Trends). **Verificar:** o formato é um desses quando o tema permite?
- **S-10 Resposta direta primeiro (BLUF):** todo artigo e toda seção abre com a conclusão; contexto e exemplos depois. **Verificar:** a primeira frase abaixo de cada título já responde?
- **S-11 Conteúdo atômico:** cada `H2`/`H3` e cada parágrafo tem **uma ideia completa e autossuficiente**, que faz sentido se for copiada sozinha. Guia amplo demais é dividido em páginas por subpergunta. **Verificar:** cada bloco lido isolado faz sentido?
- **S-12 Entidades nomeadas e estrutura WWH:** troque "este produto ajuda" por nome, marca e relação concretos. Explique no padrão **O quê, Por quê, Como**. **Verificar:** há nomes próprios onde havia "isso/essa ferramenta"?
- **S-13 Frases declarativas simples:** ordem direta (sujeito, verbo, objeto), uma ideia por frase, sem períodos longos. **Verificar:** alguma frase precisa de segunda leitura? Se sim, reescreva (também cumpre A-06).
- **S-14 Experiência real e sem copiar e colar de IA:** inclua relato de vivência verdadeira ("testamos", "observamos"). IA serve para estratégia, estrutura de títulos, inventário de entidades e links internos; **texto gerado por IA nunca é publicado sem reescrita e revisão humana**. **Verificar:** há experiência real e um responsável humano pelo texto? (L-1 e X-1: a vivência relatada tem que ser verdadeira.)
- **S-15 Rótulo proprietário:** conceito ou método original recebe o nome da marca, é definido e repetido em vários canais. **Verificar:** o conceito próprio tem nome da União Farma e definição clara?

### C. Autoridade externa
- **S-16 Menção sem link vale:** trate citação do nome da marca em site terceiro, com ou sem link, como ativo. **Verificar:** as menções estão sendo contadas, com e sem link?
- **S-17 Três níveis de menção:** **Nível 1** editorial de terceiros (veículos, listas comparativas); **Nível 2** comunidades (Reddit, Quora, fóruns) com resposta genuinamente útil e identificada, nunca spam; **Nível 3** canais próprios (LinkedIn, podcast, domínios secundários). **Verificar:** há ação nos três níveis? (X-1 e X-2.)
- **S-18 YouTube é canal central:** é a fonte mais citada em AI Overviews e uma das que mais correlacionam com visibilidade no ChatGPT. **Verificar:** existe plano de vídeo para os temas permitidos? (X-2 e X-3.)
- **S-19 Vídeos de demanda contínua (*Search Hits*):** priorize temas em que vídeo já ranqueia no Top 3 do Google, não picos virais. Em cada vídeo: palavra-chave exata no título (a criatividade vai na miniatura), resumo real com a palavra-chave nas primeiras linhas da descrição, marcação de tempo para capítulos, palavra-chave **dita em voz** no vídeo, legenda e transcrição (X-5). **Verificar:** o vídeo cumpre esse checklist?
- **S-20 Blindagem contra desinformação:** mantenha uma **FAQ oficial** com fatos exatos e verificáveis (nome da empresa, lojas, endereços, horários, formas de entrega e retirada, farmacêutico RT, canais). Monitore o que a IA diz da marca. Ao achar erro externo, corrija primeiro no próprio site. **Verificar:** os fatos da FAQ estão corretos e atuais? Preço que muda todo dia não vai na FAQ (vai na página do produto).
- **S-21 Auditoria de menções perdidas e sentimento:** revise periodicamente se a marca saiu de listas e artigos de terceiros e como é descrita. **Verificar:** existe revisão mensal registrada?

### D. Técnico (AEO)
- **S-22 `robots.txt` sem bloquear bots de IA:** permitir `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `Google-Extended`. `Disallow` só em áreas sem valor de busca (carrinho, conta, checkout, `/api/`, `/interno`). Conferir a regra "Instruct AI bot traffic" da Cloudflare. Validar após qualquer edição. **Verificar:** nenhum bot de IA está bloqueado por herança de template ou por padrão de serviço?
- **S-23 `llms.txt` é opcional:** ative só se o CMS ou plugin oferecer sem custo; nenhum grande provedor confirmou a leitura. `robots.txt` e Sitemap XML têm prioridade. **Verificar:** tempo foi gasto em `robots.txt` e sitemap antes de `llms.txt`?
- **S-24 HTML completo no servidor (SSR):** todo conteúdo principal chega em HTML sem depender de JavaScript. O rastreador do ChatGPT não executa JavaScript. **Verificar:** com JavaScript desligado, o texto principal, o título, o preço e a lista de produtos continuam presentes?
- **S-25 Velocidade para RAG:** páginas lentas são descartadas antes da síntese. Metas de Core Web Vitals em P-01 (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1). **Verificar:** a mudança não piora LCP, INP ou CLS?
- **S-26 Hierarquia de títulos:** um `H1`; `H2` para seções; `H3` para subseções; sem pular nível. A IA usa os títulos como fronteira de recorte (também exigido por A-12). **Verificar:** a árvore de títulos está lógica e sem salto?
- **S-27 Dados estruturados como hábito:** `Article`, `Product`, `Service`, `LocalBusiness`/`Pharmacy`, `FAQPage`, `BreadcrumbList`, e Sitemap XML ativo. O impacto isolado do schema em citação de IA é misto: é suporte, não atalho. Deve coincidir com o que a pessoa vê (P-18). **Verificar:** o schema bate com o conteúdo visível e é válido?
- **S-28 URLs inventadas pela IA:** monitore 404 que recebem tráfego com referência de IA e redirecione (301) para a página real mais próxima. **Verificar:** os 404 mais acessados por referências de IA têm redirecionamento?

### E. Medição e governança
- **S-29 Tráfego de referência de IA:** crie grupo de canais no GA4 (ou use Ahrefs Web Analytics/Similarweb) com origem `chatgpt.com`, `perplexity`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai`, `deepseek.com`. Leia como **tendência**, não como contagem exata (parte do tráfego chega sem referenciador). Só com consentimento de cookies (R-11). **Verificar:** existe o canal e a leitura é de tendência?
- **S-30 Bots de treinamento versus de citação:** nos logs do servidor ou na Cloudflare, separe `GPTBot` e `Google-Extended` (treinamento) de `ChatGPT-User` e `OAI-SearchBot` (citação em tempo real). Pico de bot de citação indica página candidata a fonte; página estratégica ignorada indica falha de link interno ou de descoberta. **Verificar:** os dois grupos de bots são medidos separadamente?
- **S-31 Atribuição autodeclarada:** pergunte "Como você nos conheceu?" (com opções "Assistente de IA/ChatGPT/Gemini", "Google", "Indicação" etc.) em cadastro, pós-compra ou pesquisa. Como cerca de 72% das recomendações não trazem link, só o cliente revela a origem. **Verificar:** a pergunta existe, é **opcional**, de resposta única e **fora do caminho do checkout** (C-21, P-10, X-4)?
- **S-32 Páginas que já recebem IA e páginas silenciosas:** páginas com referência de IA são ativos críticos: atualize mais, revise a precisão e garanta CTA claro (C-10, C-18). Páginas comerciais importantes com **zero** referência de IA são investigadas (bloqueio, desatualização, falta de cobertura). **Verificar:** as duas listas existem e têm dono?
- **S-33 Governança em três horizontes:**
  - **Semanal:** auditar `robots.txt`; canal de IA no analytics; pergunta de atribuição; atualizar 5 a 10 páginas principais; listar 10 alvos de menção externa; redirecionar 404 inventados.
  - **Mensal:** acompanhar participação de voz em IA (*AI Share of Voice*), novos domínios que citam a marca, lacunas de tópico fechadas, precisão e sentimento das respostas sobre a marca; tópicos em alta no Google Trends.
  - **Trimestral:** auditoria completa das seis lacunas (S-03) contra os concorrentes, revisão de *sleeper pages* e ajuste da estratégia por plataforma.
  - **Verificar:** a rotina tem datas e responsável?

## Estado do site na conferência de 26/11/2026 (reconferir antes de confiar)

- `robots.txt` público: `User-Agent: *` com `Allow: /`; bloqueia só `/api/`, `/interno` e `/interno/`; aponta o sitemap. **Nenhum bot de IA está bloqueado** (S-22 ok).
- `llms.txt`: não existe (404). Opcional (S-23).
- `sitemap.xml` responde 200.
- **Página de produto:** HTML completo no servidor, com título e schema `Product` (S-24 e S-27 ok).
- **Página inicial, sem JavaScript:** o HTML traz os títulos das vitrines, mas **zero cartões de produto**, porque os produtos das vitrines são buscados no navegador depois que a página abre. Rastreador sem JavaScript (como o do ChatGPT) não vê esses produtos na home. É o ponto mais importante a corrigir em S-24, respeitando R-06 (nada de promover medicamento de prescrição).
- Dados estruturados na home e no produto: 2 blocos `application/ld+json` em cada.

## Lista final (responder sim a todas)

- `robots.txt` não bloqueia bots de IA e o sitemap está ativo (S-22, S-23)?
- Com JavaScript desligado, o conteúdo principal aparece (S-24)?
- Um `H1`, títulos sem saltos, blocos atômicos com resposta direta no início (S-10, S-11, S-26)?
- Frases simples, entidades nomeadas, experiência verdadeira e revisão humana (S-12 a S-14)?
- Schema válido e igual ao conteúdo visível (S-27)?
- Nada inventado, nada de medicamento de prescrição promovido, saúde revisada por farmacêutico (X-1 a X-3)?
- Medição respeita o consentimento de cookies e a pergunta de atribuição é opcional (S-29, S-31, X-4)?
