import { supabase } from './supabase.js';

const ROLES = ['Admin', 'Cajero', 'Jockey', 'Transportación', 'Loaners'];

async function verifyAdminAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect();

  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error || user?.role !== 'Admin') return redirect();
}

function redirect() {
  supabase.auth.signOut().then(() => {
    sessionStorage.clear();
    window.location.replace('login.html');
  });
}

async function loadUsers() {
  const { data, error } = await supabase.from('users').select('email, role').order('email');
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
      <td>${user.role}</td>
    `;
    table.appendChild(row);
  }
}

async function loadRoles() {
  const select = document.getElementById("new-role");
  for (const role of ROLES) {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = role;
    select.appendChild(opt);
  }
}

document.getElementById("create-user-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("new-email")?.value?.trim();
  const password = document.getElementById("new-pass")?.value;
  const role = document.getElementById("new-role")?.value;

  if (!email || !password || !role) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
    });

    if (signUpError) throw signUpError;

    const user_id = signUpData.user.id;

    const { error: insertError } = await supabase.from("users").insert([
      { id: user_id, email, full_name: email, role }
    ]);
    if (insertError) throw insertError;

    alert("Usuario creado exitosamente.");
    e.target.reset();
    await loadUsers();
  } catch (err) {
    console.error("Error creando usuario:", err);
    alert(`No se pudo crear el usuario: ${err?.message || err}`);
  }
});

async function main() {
  await verifyAdminAccess();
  await loadRoles();
  await loadUsers();
}

main();