import { supabase } from './supabase.js';
// login.js
// Supabase config
const form = document.getElementById("login-form");
const btn = document.getElementById("login-btn");
const err = document.getElementById("error-msg");

  if (err) {
    err.style.display = "block";
  } else {
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Ingresando…";

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showError("Correo y contraseña son obligatorios.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
    return;
  }

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showError("Correo o contraseña incorrectos.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
    return;
  }

  const { data: roleData, error: roleError } = await supabase
    .from("current_user_roles")
    .select("role_code")
    .single();

  if (roleError || !roleData?.role_code) {
    showError("No se pudo obtener el rol del usuario.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
    return;
  }

  sessionStorage.setItem("rol", roleData.role_code);
  sessionStorage.setItem("usuario", email);

  window.location.href = "index.html";
});

["email", "password"].forEach((id) =>
  document.getElementById(id)?.addEventListener("input", () => {
    err.style.display = "none";
  })
);