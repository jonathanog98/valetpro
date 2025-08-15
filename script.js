import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm'

const supabase = createClient(
  'https://hiaeuuieafihkjbichlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWV1dWllYWZpaGtqYmljaGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDg3MDUsImV4cCI6MjA3MDY4NDcwNX0.uUnyclcK-THabxwqQ-eLSoZ8ehOrVMBoyETJZ-Dkbjo'
);

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return (window.location.href = 'login.html');

  const { data: roles } = await supabase.from('current_user_roles').select('role_code');
  const rol = roles?.[0]?.role_code;

  if (!rol) {
    alert('No se encontró rol para el usuario.');
    return (window.location.href = 'login.html');
  }

  document.getElementById('rol-label').textContent = rol;

  // Mostrar u ocultar elementos según el rol
  document.querySelectorAll('[data-role]').forEach(el => {
    if (el.dataset.role.split(',').includes(rol)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
})();

document.getElementById('logout-btn')?.addEventListener('click', () => {
  supabase.auth.signOut().then(() => (window.location.href = 'login.html'));
});