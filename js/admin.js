const defaultOrders = [
  {id:'AO-2026-0001',client:'João Silva',company:'Silva Imobiliária, Lda.',email:'joao@example.com',service:'Business',value:399,status:'Novo'},
  {id:'AO-2026-0002',client:'Marta Costa',company:'Clínica Horizonte',email:'marta@example.com',service:'Complete',value:699,status:'Em análise'},
  {id:'AO-2026-0003',client:'Ricardo Lopes',company:'Casa do Bairro',email:'ricardo@example.com',service:'Starter',value:199,status:'Em produção'},
  {id:'AO-2026-0004',client:'Ana Ferreira',company:'Ferreira & Associados',email:'ana@example.com',service:'Business',value:399,status:'Entregue'}
];

let orders = JSON.parse(localStorage.getItem('aiOfficeOrders') || 'null') || defaultOrders;
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');

const statusColors = {
  'Novo':['#DBEAFE','#1D4ED8'],
  'Em análise':['#FEF3C7','#B45309'],
  'Em produção':['#EDE9FE','#6D28D9'],
  'Entregue':['#DCFCE7','#15803D'],
  'Concluído':['#E2E8F0','#334155']
};

function badge(status){
  const colors=statusColors[status]||['#E2E8F0','#334155'];
  return `<span class="badge" style="background:${colors[0]};color:${colors[1]}">${status}</span>`;
}

function save(){localStorage.setItem('aiOfficeOrders',JSON.stringify(orders));renderAll()}

function showView(id){
  views.forEach(v=>v.classList.toggle('active',v.id===id));
  navItems.forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  const item=[...navItems].find(n=>n.dataset.view===id);
  pageTitle.textContent=item?item.innerText.trim():'Dashboard';
  document.getElementById('sidebar').classList.remove('open');
}

navItems.forEach(item=>item.addEventListener('click',()=>showView(item.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
document.getElementById('mobileToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));

function renderDashboard(){
  document.getElementById('statNew').textContent=orders.filter(o=>o.status==='Novo').length;
  document.getElementById('statProgress').textContent=orders.filter(o=>o.status==='Em produção').length;
  document.getElementById('statClients').textContent=new Set(orders.map(o=>o.email)).size;
  document.getElementById('statValue').textContent=orders.reduce((s,o)=>s+Number(o.value),0).toLocaleString('pt-PT')+'€';

  document.getElementById('recentOrders').innerHTML=orders.slice(-4).reverse().map(o=>`
    <div class="order-row">
      <div><h3>${o.id} · ${o.client}</h3><p>${o.company} · ${o.service} · ${o.value}€</p></div>
      ${badge(o.status)}
    </div>`).join('');

  const states=Object.keys(statusColors);
  const max=Math.max(1,...states.map(s=>orders.filter(o=>o.status===s).length));
  document.getElementById('statusSummary').innerHTML=states.map(s=>{
    const count=orders.filter(o=>o.status===s).length;
    return `<div class="summary-row"><span>${s}</span><div class="bar"><i style="width:${count/max*100}%"></i></div><strong>${count}</strong></div>`;
  }).join('');
}

function renderOrders(){
  const query=document.getElementById('orderSearch').value.toLowerCase();
  const filter=document.getElementById('statusFilter').value;
  const filtered=orders.filter(o=>(!filter||o.status===filter)&&(`${o.id} ${o.client} ${o.company}`.toLowerCase().includes(query)));
  document.getElementById('ordersTable').innerHTML=filtered.map((o,index)=>`
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.client}<br><small>${o.company}</small></td>
      <td>${o.service}</td><td>${o.value}€</td><td>${badge(o.status)}</td>
      <td><button class="table-action" onclick="advanceStatus('${o.id}')">Avançar estado</button></td>
    </tr>`).join('') || '<tr><td colspan="6">Nenhum pedido encontrado.</td></tr>';
}

window.advanceStatus=function(id){
  const flow=['Novo','Em análise','Em produção','Entregue','Concluído'];
  const order=orders.find(o=>o.id===id);
  if(!order)return;
  order.status=flow[Math.min(flow.indexOf(order.status)+1,flow.length-1)];
  save();
};

function renderClients(){
  const map={};
  orders.forEach(o=>{if(!map[o.email])map[o.email]={...o,count:0,total:0};map[o.email].count++;map[o.email].total+=Number(o.value)});
  document.getElementById('clientsGrid').innerHTML=Object.values(map).map(c=>`
    <article class="client-card"><h3>${c.client}</h3><p>${c.company}</p><p>${c.email}</p><p><strong>${c.count}</strong> pedido(s) · <strong>${c.total}€</strong></p></article>`).join('');
}

function renderAll(){renderDashboard();renderOrders();renderClients()}
document.getElementById('orderSearch').addEventListener('input',renderOrders);
document.getElementById('statusFilter').addEventListener('change',renderOrders);

const dialog=document.getElementById('orderDialog');
document.getElementById('newOrderButton').addEventListener('click',()=>dialog.showModal());
document.getElementById('orderForm').addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.target);
  const next=String(orders.length+1).padStart(4,'0');
  orders.push({
    id:`AO-2026-${next}`,
    client:data.get('client'),
    company:data.get('company'),
    email:data.get('email'),
    service:data.get('service'),
    value:Number(data.get('value')),
    status:data.get('status')
  });
  event.target.reset();
  dialog.close();
  save();
});

renderAll();
