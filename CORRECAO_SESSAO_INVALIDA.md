# Correção — Sessão inválida

## Problema encontrado

O ficheiro `supabase-client.js` criava o cliente Supabase com o nome:

`aiOfficeSupabase`

Mas a página Intelligence procurava:

`window.supabaseClient`

Por isso, o token de sessão não era enviado para a Netlify Function e surgia:

`Erro: Sessão inválida. Inicie sessão novamente.`

## Correção aplicada

- criada a compatibilidade global `window.supabaseClient`;
- a página Intelligence aceita ambos os nomes;
- o token autenticado passa a ser enviado corretamente;
- o histórico e a utilização mensal podem carregar após autenticação.

## Publicação

1. Publique este ZIP completo na Netlify.
2. Aguarde o deploy terminar.
3. Termine sessão.
4. Entre novamente.
5. Abra `/intelligence.html`.
6. Envie uma mensagem de teste.

Importante: para histórico real, o login deve ser feito com um utilizador do Supabase, não apenas através do modo de demonstração.
