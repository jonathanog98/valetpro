import { supabase } from './supabase.js';

async function verifyAdminAccess() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) return redirect();

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', session.user.id);

  const roleName = roleData?.[0]?.roles?.name;

  if (roleError || roleName !== 'Admin') return redirect();
}

function redirect() {
  supabase.auth.signOut().then(() => {
    sessionStorage.clear();
    window.location.replace('login.html');
  });
}

async function loadUsers() {
  const { data, error } = await supabase.from('users').select('email').order('email');
  const table = document.getElementById('table');
  table.innerHTML = '';

  if (error) {
    console.error(error);
    alert('Error al cargar los usuarios.');
    return;
  }

  for (const user of data) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    const roleName = roleData?.roles?.name ?? '(sin rol)';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.email}</td>
      <td>${roleName}</td>
    `;
    table.appendChild(row);
  }
}

async function loadRoles() {
  const select = document.getElementById("new-role");
  select.innerHTML = '<option value="">Seleccione un rol</option>';

  const { data: roles, error } = await supabase
    .from("roles")
    .select("name")
    .order("name");

  if (error) {
    console.error("Error al cargar roles:", error);
    alert("Error al cargar la lista de roles.");
    return;
  }

  for (const role of roles) {
    const opt = document.createElement("option");
    opt.value = role.name;
    opt.textContent = role.name;
    select.appendChild(opt);
  }
}

document.getElementById("create-user-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("new-email")?.value?.trim();
  const password = document.getElementById("new-pass")?.value;
  const roleName = document.getElementById("new-role")?.value;

  if (!email || !password || !roleName) {
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

    const { error: userError } = await supabase.from("users").insert([
      { id: user_id, email, full_name: email }
    ]);
    if (userError) throw userError;

    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (!role) throw new Error(`No se encontró el rol: ${roleName}`);

    const { error: userRoleError } = await supabase
      .from("user_roles")
      .insert([{ user_id, role_id: role.id }]);

    if (userRoleError) throw userRoleError;

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