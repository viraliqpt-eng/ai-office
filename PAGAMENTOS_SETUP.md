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
