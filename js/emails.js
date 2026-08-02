const db = window.supabaseClient || window.aiOfficeSupabase || null;
let customerId=null;
let contacts=[];
let emails=[];
let selectedEmail=null;

const els={
  list:document.getElementById('emailList'),
  panel:document.getElementById('emailPanel'),
  dialog:document.getElementById('emailDialog'),
  form:document.getElementById('emailForm'),
  search:document.getElementById('search'),
  statusFilter:document.getElementById('statusFilter')
};

async function init(){
  if(!db){alert('Supabase não configurado em js/config.js.');return}
  const {data:{session}}=await db.auth.getSession();
  if(!session){location.href='login.html?redirect=emails.html';return}

  const {data,error}=await db.from('customers').select('id').eq('auth_user_id',session.user.id).maybeSingle();
  if(error||!data){els.list.innerHTML='<p class="empty">Perfil de cliente não encontrado.</p>';return}

  customerId=data.id;
  await loadContacts();
  await loadEmails();
}

async function loadContacts(){
  const {data}=await db.from('crm_contacts').select('id,full_name,email,company').eq('customer_id',customerId).order('full_name');
  contacts=data||[];
  const select=document.getElementById('contactId');
  select.innerHTML='<option value="">Sem contacto associado</option>';
  contacts.forEach(c=>{
    const option=document.createElement('option');
    option.value=c.id;
    option.textContent=`${c.full_name}${c.company?` — ${c.company}`:''}`;
    select.appendChild(option);
  });
}

async function loadEmails(){
  const {data,error}=await db.from('crm_email_drafts').select('*,crm_contacts(full_name,company,email)').eq('customer_id',customerId).order('updated_at',{ascending:false});
  if(error){els.list.innerHTML='<p class="empty">Não foi possível carregar os emails.</p>';return}
  emails=data||[];
  renderEmails();
  updateStats();
}

function shown(){
  const q=els.search.value.trim().toLowerCase();
  const status=els.statusFilter.value;
  return emails.filter(e=>{
    const hay=[e.recipient_name,e.recipient_email,e.subject,e.body].filter(Boolean).join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!status||e.status===status);
  });
}

function renderEmails(){
  const rows=shown();
  if(!rows.length){els.list.innerHTML='<p class="empty">Ainda não existem emails.</p>';return}
  els.list.innerHTML='';
  rows.forEach(e=>{
    const row=document.createElement('article');
    row.className='email-row';
    row.innerHTML=`
      <div><strong>${esc(e.recipient_name||e.recipient_email||'Sem destinatário')}</strong><small>${esc(e.recipient_email||'—')}</small></div>
      <div><strong>${esc(e.subject||'Sem assunto')}</strong><small>${esc((e.body||'').slice(0,90))}</small></div>
      <div><span class="badge">${statusLabel(e.status)}</span></div>`;
    row.onclick=()=>selectEmail(e);
    els.list.appendChild(row);
  });
}

function updateStats(){
  document.getElementById('statDrafts').textContent=emails.filter(e=>e.status==='draft').length;
  document.getElementById('statReady').textContent=emails.filter(e=>e.status==='ready').length;
  document.getElementById('statSent').textContent=emails.filter(e=>e.status==='sent').length;
}

function selectEmail(email){
  selectedEmail=email;
  els.panel.innerHTML=`
    <h2>${esc(email.subject||'Sem assunto')}</h2>
    <span class="badge">${statusLabel(email.status)}</span>
    <div class="detail-grid">
      <div><span>Destinatário</span><strong>${esc(email.recipient_name||'—')}</strong></div>
      <div><span>Email</span><strong>${esc(email.recipient_email||'—')}</strong></div>
      <div><span>Mensagem</span><div class="email-body">${esc(email.body||'')}</div></div>
    </div>
    <div class="panel-actions">
      <button onclick="editSelected()">Editar</button>
      <button onclick="copySelected()">Copiar</button>
      <button onclick="openMailClient()">Abrir no email</button>
      <button onclick="markSent()">Marcar enviado</button>
      <button onclick="deleteSelected()">Eliminar</button>
    </div>`;
}

function openDialog(email=null){
  document.getElementById('dialogTitle').textContent=email?'Editar email':'Novo email';
  document.getElementById('emailId').value=email?.id||'';
  document.getElementById('contactId').value=email?.contact_id||'';
  document.getElementById('recipientName').value=email?.recipient_name||'';
  document.getElementById('recipientEmail').value=email?.recipient_email||'';
  document.getElementById('subject').value=email?.subject||'';
  document.getElementById('body').value=email?.body||'';
  document.getElementById('status').value=email?.status||'draft';
  els.dialog.showModal();
}

document.getElementById('contactId').onchange=()=>{
  const contact=contacts.find(c=>c.id===document.getElementById('contactId').value);
  if(!contact)return;
  document.getElementById('recipientName').value=contact.full_name||'';
  document.getElementById('recipientEmail').value=contact.email||'';
};

