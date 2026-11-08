# Cores e animações como guia

Plano de finalização, item 3 ("Animações e cores como guia"). Vale para o cliente e para o painel interno.

## Cores: cada uma significa uma coisa

| Cor | Significa | Exemplos |
|---|---|---|
| **Verde** (`--cor-acao`) | Ação | Adicionar à cesta, enviar pelo WhatsApp, confirmar, o número da cesta |
| **Vermelho** (`--cor-preco`) | **Só** preço e oferta | Preço, "De/Por", selo "Oferta" |
| **Amarelo** (`--cor-alerta`) | Alerta | Estoque baixo, dados desatualizados, aviso interno |

Vermelho **não** é usado para "erro" nem para o número da cesta (isso confundia com preço). Aviso de problema usa amarelo, com texto claro.
Nunca só a cor: o texto e o número sempre acompanham (acessibilidade).

## Animação

- Existe **uma**: o número da cesta dá uma pulsada curta (0,32 s) quando um item entra. Guia o olhar para onde o produto foi.
- Sem entrada de cartões, sem esmaecer e sem pulso contínuo (o ponto "aberto agora" ficou parado).
- Quem pede menos movimento no aparelho (`prefers-reduced-motion`) não vê nenhuma animação.

Regra para novas telas: se a animação não responde a uma ação do cliente, não entra.
