# Configuração do Supabase

1. Criar um projeto em Supabase.
2. Abrir o SQL Editor.
3. Executar `supabase/schema.sql`.
4. Abrir Project Settings → API.
5. Copiar o Project URL e a anon public key.
6. Colar esses valores em `js/config.js`.
7. Alterar `DEMO_MODE` para `false`.
8. Em Authentication → URL Configuration, adicionar:
   - `https://ai-officept.netlify.app`
   - `https://aioffice.pt`
9. Criar um utilizador de teste em Authentication → Users.
10. Preencher os metadados:
   - `full_name`
   - `company_name`
   - `role`

Nunca colocar a service_role key no frontend.

## Primeiro administrador
Depois de criar o utilizador, execute:
```sql
update public.profiles set role='admin', full_name='Pedro Figueiredo'
where id=(select id from auth.users where email='SEU_EMAIL_ADMIN');
```
Acesso: `/admin-login.html`
Demonstração: `admin@aioffice.pt` / `admin2026`
