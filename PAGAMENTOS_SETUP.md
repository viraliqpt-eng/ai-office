# Fase 7 — configuração de pagamentos

## 1. Stripe

Crie uma conta Stripe e obtenha:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Nunca coloque estas chaves no JavaScript público.

## 2. Netlify

Em Site configuration → Environment variables, adicione:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `URL` com o endereço público do site

A `SUPABASE_SERVICE_ROLE_KEY` só pode existir nas funções do servidor.

## 3. Dependências

Na raiz do projeto:

```bash
npm install
```

## 4. Webhook Stripe

Configure o endpoint:

```text
https://SEU-DOMINIO/.netlify/functions/stripe-webhook
```

Evento inicial:

```text
checkout.session.completed
```

## 5. Supabase

Execute:

```text
supabase/payments.sql
```

## 6. Testes

Utilize o modo de teste do Stripe antes de ativar pagamentos reais.

## Importante

A emissão fiscal legal em Portugal deve ser integrada com um sistema de faturação certificado. O comprovativo do Stripe não substitui automaticamente uma fatura fiscal certificada.


## Price IDs configurados

A versão atual já utiliza os seis Price IDs do modo de teste.

O frontend envia apenas um Price ID permitido. A função Netlify valida o identificador antes de criar a sessão Stripe.

## Teste recomendado

1. Publicar esta versão na Netlify.
2. Adicionar `STRIPE_SECRET_KEY` de teste nas variáveis de ambiente.
3. Confirmar que `URL` corresponde ao domínio publicado.
4. Abrir `/checkout.html`.
5. Escolher um plano.
6. Concluir um pagamento com um cartão de teste Stripe.
7. Confirmar o evento `checkout.session.completed`.
