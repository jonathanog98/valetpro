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


const form = document.getElementById("create-user-form");
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("new-email")?.value?.trim();
  const password = document.getElementById("new-pass")?.value;
  const role = document.getElementById("new-role")?.value;

  if (!email || !password || !role) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    // Crear usuario en Supabase Auth
    const { data: signUpData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Registrar usuario en la tabla userlist
    const { error: insertError } = await supabase.from("userlist").insert([{ email, role_code: role }]);
    if (insertError) throw insertError;

    alert("Usuario creado exitosamente.");
    form.reset();
    await loadUsers();
  } catch (err) {
    console.error("Error creando usuario:", err);
    alert(`No se pudo crear el usuario: ${err?.message || err}`);
  }
});
