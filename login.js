
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

      // 2) Buscar rol
      const userId = data.user.id;

      const { data: user_roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;
      if (!user_roles || user_roles.length === 0) {
        throw new Error('No se encontró rol asignado para este usuario.');
      }

      const roleId = user_roles[0].role_id;

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      // 3) Guardar en sessionStorage
      sessionStorage.setItem('usuario', email);
      sessionStorage.setItem('rol', role.name);

      // 4) Redirigir
      window.location.href = 'index.html';
    } catch (err) {
      showMsg(`Error: ${err.message}`);
      console.error(err);
    }
  });
});
