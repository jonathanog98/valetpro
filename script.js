import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const supabase = createClient(
  'https://hiaeuuieafihkjbichlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWV1dWllYWZpaGtqYmljaGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDg3MDUsImV4cCI6MjA3MDY4NDcwNX0.uUnyclcK-THabxwqQ-eLSoZ8ehOrVMBoyETJZ-Dkbjo'
);

document.addEventListener('DOMContentLoaded', async () => {
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

  // ✅ Ahora el botón Agregar funcionará correctamente
  const form = document.getElementById('pickup-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const data = {
        proposito: document.getElementById('proposito').value,
        vin: document.getElementById('vin').value.trim(),
        tag: document.getElementById('tag').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        color: document.getElementById('color').value.trim(),
        asesor: document.getElementById('asesor').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.from('pickups').insert([data]);

      if (error) {
        alert('Error al guardar pickup: ' + error.message);
      } else {
        alert('Pickup registrado correctamente.');
        this.reset();
      }
    });
  }
});

function logout() {
  supabase.auth.signOut().finally(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = 'login.html';
  });
}
