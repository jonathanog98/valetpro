
const supabase = supabase.createClient("https://vkrphvjhlnogvvdmhjnn.supabase.co", "public-anon-key");

document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn = document.getElementById("login-btn");

  btn.disabled = true;
  btn.textContent = "Ingresando...";

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

  if (loginError) {
    showError("Credenciales incorrectas.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
    return;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("email", email)
    .single();

  if (userError || !userData?.role) {
    showError("No se pudo obtener el rol del usuario.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
    return;
  }

  sessionStorage.setItem("rol", userData.role);

  if (userData.role === "Admin") {
    window.location.href = "admin.html";
  } else if (userData.role === "Cajero") {
    window.location.href = "index.html";
  } else {
    showError("Rol no autorizado.");
    btn.disabled = false;
    btn.textContent = "Ingresar";
  }
});

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}
