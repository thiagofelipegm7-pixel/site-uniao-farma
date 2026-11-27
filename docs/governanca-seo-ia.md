# Governança de SEO para IA — União Farma (`S-02`, `S-03`, `S-18`, `S-19`, `S-32`, `S-33`)

> Regras inegociáveis: `X-1` (nada inventado/artificial), `X-2` (sem imagem/promoção de medicamento sob prescrição), `X-3` (conteúdo de saúde revisado por farmacêutico), `X-4` (medição respeita cookies/LGPD), `X-5` (acessibilidade WCAG 2.2 AAA).

---

## 1. Mapa Oficial de Entidades (`S-02`)

Usar **sempre exatamente a mesma grafia** no site, no Google Perfil da Empresa, no YouTube e nas redes:

| Entidade | Forma oficial |
| --- | --- |
| Marca | **União Farma** (`Drogaria e Perfumaria União Farma Ltda`) |
| CNPJ | `28.455.556/0001-91` |
| Loja principal (site) | **União Farma Nações Unidas** — Rua Inglaterra, 162, Nações Unidas, Sabará/MG |
| Outras lojas | **União Farma Nossa Senhora de Fátima** (Rua Cláudio, 902) · **União Farma Itacolomi** (Av. Joaquim Ferreira Madureira, 489, antiga Droga Manaus) |
| Farmacêutico RT (Nações Unidas) | **João Victor dos Santos** · `CRF/MG 31958` |
| Registros sanitários | `Alvará Sanitário nº 207/2026 (Prefeitura de Sabará)` · `AFE Anvisa nº 7.61823-1` |
| Serviços oficiais | Leitura de receita por foto/PDF (`/receita`), retirada grátis no balcão, entrega nos bairros confirmados (`/entrega-de-medicamentos-em-sabara`), atendimento pelo WhatsApp em até 5 minutos no horário de funcionamento |

---

## 2. Rotina em Três Horizontes (`S-33`)

### Semanal
- [ ] Conferir `robots.txt` público (bots de IA liberados, `S-22`).
- [ ] Conferir canal de referência de IA no GA4 (`ai_referral_visit`, `S-29`) e respostas de *"Como você nos conheceu?"* (`atribuicao_origem`, `S-31`).
- [ ] Conferir logs da Cloudflare para headers `X-UF-AI-Bot` (`citacao:*` vs. `treinamento:*`, `S-30`) e 404s com `X-UF-AI-Ref` (`S-28` → redirecionar 301 em `next.config.ts`).
- [ ] Revisar/atualizar 5 páginas prioritárias com dado real novo (`S-08`, nunca mudar só a data).

### Mensal
- [ ] Testar perguntas sobre a União Farma no Google AI Overviews, ChatGPT, Perplexity e Gemini para checar precisão factual (`S-20`) e sentimento (`S-21`).
- [ ] Atualizar listas de **páginas que recebem IA** vs. **páginas comerciais silenciosas** (`S-32`).
- [ ] Registrar novos domínios/menções externas (com ou sem link, `S-16`, `S-17`).

### Trimestral
- [ ] Auditoria das 6 lacunas (`S-03`: visibilidade, narrativa, tópico, formato, menções web, demanda de marca) classificando cada ação em **Corrigir**, **Construir** ou **Influenciar**.
- [ ] Revisar *sleeper pages* e atualizar plano de vídeos de demanda contínua no YouTube (`S-18`, `S-19`).

---

## 3. Checklist YouTube *Search Hits* (`S-18`, `S-19`, `X-2`, `X-3`, `X-5`)

Só para temas permitidos (higiene, dermocosméticos, cuidados gerais revisados por farmacêutico — nunca medicamento sob prescrição):
- [ ] Palavra-chave exata no título (criatividade na miniatura).
- [ ] Resumo real com a palavra-chave nas primeiras 2 linhas da descrição.
- [ ] Capítulos com marcação de tempo (`00:00`).
- [ ] Palavra-chave falada em voz alta no vídeo.
- [ ] Legenda revisada e transcrição completa (`X-5` / `ACCESSIBILITY.md`).
