# Fase 16 — Chat persistente com documentos

## O que esta versão acrescenta

Depois de anexar um documento uma única vez, o cliente pode continuar a fazer perguntas sem o voltar a enviar.

Exemplos:

- Qual é o preço indicado no documento?
- Resume apenas a secção de investimento.
- Existem prazos ou condições de pagamento?
- Quais os riscos que devo confirmar?
- Cria um email com base nesta proposta.

## Como funciona

1. O ficheiro é enviado para a OpenAI Files API.
2. O respetivo `file_id` é guardado em `ai_documents`.
3. O documento aparece em **Documentos recentes**.
4. Ao selecionar o documento, as perguntas seguintes reutilizam o mesmo ficheiro.
5. O cliente só consegue ver os próprios documentos através das políticas RLS.

## Instalação

1. Execute no Supabase:
   `supabase/fase16_chat_documentos.sql`

2. Atualize no GitHub:
   - `intelligence.html`
   - `css/intelligence.css`
   - `js/intelligence.js`
   - `netlify/functions/ai-assistant.js`

3. Aguarde o deploy da Netlify ficar `Published`.

4. Atualize o navegador com `Ctrl + F5`.

5. Anexe um PDF e faça uma pergunta.

6. Selecione o documento em **Documentos recentes** e faça uma segunda pergunta sem voltar a anexar.

## Nota

Os documentos enviados antes desta fase não têm `openai_file_id`.
Se forem selecionados, o sistema pedirá que sejam anexados novamente uma única vez.
