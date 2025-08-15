import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const supabase = createClient(
  'https://hiaeuuieafihkjbichlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWV1dWllYWZpaGtqYmljaGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDg3MDUsImV4cCI6MjA3MDY4NDcwNX0.uUnyclcK-THabxwqQ-eLSoZ8ehOrVMBoyETJZ-Dkbjo'
);

document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (error) {
    const msg = document.getElementById('error-msg');
    if (msg) msg.style.display = 'block';
    return;
  }

  // Obtener el rol desde la tabla personalizada
  const { data: roles, error: roleErr } = await supabase.from('current_user_roles').select('role_code').limit(1);
  const rol = roles?.[0]?.role_code;

  if (!rol || roleErr) {
    alert('No se pudo obtener el rol del usuario.');
    await supabase.auth.signOut();
    return;
  }

  sessionStorage.setItem('usuario', email);
  sessionStorage.setItem('rol', rol);

  window.location.href = 'index.html';
});

// Ocultar mensaje de error al escribir nuevamente
['email','password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    const msg = document.getElementById('error-msg');
    if (msg) msg.style.display = 'none';
  });
});
