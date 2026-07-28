function json(statusCode,payload){return{statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}}
exports.handler=async(event)=>{if(event.httpMethod!=='POST')return json(405,{error:'Método não permitido.'});
let p;try{p=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Pedido inválido.'})}
const prompt=String(p.prompt||'').trim();if(!prompt)return json(400,{error:'Escreva um pedido.'});
if(!process.env.AI_API_URL||!process.env.AI_API_KEY){return json(200,{demo:true,answer:`Resposta de demonstração do AI Office™ Intelligence.

Pedido recebido:
${prompt}

Próximos passos sugeridos:
1. Definir o objetivo principal.
2. Reunir a informação necessária.
3. Criar uma primeira versão.
4. Rever e adaptar ao contexto da empresa.

Configure AI_API_URL e AI_API_KEY na Netlify para ativar respostas de IA reais.`})}
try{const r=await fetch(process.env.AI_API_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({model:process.env.AI_MODEL||'default',messages:[{role:'system',content:'Responde em português de Portugal como assistente empresarial profissional.'},{role:'user',content:prompt}]})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||d.error||'Erro no fornecedor de IA.');const answer=d.choices?.[0]?.message?.content||d.output_text||d.answer;if(!answer)throw new Error('Resposta vazia.');return json(200,{answer})}catch(e){return json(500,{error:e.message})}};