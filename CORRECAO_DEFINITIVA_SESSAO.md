# Correção definitiva da sessão

Foram encontrados dois problemas concretos:

1. O JavaScript continha `const db = db || ...`, o que provocava um erro de execução antes de a sessão ser carregada.
2. O ficheiro `js/config.js` deste pacote ainda contém valores de exemplo:
   - `COLOQUE_AQUI_O_SUPABASE_URL`
   - `COLOQUE_AQUI_A_SUPABASE_ANON_KEY`

## Passo obrigatório antes de publicar

Abra `js/config.js` e substitua:

```js
SUPABASE_URL: "COLOQUE_AQUI_O_SUPABASE_URL",
SUPABASE_ANON_KEY: "COLOQUE_AQUI_A_SUPABASE_ANON_KEY",
```

pelos valores reais encontrados no Supabase em:

**Project Settings → API**

Use:
- Project URL
- anon public key

Não coloque a `service_role` no ficheiro público.

## Netlify

Nas variáveis de ambiente da Netlify, mantenha:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Depois:

1. Publique o ZIP.
2. Termine sessão.
3. Entre novamente com um utilizador real do Supabase.
4. Abra `/intelligence.html`.
5. Envie uma mensagem.
