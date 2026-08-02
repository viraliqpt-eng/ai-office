const { createClient } = require('@supabase/supabase-js');
function json(statusCode,payload){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(payload)}}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function toHtml(t){return esc(t).replace(/\r\n/g,'\n').replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>')}
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Método não permitido.'});
 let p;try{p=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Pedido inválido.'})}
 const draftId=String(p.draftId||'').trim(); if(!draftId)return json(400,{error:'Rascunho não indicado.'});
 const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,RESEND_API_KEY,EMAIL_FROM,EMAIL_REPLY_TO}=process.env;
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return json(500,{error:'Supabase não configurado na Netlify.'});
 if(!RESEND_API_KEY||!EMAIL_FROM)return json(500,{error:'Configure RESEND_API_KEY e EMAIL_FROM na Netlify.'});
 const h=event.headers.authorization||event.headers.Authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):'';
 if(!token)return json(401,{error:'Sessão inválida.'});
 const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {data:u,error:ue}=await sb.auth.getUser(token); if(ue||!u?.user)return json(401,{error:'Não foi possível validar a sessão.'});
 const {data:c}=await sb.from('customers').select('id').eq('auth_user_id',u.user.id).maybeSingle(); if(!c)return json(403,{error:'Perfil de cliente não encontrado.'});
 const {data:d,error:de}=await sb.from('crm_email_drafts').select('id,recipient_email,recipient_name,subject,body,status').eq('id',draftId).eq('customer_id',c.id).maybeSingle();
 if(de||!d)return json(404,{error:'Email não encontrado.'});
 if(!d.recipient_email||!d.subject||!d.body)return json(400,{error:'Destinatário, assunto e mensagem são obrigatórios.'});
 const body={from:EMAIL_FROM,to:[d.recipient_email],subject:d.subject,text:d.body,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><p>${toHtml(d.body)}</p></div>`};
 if(EMAIL_REPLY_TO)body.reply_to=EMAIL_REPLY_TO;
 const at=new Date().toISOString();
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`aioffice-email-${d.id}`},body:JSON.stringify(body)});
  const raw=await r.text();let result;try{result=JSON.parse(raw)}catch{result={message:raw}}
  if(!r.ok){const msg=result?.message||result?.error?.message||`Falha no envio (${r.status}).`;await sb.from('crm_email_drafts').update({send_error:msg,last_send_attempt_at:at,updated_at:at}).eq('id',d.id).eq('customer_id',c.id);return json(r.status,{error:msg})}
  await sb.from('crm_email_drafts').update({status:'sent',sent_at:at,provider:'resend',provider_message_id:result.id||null,send_error:null,last_send_attempt_at:at,updated_at:at}).eq('id',d.id).eq('customer_id',c.id);
  return json(200,{success:true,message:'Email enviado com sucesso.',providerMessageId:result.id||null});
 }catch(e){const msg=e?.message||'Erro inesperado durante o envio.';await sb.from('crm_email_drafts').update({send_error:msg,last_send_attempt_at:at,updated_at:at}).eq('id',d.id).eq('customer_id',c.id);return json(502,{error:msg})}
};