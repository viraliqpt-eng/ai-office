# Correção — botão “Novo contacto”

O botão não respondia porque `js/crm.js` continha um erro de sintaxe:
uma quebra de linha literal dentro de `.join('...')`.

## Atualizar no GitHub

Substituir apenas:

`js/crm.js`

Depois aguardar o deploy da Netlify ficar `Published` e atualizar com `Ctrl + F5`.
