if (sessionStorage.getItem('aiOfficeDemoAuthenticated') !== 'true') {
  window.location.href = 'login.html';
}

const pages=document.querySelectorAll('.page'),nav=document.querySelectorAll('nav button'),title=document.getElementById('title');
function openPage(id){pages.forEach(p=>p.classList.toggle('active',p.id===id));nav.forEach(b=>b.classList.toggle('active',b.dataset.page===id));const b=[...nav].find(x=>x.dataset.page===id);title.textContent=b?b.textContent.trim():'Início';document.getElementById('side').classList.remove('open')}
nav.forEach(b=>b.onclick=()=>openPage(b.dataset.page));document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPage(b.dataset.open));document.getElementById('menu').onclick=()=>document.getElementById('side').classList.toggle('open');
document.getElementById('request').onsubmit=e=>{e.preventDefault();localStorage.setItem('aiOfficeClientRequest',JSON.stringify(Object.fromEntries(new FormData(e.target))));document.getElementById('ok').style.display='block';e.target.reset()};
document.getElementById('profile').onsubmit=e=>{e.preventDefault();alert('Alterações guardadas apenas para demonstração.')};
document.getElementById('chatForm').onsubmit=e=>{e.preventDefault();const input=document.getElementById('chatInput'),t=input.value.trim();if(!t)return;const d=document.createElement('div');d.className='sent';d.innerHTML='<b>João Silva</b><p>'+t.replace(/[<>]/g,'')+'</p><small>Agora</small>';document.getElementById('chat').appendChild(d);input.value=''};
document.querySelectorAll('.files button,.docs,.head .primary').forEach(e=>e.addEventListener('click',()=>alert('Funcionalidade disponível numa fase futura.')));
const logoutButton=document.getElementById('logoutButton');if(logoutButton){logoutButton.onclick=()=>{sessionStorage.removeItem('aiOfficeDemoAuthenticated');window.location.href='login.html';};}
