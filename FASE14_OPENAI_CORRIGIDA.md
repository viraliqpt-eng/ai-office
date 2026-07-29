# Fase 14 — Correção da ligação à OpenAI

## Erro corrigido

A mensagem:

`Unexpected token '<', "<HTML>..." is not valid JSON`

significa que a função tentou interpretar uma página HTML como JSON.

## Alterações aplicadas

- endpoint oficial fixado diretamente em:
  `https://api.openai.com/v1/responses`
- utilização da Responses API;
- leitura segura da resposta antes de converter para JSON;
- mensagens de erro mais claras;
- remoção da dependência de `AI_API_URL`;
- manutenção de:
  - autenticação Supabase;
  - histórico;
  - contador mensal;
  - limites por plano.

## Variáveis necessárias na Netlify

- `AI_API_KEY`
- `AI_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Valor recomendado:

`AI_MODEL = gpt-5-mini`

A variável `AI_API_URL` pode permanecer, mas esta versão já não a utiliza.

## Publicação

1. Publique este ZIP completo na Netlify.
2. Faça um novo deploy.
3. Aguarde `Published`.
4. Atualize `/intelligence.html` com `Ctrl + F5`.
5. Crie uma nova conversa e envie uma mensagem.

Se surgir um novo erro, a mensagem deverá indicar diretamente se é:
- chave inválida;
- falta de créditos;
- modelo sem acesso;
- limite de utilização;
- problema de configuração.
