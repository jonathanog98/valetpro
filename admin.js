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
  const { data, error } = await supabase.from('userlist').select('email, role_id').order('email');
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
      <td>${user.role_id || 'Sin rol'}</td>
    `;
    table.appendChild(row);
  }
}

async function loadRoles() {
  const select = document.getElementById("new-role");
  const { data: roles, error } = await supabase.from("roles").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Error cargando roles:", error);
    alert("No se pudieron cargar los roles.");
    return;
  }
  for (const role of roles) {
    const opt = document.createElement("option");
    opt.value = role.id;
    opt.textContent = role.name;
    select.appendChild(opt);
  }
}

document.getElementById("create-user-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("new-email")?.value?.trim();
  const password = document.getElementById("new-pass")?.value;
  const role_id = parseInt(document.getElementById("new-role")?.value);

  if (!email || !password || !role_id) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    // Este paso requiere una función segura en el backend. Aquí se omite la creación Auth.
    const { error: insertError } = await supabase.from("userlist").insert([{ email, role_id }]);
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
