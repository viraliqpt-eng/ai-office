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

document.getElementById('forgotPassword').addEventListener('click', () => {
  alert('Na versão real, será enviado um email seguro para redefinir a palavra-passe.');
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const valid = email.value.trim().toLowerCase() === 'cliente@aioffice.pt' &&
                password.value === 'demo2026';

  if (!valid) {
    error.style.display = 'block';
    return;
  }

  error.style.display = 'none';
  sessionStorage.setItem('aiOfficeDemoAuthenticated', 'true');

  if (remember.checked) {
    localStorage.setItem('aiOfficeRememberedEmail', email.value.trim());
  } else {
    localStorage.removeItem('aiOfficeRememberedEmail');
  }

  window.location.href = 'cliente.html';
});
