
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

    const userId = data.user.id;

    const { data: user_roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);

    if (rolesError) {
      alert("Error al obtener roles: " + rolesError.message);
      return;
    }

    if (user_roles.length === 0) {
      alert("No se encontró rol asignado.");
      return;
    }

    const roleId = user_roles[0].role_id;

    const { data: role, error: roleNameError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", roleId)
      .single();

    if (roleNameError) {
      alert("Error al obtener el nombre del rol: " + roleNameError.message);
      return;
    }

    const roleName = role.name;

    sessionStorage.setItem("usuario", email);
    sessionStorage.setItem("rol", roleName);

    // ✅ Redirigir siempre a index.html
    window.location.href = "index.html";
  });
});
