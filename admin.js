import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const supabase = createClient(
  'https://hiaeuuieafihkjbichlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWV1dWllYWZpaGtqYmljaGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDg3MDUsImV4cCI6MjA3MDY4NDcwNX0.uUnyclcK-THabxwqQ-eLSoZ8ehOrVMBoyETJZ-Dkbjo'
);

(async function guard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = 'login.html';

  const { data: roles } = await supabase.from('current_user_roles').select('role_code').limit(1);
  const rol = roles?.[0]?.role_code;
  const user = session.user?.email;

  if (!rol || rol !== 'Admin') {
    return window.location.href = 'login.html';
  }

  const adminUser = document.getElementById('admin-user');
  if (adminUser) adminUser.textContent = `${user} (Admin)`;
})();

async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error(error);
    alert('Error cargando usuarios.');
    return [];
  }
  return data;
}

async function setUserUpdate(id, updates) {
  const { error } = await supabase.from('users').update(updates).eq('id', id);
  if (error) alert('Error al actualizar usuario.');
}

async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) alert('Error al eliminar usuario.');
}

async function createUser(email, pass, role, name) {
  const { data, error } = await supabase.from('users').insert([{ email, pass, role, name }]);
  if (error) alert('Error al crear usuario.');
}

const rolesValidos = ['Cajero', 'Jockey', 'Loaners', 'Transportación', 'Admin'];

async function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const users = await getUsers();
  tbody.innerHTML = '';
  users.forEach((u, idx) => {
    const tr = document.createElement('tr');

    const roleSelect = `
      <select data-id="${u.id}" class="role-select">
        ${rolesValidos.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
    `;

    tr.innerHTML = `
      <td>${u.name || ''}</td>
      <td>${u.email}</td>
      <td>${roleSelect}</td>
      <td class="right row-actions">
        <button data-id="${u.id}" class="reset">Reset Pass</button>
        ${u.email === 'admin@valetpro.test' ? '' : `<button data-id="${u.id}" class="delete">Eliminar</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      await setUserUpdate(this.dataset.id, { role: this.value });
      renderUsers();
    });
  });

  document.querySelectorAll('.reset').forEach(btn => {
    btn.addEventListener('click', async function() {
      const nueva = prompt('Nueva contraseña temporal:');
      if (!nueva) return;
      await setUserUpdate(this.dataset.id, { pass: nueva });
      alert('Contraseña actualizada.');
    });
  });

  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('¿Eliminar este usuario?')) return;
      await deleteUser(this.dataset.id);
      renderUsers();
    });
  });
}

document.getElementById('create-user-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const email = document.getElementById('new-email').value.trim().toLowerCase();
  const pass = document.getElementById('new-pass').value;
  const role = document.getElementById('new-role').value;

  if (!email || !pass || !rolesValidos.includes(role)) return;

  await createUser(email, pass, role, name);
  this.reset();
  renderUsers();
});

renderUsers();
