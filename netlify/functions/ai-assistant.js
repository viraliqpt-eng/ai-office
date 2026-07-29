const {createClient}=require('@supabase/supabase-js');
function json(statusCode,payload){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(payload)}}
function makeTitle(text){return text.replace(/\s+/g,' ').trim().slice(0,70)||'Nova conversa'}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Método não permitido.'});
  let p;try{p=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Pedido inválido.'})}
  const prompt=String(p.prompt||'').trim();
  if(!prompt||prompt.length>4000)return json(400,{error:'O pedido deve ter entre 1 e 4000 caracteres.'});

  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return json(500,{error:'Supabase não configurado na Netlify.'});
  const supabase=createClient(url,key,{auth:{persistSession:false}});
  const auth=event.headers.authorization||event.headers.Authorization||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!token)return json(401,{error:'Sessão inválida. Inicie sessão novamente.'});

  const{data:{user},error:userError}=await supabase.auth.getUser(token);
  if(userError||!user)return json(401,{error:'Não foi possível validar a sessão.'});
  const{data:customer,error:customerError}=await supabase.from('customers').select('id,plan').eq('auth_user_id',user.id).maybeSingle();
  if(customerError||!customer)return json(403,{error:'Perfil de cliente não encontrado.'});

  const limits={starter:50,business:250,complete:1000};
  const limit=limits[String(customer.plan||'starter').toLowerCase()]||50;
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  const{count}=await supabase.from('ai_requests').select('*',{count:'exact',head:true}).eq('customer_id',customer.id).gte('created_at',start);
  if((count||0)>=limit)return json(429,{error:'Atingiu o limite mensal do seu plano.'});

  let conversationId=p.conversationId||null;
  if(conversationId){
    const{data:existing}=await supabase.from('ai_conversations').select('id').eq('id',conversationId).eq('customer_id',customer.id).maybeSingle();
    if(!existing)return json(403,{error:'Conversa inválida.'});
  }else{
    const{data:created,error:createError}=await supabase.from('ai_conversations').insert({customer_id:customer.id,title:makeTitle(prompt),agent_type:p.agent||'general'}).select('id').single();
    if(createError)return json(500,{error:'Não foi possível criar a conversa.'});
    conversationId=created.id;
  }

  let answer;
  if(!process.env.AI_API_URL||!process.env.AI_API_KEY){
    answer=`Resposta de demonstração do AI Office™ Intelligence.

Pedido recebido:
${prompt}

Próximos passos sugeridos:
1. Definir o objetivo principal.
2. Reunir a informação necessária.
3. Criar uma primeira versão.
4. Rever e adaptar ao contexto da empresa.

Configure AI_API_URL e AI_API_KEY na Netlify para ativar respostas de IA reais.`;
  }else{
    try{
      const r=await fetch(process.env.AI_API_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({model:process.env.AI_MODEL||'default',messages:[{role:'system',content:'Responde em português de Portugal como assistente empresarial profissional.'},{role:'user',content:prompt}]})});
      const d=await r.json();if(!r.ok)throw new Error(d.error?.message||d.error||'Erro no fornecedor de IA.');
      answer=d.choices?.[0]?.message?.content||d.output_text||d.answer;if(!answer)throw new Error('Resposta vazia.');
    }catch(e){return json(500,{error:e.message})}
  }

  const{error:saveError}=await supabase.from('ai_requests').insert({customer_id:customer.id,conversation_id:conversationId,agent_type:p.agent||'general',prompt,answer,status:'completed'});
  if(saveError)return json(500,{error:'A resposta foi criada, mas não foi possível guardar a conversa.'});
  await supabase.from('ai_conversations').update({updated_at:new Date().toISOString()}).eq('id',conversationId).eq('customer_id',customer.id);
  return json(200,{answer,conversationId,demo:!process.env.AI_API_URL||!process.env.AI_API_KEY});
};