const billingButtons = document.querySelectorAll('[data-billing]');
const plans = document.querySelectorAll('.plan');
const summaryPlan = document.getElementById('summaryPlan');
const summaryBilling = document.getElementById('summaryBilling');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryTotal = document.getElementById('summaryTotal');
const form = document.getElementById('checkoutForm');
const message = document.getElementById('checkoutMessage');
let selectedPlan = 'Business';
let billing = 'single';
let selectedPrice = 399;

function euro(value){return Number(value).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});}

function updatePrices(){
  plans.forEach(plan=>{
    const price = billing === 'single' ? plan.dataset.singlePrice : plan.dataset.monthlyPrice;
    plan.querySelector('.price strong').textContent = euro(price);
    plan.querySelector('.price span').textContent = billing === 'single' ? 'pagamento único' : 'por mês';
  });
  const selected = [...plans].find(p=>p.dataset.name===selectedPlan);
  selectedPrice = Number(billing === 'single' ? selected.dataset.singlePrice : selected.dataset.monthlyPrice);
  summaryBilling.textContent = billing === 'single' ? 'Serviço único' : 'Subscrição mensal';
  summarySubtotal.textContent = euro(selectedPrice);
  summaryTotal.textContent = euro(selectedPrice);
}

billingButtons.forEach(button=>button.addEventListener('click',()=>{
  billing = button.dataset.billing;
  billingButtons.forEach(item=>item.classList.toggle('active',item===button));
  updatePrices();
}));

document.querySelectorAll('.choose-plan').forEach(button=>button.addEventListener('click',()=>{
  const plan = button.closest('.plan');
  selectedPlan = plan.dataset.name;
  summaryPlan.textContent = selectedPlan;
  plans.forEach(item=>item.classList.toggle('selected',item===plan));
  updatePrices();
  document.getElementById('checkoutBox').scrollIntoView({behavior:'smooth'});
}));

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const priceId = window.AI_OFFICE_CONFIG?.STRIPE_PRICES?.[billing]?.[selectedPlan];

  if (!priceId) {
    message.style.display='block';
    message.textContent='O identificador Stripe deste plano não está configurado.';
    return;
  }

  const payload = {
    plan:selectedPlan,
    billing,
    priceId,
    amount:selectedPrice,
    currency:'eur',
    customer:Object.fromEntries(new FormData(form))
  };

  message.style.display='block';
  message.textContent='A preparar o pagamento...';

  try{
    const response = await fetch('/.netlify/functions/create-checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    if(!response.ok) throw new Error('O serviço de pagamento ainda não está configurado.');
    const data = await response.json();

    if(data.url){
      window.location.href=data.url;
      return;
    }

    throw new Error('Não foi recebida uma ligação de pagamento.');
  }catch(error){
    const orders = JSON.parse(localStorage.getItem('aiOfficePendingPayments')||'[]');
    orders.push({...payload,created_at:new Date().toISOString(),status:'A aguardar configuração Stripe'});
    localStorage.setItem('aiOfficePendingPayments',JSON.stringify(orders));
    message.textContent='Modo demonstração: pedido guardado. Configure o Stripe para aceitar pagamentos reais.';
  }
});

updatePrices();
