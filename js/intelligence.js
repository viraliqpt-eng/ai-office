const db = db || window.aiOfficeSupabase || (typeof aiOfficeSupabase !== 'undefined' ? aiOfficeSupabase : null);
const profiles={general:'Assistente Geral',realestate:'Assistente Imobiliário',email:'Assistente de Email',documents:'Assistente de Documentos'};
let currentAgent='general',currentConversationId=null,currentCustomerId=null,monthlyLimit=50;
const form=document.getElementById('form'),promptInput=document.getElementById('prompt'),conversation=document.getElementById('conversation'),welcome=document.getElementById('welcome'),sendButton=document.getElementById('sendButton');

function addMessage(role,text){const el=document.createElement('article');el.className=`message ${role}`;el.textContent=text;conversation.appendChild(el);return el}
function resetView(){currentConversationId=null;conversation.innerHTML='';conversation.classList.remove('active');document.body.classList.remove('chat-active');welcome.style.display='';promptInput.value='';document.getElementById('count').textContent='0 / 4000';document.querySelectorAll('.history-item').forEach(x=>x.classList.remove('active'))}
async function session(){if(!db)return null;const{data:{session}}=await db.auth.getSession();return session}
async function authHeader(){const s=await session();return s?.access_token?{'Authorization':`Bearer ${s.access_token}`}:{}} 

async function loadCustomer(){
  if(!db)return;
  const s=await session();
  if(!s){location.href='login.html';return}
  const{data,error}=await db.from('customers').select('id,plan').eq('auth_user_id',s.user.id).maybeSingle();
  if(error||!data){document.getElementById('historyList').innerHTML='<p class="history-empty">Perfil de cliente não encontrado.</p>';return}
  currentCustomerId=data.id;
  const limits={starter:50,business:250,complete:1000};
  monthlyLimit=limits[String(data.plan||'starter').toLowerCase()]||50;
  document.getElementById('planLabel').textContent=`Plano ${data.plan||'Starter'}`;
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

form.onsubmit=async e=>{
  e.preventDefault();const text=promptInput.value.trim();if(!text)return;
  welcome.style.display='none';document.body.classList.add('chat-active');conversation.classList.add('active');addMessage('user',text);
  promptInput.value='';document.getElementById('count').textContent='0 / 4000';sendButton.disabled=true;
  const loading=addMessage('assistant','A preparar a resposta...');
  try{
    const headers={'Content-Type':'application/json',...(await authHeader())};
    const r=await fetch('/.netlify/functions/ai-assistant',{method:'POST',headers,body:JSON.stringify({prompt:text,agent:currentAgent,conversationId:currentConversationId})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Erro no assistente.');
    currentConversationId=d.conversationId||currentConversationId;loading.textContent=d.answer;
    await updateUsage();await loadHistory();
  }catch(err){loading.textContent=`Erro: ${err.message}`}
  finally{sendButton.disabled=false}
};

(async()=>{await loadCustomer();await updateUsage();await loadHistory()})();
