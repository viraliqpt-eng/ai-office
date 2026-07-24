const demoAdminData={
 clients:[
  {id:'c1',full_name:'João Silva',company_name:'Silva Imobiliária, Lda.',email:'joao@example.com'},
  {id:'c2',full_name:'Marta Costa',company_name:'Clínica Horizonte',email:'marta@example.com'},
  {id:'c3',full_name:'Ana Ferreira',company_name:'Ferreira & Associados',email:'ana@example.com'}],
 orders:[
  {id:'o1',order_number:'AO-2026-0001',client_id:'c1',service_name:'Business',status:'Novo',progress:10,value_eur:399},
  {id:'o2',order_number:'AO-2026-0002',client_id:'c2',service_name:'Complete',status:'Em análise',progress:30,value_eur:699},
  {id:'o3',order_number:'AO-2026-0003',client_id:'c3',service_name:'Starter',status:'Em produção',progress:70,value_eur:199}],
 messages:[{id:'m1',client_id:'c1',body:'Gostaria de incluir respostas para proprietários.',is_read:false,created_at:new Date().toISOString()}]
};
function demoLoad(){return JSON.parse(localStorage.getItem('aiOfficeAdminData')||'null')||demoAdminData}
function demoSave(d){localStorage.setItem('aiOfficeAdminData',JSON.stringify(d))}
async function adminFetchData(){
 if(!aiOfficeSupabase)return demoLoad();
 const [c,o,m]=await Promise.all([
  aiOfficeSupabase.from('profiles').select('*').eq('role','client').order('created_at',{ascending:false}),
  aiOfficeSupabase.from('orders').select('*').order('created_at',{ascending:false}),
  aiOfficeSupabase.from('messages').select('*').order('created_at',{ascending:false})]);
 if(c.error)throw c.error;if(o.error)throw o.error;if(m.error)throw m.error;
 return {clients:c.data,orders:o.data,messages:m.data};
}
async function adminCreateOrder(p){
 if(!aiOfficeSupabase){const d=demoLoad(),n=String(d.orders.length+1).padStart(4,'0'),o={id:crypto.randomUUID(),order_number:`AO-2026-${n}`,progress:10,...p};d.orders.unshift(o);demoSave(d);return o;}
 const r=await aiOfficeSupabase.from('orders').insert(p).select().single();if(r.error)throw r.error;return r.data;
}
async function adminUpdateOrder(id,changes){
 if(!aiOfficeSupabase){const d=demoLoad(),o=d.orders.find(x=>x.id===id);Object.assign(o,changes);demoSave(d);return o;}
 const r=await aiOfficeSupabase.from('orders').update(changes).eq('id',id).select().single();if(r.error)throw r.error;return r.data;
}
async function adminMarkMessageRead(id){
 if(!aiOfficeSupabase){const d=demoLoad(),m=d.messages.find(x=>x.id===id);if(m)m.is_read=true;demoSave(d);return;}
 const r=await aiOfficeSupabase.from('messages').update({is_read:true}).eq('id',id);if(r.error)throw r.error;
}