# Fase 13 — Histórico na interface

Incluído:

- lista de conversas recentes;
- abertura de conversas anteriores;
- associação ao cliente autenticado;
- envio do token Supabase para a Netlify Function;
- contagem mensal real;
- limites por plano;
- criação automática do título;
- segurança para impedir acesso a conversas de outros clientes.

## Instalação

1. Execute primeiro o SQL da Fase 12.
2. Publique este ZIP completo na Netlify.
3. Confirme as variáveis:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - AI_API_URL (opcional)
   - AI_API_KEY (opcional)
   - AI_MODEL (opcional)
4. Inicie sessão como cliente.
5. Abra `/intelligence.html`.
6. Crie uma conversa, atualize a página e abra-a na barra lateral.
