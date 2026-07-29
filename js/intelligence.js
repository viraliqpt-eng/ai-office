const db = window.supabaseClient || window.aiOfficeSupabase || null;
const profiles={general:'Assistente Geral',realestate:'Assistente Imobiliário',email:'Assistente de Email',documents:'Assistente de Documentos'};
let currentAgent='general',currentConversationId=null,currentCustomerId=null,monthlyLimit=50;
const form=document.getElementById('form'),promptInput=document.getElementById('prompt'),conversation=document.getElementById('conversation'),welcome=document.getElementById('welcome'),sendButton=document.getElementById('sendButton');
const fileInput=document.getElementById('fileInput'),attachmentPreview=document.getElementById('attachmentPreview'),attachmentName=document.getElementById('attachmentName'),removeAttachment=document.getElementById('removeAttachment');
let selectedAttachment=null;

function addMessage(role,text){const el=document.createElement('article');el.className=`message ${role}`;el.textContent=text;conversation.appendChild(el);return el}
function formatBytes(bytes){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}
function clearAttachment(){
  selectedAttachment=null;
  fileInput.value='';
  attachmentPreview.hidden=true;
  attachmentName.textContent='';
}
function readFileAsBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
    reader.onerror=()=>reject(new Error('Não foi possível ler o documento.'));
    reader.readAsDataURL(file);
  });
}

function resetView(){currentConversationId=null;conversation.innerHTML='';conversation.classList.remove('active');document.body.classList.remove('chat-active');welcome.style.display='';promptInput.value='';clearAttachment();document.getElementById('count').textContent='0 / 4000';document.querySelectorAll('.history-item').forEach(x=>x.classList.remove('active'))}
async function session(){if(!db)return null;const{data:{session}}=await db.auth.getSession();return session}
async function authHeader(){const s=await session();return s?.access_token?{'Authorization':`Bearer ${s.access_token}`}:{}} 

async function loadCustomer(){
  if(!db){
    document.getElementById('historyList').innerHTML =
      '<p class="history-empty">Supabase não configurado em js/config.js.</p>';
    return false;
  }
  const s=await session();
  if(!s){
    location.href='login.html?redirect=intelligence.html';
    return false;
  }
  const{data,error}=await db.from('customers').select('id,plan').eq('auth_user_id',s.user.id).maybeSingle();
  if(error||!data){document.getElementById('historyList').innerHTML='<p class="history-empty">Perfil de cliente não encontrado.</p>';return}
  currentCustomerId=data.id;
  const limits={starter:50,business:250,complete:1000};
  monthlyLimit=limits[String(data.plan||'starter').toLowerCase()]||50;
  document.getElementById('planLabel').textContent=`Plano ${data.plan||'Starter'}`;
  return true;
}

async function updateUsage(){
  if(!currentCustomerId)return;
  const start=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
  const{count}=await db.from('ai_requests').select('*',{count:'exact',head:true}).eq('customer_id',currentCustomerId).gte('created_at',start);
  const used=count||0;document.getElementById('usage').textContent=`${used} / ${monthlyLimit}`;
  document.getElementById('bar').style.width=`${Math.min(100,used/monthlyLimit*100)}%`;
}

async function loadHistory(){
  const list=document.getElementById('historyList');
  if(!currentCustomerId){list.innerHTML='<p class="history-empty">Sem histórico disponível.</p>';return}
  const{data,error}=await db.from('ai_conversations').select('id,title,agent_type,updated_at').eq('customer_id',currentCustomerId).order('updated_at',{ascending:false}).limit(15);
  if(error){list.innerHTML='<p class="history-empty">Não foi possível carregar.</p>';return}
  if(!data?.length){list.innerHTML='<p class="history-empty">Ainda não existem conversas.</p>';return}
  list.innerHTML='';
  data.forEach(item=>{
    const btn=document.createElement('button');btn.className='history-item';btn.dataset.id=item.id;
    btn.innerHTML=`<strong>${item.title||'Nova conversa'}</strong><small>${profiles[item.agent_type]||'Assistente'}</small>`;
    btn.onclick=()=>openConversation(item,btn);list.appendChild(btn);
  });
}

