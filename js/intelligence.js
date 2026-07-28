const profiles={general:'Assistente Geral',realestate:'Assistente Imobiliário',email:'Assistente de Email',documents:'Assistente de Documentos'};
let current='general',usage=Number(localStorage.getItem('aiOfficeAIUsage')||0);
const form=document.getElementById('form'),prompt=document.getElementById('prompt'),conversation=document.getElementById('conversation'),welcome=document.getElementById('welcome');
function updateUsage(){document.getElementById('usage').textContent=`${usage} / 50`;document.getElementById('bar').style.width=`${Math.min(100,usage/50*100)}%`}
function message(role,text){const el=document.createElement('article');el.className=`message ${role}`;el.textContent=text;conversation.appendChild(el);return el}
document.querySelectorAll('.agent').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.agent').forEach(x=>x.classList.toggle('active',x===btn));current=btn.dataset.agent;document.getElementById('title').textContent=profiles[current];conversation.innerHTML='';conversation.classList.remove('active');welcome.style.display=''});
document.querySelectorAll('[data-prompt]').forEach(btn=>btn.onclick=()=>{prompt.value=btn.dataset.prompt;document.getElementById('count').textContent=`${prompt.value.length} / 4000`;prompt.focus()});
prompt.oninput=()=>document.getElementById('count').textContent=`${prompt.value.length} / 4000`;
document.getElementById('newChat').onclick=()=>{conversation.innerHTML='';conversation.classList.remove('active');welcome.style.display='';prompt.value=''};
form.onsubmit=async e=>{e.preventDefault();const text=prompt.value.trim();if(!text)return;if(usage>=50){alert('Limite mensal atingido.');return}
welcome.style.display='none';conversation.classList.add('active');message('user',text);prompt.value='';document.getElementById('count').textContent='0 / 4000';const loading=message('assistant','A preparar a resposta...');
try{const r=await fetch('/.netlify/functions/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:text,agent:current})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Erro no assistente.');loading.textContent=d.answer;usage++;localStorage.setItem('aiOfficeAIUsage',usage);updateUsage()}catch(err){loading.textContent=`Erro: ${err.message}`}};
updateUsage();