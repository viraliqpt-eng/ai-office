# Correção dos Stripe Price IDs

Os IDs anteriores tinham erros de transcrição, sobretudo:

- `68OLK` com a letra **O**
- quando o valor correto é `680LK` com o número **0**

IDs confirmados diretamente no ficheiro `prices.csv` exportado pela Stripe:

## Pagamento único
- Starter: `price_1TwmHQEB680LK6IRzAG9JVTJ`
- Business: `price_1TwmIMEB680LK6IR31qXD6L7`
- Complete: `price_1TwmJ3EB680LK6IRrkIs9XLf`

## Mensal
- Starter: `price_1TwmBIEB680LK6IRuQLwGYwz`
- Business: `price_1TwmDlEB680LK6IRGClH9tCc`
- Complete: `price_1TwmEeEB680LK6IRmVaNkBgk`

Atenção especial ao plano Business mensal:
- `Dl` contém **D + l minúsculo**
- `GCl` contém **G + C + l minúsculo**
