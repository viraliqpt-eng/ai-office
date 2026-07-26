# AI Office™ — Fase 10

Esta versão automatiza o pós-pagamento:

1. cria ou atualiza o cliente;
2. cria o pedido;
3. regista o pagamento;
4. cria uma tarefa interna;
5. evita duplicações pelo `stripe_session_id`.

## Configuração

No Supabase, execute:

`supabase/fase10_automacao_pos_pagamento.sql`

Na Netlify, confirme:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Depois faça novo deploy e um pagamento de teste.

Logs esperados:

- `[webhook:event]`
- `[webhook:automation-complete]`
