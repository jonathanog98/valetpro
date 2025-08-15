function canUseSession() {
  try { sessionStorage.setItem('_t','1'); sessionStorage.removeItem('_t'); return true; } catch(e) { return false; }
}
const sess = canUseSession() ? sessionStorage : localStorage;

(function ensureSeedAdmin() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  if (!users.some(u => u.email === 'admin@valetpro.test')) {
    users.push({ name: 'Administrador', email: 'admin@valetpro.test', pass: 'admin', role: 'Admin' });
    localStorage.setItem('users', JSON.stringify(users));
  }
})();

function getUsers() {
  const raw = localStorage.getItem('users');
  return raw ? JSON.parse(raw) : [];
}

document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;
  const users = getUsers();
  const match = users.find(u => u.email === email && u.pass === pass);
  if (match) {
    sess.setItem('usuario', match.email);
    sess.setItem('nombre', match.name || '');
    sess.setItem('rol', match.role);
    window.location.href = 'index.html';
  } else {
    const msg = document.getElementById('error-msg');
    if (msg) msg.style.display = 'block';
  }
});

['email','password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    const msg = document.getElementById('error-msg');
    if (msg) msg.style.display = 'none';
  });
});
