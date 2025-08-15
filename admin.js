// Guard-Only-Admin
(function guard() {
  const rol = sessionStorage.getItem('rol');
  const usuario = sessionStorage.getItem('usuario');
  if (!rol || !usuario || rol !== 'Admin') {
    window.location.href = 'login.html';
  }
  const adminUser = document.getElementById('admin-user');
  if (adminUser) adminUser.textContent = `${usuario} (Admin)`;
})();

function logout() {
  try { sessionStorage.clear(); } finally { window.location.href = 'login.html'; }
}

// Helpers de almacenamiento
function getUsers() {
  const raw = localStorage.getItem('users');
  if (raw) return JSON.parse(raw);
  // Seed inicial si no hay usuarios
  const seed = [{ email: 'admin@valetpro.test', pass: 'admin', role: 'Admin' }];
  localStorage.setItem('users', JSON.stringify(seed));
  return seed;
}
function setUsers(list) { localStorage.setItem('users', JSON.stringify(list)); }

const rolesValidos = ['Cajero', 'Jockey', 'Loaners', 'Transportación', 'Admin'];

// Render listado
function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const users = getUsers();
  tbody.innerHTML = '';
  users.forEach((u, idx) => {
    const tr = document.createElement('tr');

    const roleSelect = `
      <select data-idx="${idx}" class="role-select">
        ${rolesValidos.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
    `;

    tr.innerHTML = `
      <td>${u.email}</td>
      <td>${roleSelect}</td>
      <td class="right row-actions">
        <button data-idx="${idx}" class="reset">Reset Pass</button>
        ${u.role === 'Admin' && u.email === 'admin@valetpro.test'
          ? '' // proteger admin seed
          : `<button data-idx="${idx}" class="delete">Eliminar</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const idx = +this.dataset.idx;
      const users = getUsers();
      users[idx].role = this.value;
      setUsers(users);
      renderUsers();
    });
  });

  document.querySelectorAll('.reset').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = +this.dataset.idx;
      const nueva = prompt('Nueva contraseña temporal:');
      if (!nueva) return;
      const users = getUsers();
      users[idx].pass = nueva;
      setUsers(users);
      alert('Contraseña actualizada.');
    });
  });

  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = +this.dataset.idx;
      if (!confirm('¿Eliminar este usuario?')) return;
      const users = getUsers();
      users.splice(idx, 1);
      setUsers(users);
      renderUsers();
    });
  });
}

// Crear usuario
document.getElementById('create-user-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('new-email').value.trim().toLowerCase();
  const pass  = document.getElementById('new-pass').value;
  const role  = document.getElementById('new-role').value;

  if (!email || !pass || !rolesValidos.includes(role)) return;

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    alert('Ese email ya existe.');
    return;
  }
  users.push({ email, pass, role });
  setUsers(users);
  this.reset();
  renderUsers();
});

renderUsers();
