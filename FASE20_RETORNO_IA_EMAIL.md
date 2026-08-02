# Fase 20 — Retorno automático da IA para Emails

## O que foi acrescentado

- o formulário de email é preservado antes de abrir o Intelligence;
- a resposta da IA mostra o botão **Usar este conteúdo**;
- ao clicar, o utilizador regressa automaticamente a `emails.html`;
- o assunto e o corpo gerados pela IA são preenchidos no formulário;
- destinatário, contacto, estado e dados anteriores são mantidos;
- a janela de email foi compactada para reduzir o scroll.

## Instalação

Atualize no GitHub:

- `intelligence.html`
- `css/intelligence.css`
- `js/intelligence.js`
- `js/emails.js`
- `css/emails.css`

Não é necessário executar novo SQL.

## Teste

1. Abra `/emails.html`.
2. Crie ou edite um email.
3. Clique em **Gerar com IA** ou **Melhorar com IA**.
4. Aguarde a resposta.
5. Clique em **Usar este conteúdo**.
6. Confirme que regressa ao formulário com o assunto e a mensagem preenchidos.