async function openConversation(item,button){
  currentConversationId=item.id;currentAgent=item.agent_type||'general';
  document.getElementById('title').textContent=profiles[currentAgent]||profiles.general;
  document.querySelectorAll('.agent').forEach(x=>x.classList.toggle('active',x.dataset.agent===currentAgent));
  document.querySelectorAll('.history-item').forEach(x=>x.classList.toggle('active',x===button));
  welcome.style.display='none';conversation.classList.add('active');document.body.classList.add('chat-active');conversation.innerHTML='';
  const{data,error}=await db.from('ai_requests').select('prompt,answer,created_at').eq('customer_id',currentCustomerId).eq('conversation_id',item.id).order('created_at',{ascending:true});
  if(error){addMessage('assistant','Não foi possível abrir esta conversa.');return}
  (data||[]).forEach(row=>{addMessage('user',row.prompt);if(row.answer)addMessage('assistant',row.answer)});
}

document.querySelectorAll('.agent').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.agent').forEach(x=>x.classList.toggle('active',x===btn));currentAgent=btn.dataset.agent;document.getElementById('title').textContent=profiles[currentAgent];resetView()});
document.querySelectorAll('[data-prompt]').forEach(btn=>btn.onclick=()=>{promptInput.value=btn.dataset.prompt;document.getElementById('count').textContent=`${promptInput.value.length} / 4000`;promptInput.focus()});
promptInput.oninput=()=>document.getElementById('count').textContent=`${promptInput.value.length} / 4000`;
document.getElementById('newChat').onclick=resetView;
document.getElementById('refreshHistory').onclick=loadHistory;


fileInput.onchange=async()=>{
  const file=fileInput.files?.[0];
  if(!file)return;

  const allowed=[
    'application/pdf','text/plain','text/csv','application/json','text/markdown',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf','image/png','image/jpeg','image/webp'
  ];

  if(!allowed.includes(file.type) && !/\.(pdf|txt|csv|json|md|doc|docx|rtf|png|jpe?g|webp)$/i.test(file.name)){
    alert('Formato não suportado. Utilize PDF, Word, texto, CSV, JSON ou imagem.');
    clearAttachment();
    return;
  }

  if(file.size>4*1024*1024){
    alert('O documento excede o limite de 4 MB desta versão.');
    clearAttachment();
    return;
  }

  try{
    const data=await readFileAsBase64(file);
    selectedAttachment={name:file.name,type:file.type||'application/octet-stream',size:file.size,data};
    attachmentName.textContent=`${file.name} · ${formatBytes(file.size)}`;
    attachmentPreview.hidden=false;
    if(!promptInput.value.trim())promptInput.value='Analisa este documento e apresenta um resumo com os pontos mais importantes.';
    document.getElementById('count').textContent=`${promptInput.value.length} / 4000`;
  }catch(err){
    alert(err.message);
    clearAttachment();
  }
};
removeAttachment.onclick=clearAttachment;

form.onsubmit=async e=>{
  e.preventDefault();
  const text=promptInput.value.trim();
  if(!text && !selectedAttachment)return;
  if(!db){
    alert('O Supabase ainda não está configurado em js/config.js.');
    return;
  }
  const activeSession=await session();
  if(!activeSession){
    location.href='login.html?redirect=intelligence.html';
    return;
  }
  welcome.style.display='none';document.body.classList.add('chat-active');conversation.classList.add('active');addMessage('user',text);
  promptInput.value='';document.getElementById('count').textContent='0 / 4000';sendButton.disabled=true;
  const loading=addMessage('assistant','A preparar a resposta...');
  try{
    const headers={'Content-Type':'application/json',...(await authHeader())};
    const r=await fetch('/.netlify/functions/ai-assistant',{method:'POST',headers,body:JSON.stringify({prompt:text||'Analisa o documento anexado.',agent:currentAgent,conversationId:currentConversationId,attachment:selectedAttachment})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Erro no assistente.');
    currentConversationId=d.conversationId||currentConversationId;loading.textContent=d.answer;
    clearAttachment();
    await updateUsage();await loadHistory();
  }catch(err){loading.textContent=`Erro: ${err.message}`}
  finally{sendButton.disabled=false}
};

(async()=>{
  const authenticated = await loadCustomer();
  if(authenticated){
    await updateUsage();
    await loadHistory();
  }
})();