els.form.onsubmit=async e=>{
  e.preventDefault();
  const id=document.getElementById('emailId').value;
  const status=document.getElementById('status').value;
  const payload={
    customer_id:customerId,
    contact_id:document.getElementById('contactId').value||null,
    recipient_name:document.getElementById('recipientName').value.trim()||null,
    recipient_email:document.getElementById('recipientEmail').value.trim()||null,
    subject:document.getElementById('subject').value.trim(),
    body:document.getElementById('body').value.trim(),
    status,
    sent_at:status==='sent'?new Date().toISOString():null,
    updated_at:new Date().toISOString()
  };

  const query=id
    ? db.from('crm_email_drafts').update(payload).eq('id',id).eq('customer_id',customerId)
    : db.from('crm_email_drafts').insert(payload);

  const {error}=await query;
  if(error){alert(error.message);return}
  els.dialog.close();
  await loadEmails();
};

function sendToAI(mode){
  const current={
    emailId:document.getElementById('emailId').value||'',
    contactId:document.getElementById('contactId').value||'',
    recipientName:document.getElementById('recipientName').value.trim(),
    recipientEmail:document.getElementById('recipientEmail').value.trim(),
    subject:document.getElementById('subject').value.trim(),
    body:document.getElementById('body').value.trim(),
    status:document.getElementById('status').value
  };

  sessionStorage.setItem('aiOfficeEmailDraft',JSON.stringify(current));

  const prompt=mode==='generate'
    ? `Escreve um email profissional em português de Portugal para ${current.recipientName||'o cliente'} (${current.recipientEmail||'email não indicado'}). Objetivo/assunto: ${current.subject||'acompanhamento comercial'}. Responde apenas com:\nAssunto: ...\n\nCorpo do email.`
    : `Melhora este email profissional, mantendo o sentido e tornando-o claro, cordial e persuasivo. Responde apenas com:\nAssunto: ...\n\nCorpo do email.\\n\\nDestinatário: ${current.recipientName||'cliente'}\nAssunto atual: ${current.subject}\n\n${current.body}`;

  const returnContext={
    type:'email',
    label:'Email inteligente',
    returnUrl:'emails.html',
    mode
  };

  sessionStorage.setItem('aiOfficeReturnContext',JSON.stringify(returnContext));
  localStorage.setItem('aiOfficePendingPrompt',prompt);
  location.href='intelligence.html';
}

window.editSelected=()=>selectedEmail&&openDialog(selectedEmail);
window.copySelected=async()=>{
  if(!selectedEmail)return;
  await navigator.clipboard.writeText(`Assunto: ${selectedEmail.subject}\n\n${selectedEmail.body}`);
  alert('Email copiado.');
};
window.openMailClient=()=>{
  if(!selectedEmail)return;
  const href=`mailto:${encodeURIComponent(selectedEmail.recipient_email||'')}?subject=${encodeURIComponent(selectedEmail.subject||'')}&body=${encodeURIComponent(selectedEmail.body||'')}`;
  location.href=href;
};
window.markSent=async()=>{
  if(!selectedEmail)return;
  const {error}=await db.from('crm_email_drafts').update({status:'sent',sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',selectedEmail.id).eq('customer_id',customerId);
  if(error){alert(error.message);return}
  await loadEmails();
};
window.deleteSelected=async()=>{
  if(!selectedEmail||!confirm('Eliminar este email?'))return;
  const {error}=await db.from('crm_email_drafts').delete().eq('id',selectedEmail.id).eq('customer_id',customerId);
  if(error){alert(error.message);return}
  selectedEmail=null;
  els.panel.innerHTML='<p class="empty">Selecione um email para ver os detalhes.</p>';
  await loadEmails();
};

document.getElementById('newEmail').onclick=()=>openDialog();
document.getElementById('cancelDialog').onclick=()=>els.dialog.close();
document.getElementById('generateAI').onclick=()=>sendToAI('generate');
document.getElementById('improveAI').onclick=()=>sendToAI('improve');
els.search.oninput=renderEmails;
els.statusFilter.onchange=renderEmails;

function statusLabel(v){return ({draft:'Rascunho',ready:'Preparado',sent:'Enviado'})[v]||v}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}


function restoreReturnedAIContent(){
  let savedDraft=null;
  let returned=null;

  try{
    const rawDraft=sessionStorage.getItem('aiOfficeEmailDraft');
    savedDraft=rawDraft?JSON.parse(rawDraft):null;

    const rawReturned=sessionStorage.getItem('aiOfficeReturnedContent');
    returned=rawReturned?JSON.parse(rawReturned):null;
  }catch{
    savedDraft=null;
    returned=null;
  }

  if(!savedDraft) return;

  openDialog({
    id:savedDraft.emailId||'',
    contact_id:savedDraft.contactId||null,
    recipient_name:savedDraft.recipientName||'',
    recipient_email:savedDraft.recipientEmail||'',
    subject:(returned?.aiSubject||savedDraft.subject||''),
    body:(returned?.aiBody||savedDraft.body||''),
    status:savedDraft.status||'draft'
  });

  if(returned?.aiBody){
    sessionStorage.removeItem('aiOfficeReturnedContent');
  }
}


init().then(restoreReturnedAIContent);