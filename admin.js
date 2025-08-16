import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://sqllpksunzuyzkzgmhuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A'
);

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