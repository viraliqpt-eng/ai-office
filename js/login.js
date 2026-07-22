const form = document.getElementById('loginForm');
const email = document.getElementById('email');
const password = document.getElementById('password');
const error = document.getElementById('loginError');
const remember = document.getElementById('remember');

const savedEmail = localStorage.getItem('aiOfficeRememberedEmail');
if (savedEmail) {
  email.value = savedEmail;
  remember.checked = true;
}

document.getElementById('togglePassword').addEventListener('click', event => {
  const hidden = password.type === 'password';
  password.type = hidden ? 'text' : 'password';
  event.target.textContent = hidden ? 'Ocultar' : 'Mostrar';
});

document.getElementById('forgotPassword').addEventListener('click', async () => {
  if (!aiOfficeSupabase) {
    alert('No modo demonstração, a recuperação de palavra-passe está desativada.');
    return;
  }

  const address = email.value.trim();
  if (!address) {
    alert('Indique primeiro o seu email.');
    return;
  }

  const { error: resetError } = await aiOfficeSupabase.auth.resetPasswordForEmail(address, {
    redirectTo: window.location.origin + '/nova-palavra-passe.html'
  });

  alert(resetError ? resetError.message : 'Email de recuperação enviado.');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.style.display = 'none';

  try {
    await aiOfficeLogin(email.value.trim(), password.value);

    if (remember.checked) {
      localStorage.setItem('aiOfficeRememberedEmail', email.value.trim());
    } else {
      localStorage.removeItem('aiOfficeRememberedEmail');
    }

    window.location.href = 'cliente.html';
  } catch (loginError) {
    error.textContent = loginError.message || 'Não foi possível iniciar sessão.';
    error.style.display = 'block';
  }
});
