# Fase 15 — Análise de documentos

## Incluído

- botão **Anexar** no AI Office™ Intelligence;
- análise de PDF, Word, texto, CSV, JSON e imagens;
- limite de 4 MB por ficheiro;
- envio seguro através da Netlify Function;
- análise pela OpenAI Responses API;
- histórico da conversa mantido;
- registo dos metadados em `ai_documents`;
- política RLS para cada cliente consultar apenas os próprios documentos.

## Importante

Nesta fase, o conteúdo integral do ficheiro não é guardado no Supabase.
Apenas são guardados:

- nome;
- tipo;
- tamanho;
- cliente;
- conversa;
- pedido associado.

Isto reduz exposição de documentos e custos de armazenamento.

## Instalação

1. No Supabase, execute:
   `supabase/fase15_documentos.sql`

2. Atualize o repositório GitHub com todos os ficheiros deste ZIP.

3. Aguarde a Netlify publicar o novo deploy.

4. Abra:
   `/intelligence.html`

5. Clique em **Anexar**, selecione um documento e envie uma instrução.

## Exemplos

- Resume este contrato em linguagem simples.
- Extrai prazos, valores e obrigações.
- Identifica riscos e pontos que devem ser confirmados.
- Transforma este documento numa proposta comercial.
- Analisa esta imagem e descreve os dados visíveis.

A análise deve ser confirmada por um profissional quando envolver matérias jurídicas,
financeiras, médicas ou contratuais.
