import { supabase } from './supabase.js';
async function verifyAdminAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect();

  const { data: roleData, error } = await supabase
    .from('current_user_roles')
    .select('role_code')
    .single();

  if (error || roleData?.role_code !== 'Admin') return redirect();
}

function redirect() {
  supabase.auth.signOut().then(() => {
    sessionStorage.clear();
    window.location.replace('login.html');
  });
}

async function loadUsers() {
  const { data, error } = await supabase.from('userlist').select('*');
  const table = document.getElementById('table');
  table.innerHTML = '';

  if (error) {
    console.error(error);
    alert('Error al cargar los usuarios.');
    return;
  }

  for (const user of data) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.email}</td>
      <td>${user.role_code}</td>
    `;
    table.appendChild(row);
  }
}

async function main() {
  await verifyAdminAccess();
  await loadUsers();
}

main();