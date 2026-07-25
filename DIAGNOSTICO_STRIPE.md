# Diagnóstico Stripe — Fase 9

Esta versão mostra o erro real no próprio checkout e grava mensagens detalhadas nos logs da Netlify.

## Publicação

1. Substitua os ficheiros do projeto pela Fase 9.
2. Faça um novo deploy.
3. Abra `/checkout.html`.
4. Escolha o plano Starter de pagamento único.
5. Carregue em `Continuar para pagamento`.

## Resultado esperado

Se funcionar, será redirecionado para a página segura da Stripe.

Se falhar, aparecerá no checkout uma mensagem semelhante a:

```text
Erro no pagamento: A Stripe recusou a criação da sessão de pagamento. — No such price: 'price_...'
```

## Logs da Netlify

Abra:

```text
Logs & metrics → Functions → create-checkout-session
```

Procure pelas etiquetas:

```text
[checkout:start]
[checkout:payload]
[checkout:price-found]
[checkout:session-created]
[checkout:stripe-error]
```

## Interpretação rápida

`STRIPE_SECRET_KEY não está disponível`
: a variável não chegou à função.

`No such price`
: o Price ID está incorreto ou pertence a outra conta/modo Stripe.

`Invalid API Key provided`
: a chave secreta foi copiada incorretamente.

`The price specified is set to ...`
: o modo do preço não corresponde a pagamento único ou assinatura.

## Segurança

Nunca publique a chave `sk_test_`, `sk_live_` ou o segredo `whsec_`.
