# Verificação dos Price IDs Stripe

Os seis identificadores abaixo foram transcritos das capturas da conta Stripe em modo de teste.

## Mensais

```text
Starter:  price_1TwmBIEB680LK6IRuQLwGYwz
Business: price_1TwmDlEB680LK6IRGClH9tCc
Complete: price_1TwmEeEB680LK6IRmVaNkBgk
```

## Pagamento único

```text
Starter:  price_1TwmHQEB680LK6IRzAG9JVTJ
Business: price_1TwmIMEB680LK6IR31qXD6L7
Complete: price_1TwmJ3EB680LK6IRrkIs9XLf
```

Antes do primeiro teste, copie cada Price ID diretamente da Stripe e confirme que corresponde exatamente ao valor configurado.

Estes identificadores pertencem ao modo de teste. Quando a conta de produção for ativada, será necessário criar ou copiar os Price IDs de produção e substituir os valores em:

```text
js/config.js
netlify/functions/create-checkout-session.js
```
