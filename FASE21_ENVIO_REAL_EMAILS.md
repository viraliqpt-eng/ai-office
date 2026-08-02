# Fase 21 — Envio real de emails

Esta fase usa a API da Resend através de uma Netlify Function.

## Configuração
1. Execute `supabase/fase21_envio_real_emails.sql` no Supabase.
2. Crie uma conta na Resend e verifique o domínio de envio.
3. Na Netlify adicione:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (ex.: `AI Office <contacto@seudominio.pt>`)
   - `EMAIL_REPLY_TO` (opcional)
4. Atualize no GitHub:
   - `netlify/functions/send-email.js`
   - `js/emails.js`
   - `css/emails.css`
5. Depois do deploy, abra `/emails.html`, selecione um email e clique em **Enviar agora**.

A chave da Resend fica apenas na Netlify; a função valida a sessão Supabase e só envia rascunhos do próprio cliente.
