async function adminLogin(email,password){
 if(aiOfficeSupabase){
  const {data,error}=await aiOfficeSupabase.auth.signInWithPassword({email,password});
  if(error) throw error;
  const r=await aiOfficeSupabase.from('profiles').select('role').eq('id',data.user.id).single();
  if(r.error||r.data?.role!=='admin'){await aiOfficeSupabase.auth.signOut();throw new Error('Sem acesso administrativo.');}
  return;
 }
 if(window.AI_OFFICE_CONFIG.DEMO_MODE&&email.toLowerCase()==='admin@aioffice.pt'&&password==='admin2026'){
  sessionStorage.setItem('aiOfficeAdminDemoAuthenticated','true');return;
 }
 throw new Error('Credenciais administrativas inválidas.');
}
async function requireAdmin(){
 if(aiOfficeSupabase){
  const s=await aiOfficeSupabase.auth.getSession();
  if(!s.data.session){location.href='admin-login.html';return null;}
  const p=await aiOfficeSupabase.from('profiles').select('*').eq('id',s.data.session.user.id).single();
  if(p.error||p.data?.role!=='admin'){await aiOfficeSupabase.auth.signOut();location.href='admin-login.html';return null;}
  return p.data;
 }
 if(sessionStorage.getItem('aiOfficeAdminDemoAuthenticated')!=='true'){location.href='admin-login.html';return null;}
 return {full_name:'Pedro Figueiredo',role:'admin'};
}
async function adminLogout(){if(aiOfficeSupabase)await aiOfficeSupabase.auth.signOut();sessionStorage.removeItem('aiOfficeAdminDemoAuthenticated');location.href='admin-login.html';}
const f=document.getElementById('adminLoginForm');
if(f){const e=document.getElementById('adminEmail'),p=document.getElementById('adminPassword'),x=document.getElementById('adminLoginError');
document.getElementById('toggleAdminPassword').onclick=ev=>{const h=p.type==='password';p.type=h?'text':'password';ev.target.textContent=h?'Ocultar':'Mostrar';};
f.onsubmit=async ev=>{ev.preventDefault();x.style.display='none';try{await adminLogin(e.value.trim(),p.value);location.href='admin.html';}catch(err){x.textContent=err.message;x.style.display='block';}};}