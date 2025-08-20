
// login.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const msg = document.getElementById('login-msg');

  function showMsg(text) {
    if (!msg) return alert(text);
    msg.textContent = text;
    msg.style.display = 'block';
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.style.display = 'none';

    const email = document.querySelector('#email')?.value.trim();
    const password = document.querySelector('#password')?.value;

    try {
      // 1) Login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user.id;

      // 2) Buscar rol desde relaciones
      const { data: user_roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .single();

      if (rolesError || !user_roles) {
        throw new Error('Tu cuenta no tiene un rol asignado.');
      }

      const roleId = user_roles.role_id;

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single();

      if (roleError || !role?.name) {
        throw new Error('No se pudo identificar tu rol. Contacta a un administrador.');
      }

      // 3) Guardar rol en minúsculas y redirigir
      sessionStorage.setItem('usuario', email);
      sessionStorage.setItem('rol', role.name.toLowerCase());
      window.location.href = 'index.html';
    } catch (err) {
      showMsg(`Error: ${err.message}`);
      console.error(err);
    }
  });
});
