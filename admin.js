// ===== Guard (solo Admin) con fallback de sesión =====
function canUseSession() {
  try { sessionStorage.setItem('_t','1'); sessionStorage.removeItem('_t'); return true; } catch(e) { return false; }
}
const sess = canUseSession() ? sessionStorage : localStorage;

(function guard() {
  const rol = sess.getItem('rol');
  const usuario = sess.getItem('usuario');
  const nombre = sess.getItem('nombre');
  if (!rol || !usuario || rol !== 'Admin') {
    window.location.href = new URL('login.html', window.location.href).href;
  }
  const adminUser = document.getElementById('admin-user');
  if (adminUser) adminUser.textContent = `${nombre || usuario} (Admin)`;
})();

function logout() {
  try {
    sessionStorage.clear();
    localStorage.removeItem('usuario'); localStorage.removeItem('rol'); localStorage.removeItem('nombre');
  } finally {
    window.location.href = new URL('login.html', window.location.href).href;
  }
}

// ===== Almacenamiento de usuarios =====
function getUsers() {
  const raw = localStorage.getItem('users');
  if (raw) return JSON.parse(raw);
  const seed = [{ name: 'Administrador', email: 'admin@valetpro.test', pass: 'admin', role: 'Admin' }];
  localStorage.setItem('users', JSON.stringify(seed));
  return seed;
}
function setUsers(list) { localStorage.setItem('users', JSON.stringify(list)); }
const rolesValidos = ['Cajero', 'Jockey', 'Loaners', 'Transportación', 'Admin'];

// ===== Render listado =====
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
      <td>${u.name || '(Sin nombre)'}</td>
      <td>${u.email}</td>
      <td>${roleSelect}</td>
      <td class="right row-actions">
        <button data-idx="${idx}" class="rename">Renombrar</button>
        <button data-idx="${idx}" class="reset">Reset Pass</button>
        ${u.role === 'Admin' && u.email === 'admin@valetpro.test' ? '' : `<button data-idx="${idx}" class="delete">Eliminar</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', function() {
      const idx = +this.dataset.idx;
      const users = getUsers();
      users[idx].role = this.value;
      setUsers(users); renderUsers();
    });
  });

  document.querySelectorAll('.rename').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = +this.dataset.idx;
      const users = getUsers();
      const nuevo = prompt('Nuevo nombre para el usuario:', users[idx].name || '');
      if (nuevo !== null && nuevo.trim() !== '') {
        users[idx].name = nuevo.trim();
        setUsers(users); renderUsers();
      }
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
      setUsers(users); renderUsers();
    });
  });
}

// ===== Crear usuario =====
document.getElementById('create-user-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name  = document.getElementById('new-name').value.trim();
  const email = document.getElementById('new-email').value.trim().toLowerCase();
  const pass  = document.getElementById('new-pass').value;
  const role  = document.getElementById('new-role').value;

  if (!name || !email || !pass || !rolesValidos.includes(role)) return;

  const users = getUsers();
  if (users.some(u => u.email === email)) { alert('Ese email ya existe.'); return; }

  users.push({ name, email, pass, role });
  setUsers(users);
  this.reset(); renderUsers();
});

renderUsers();
