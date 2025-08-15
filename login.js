
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://hiaeuuieafihkjbichlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYWV1dWllYWZpaGtqYmljaGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDg3MDUsImV4cCI6MjA3MDY4NDcwNX0.o5I8ebBMKsnHFCtGzL7AulWmLaV6RJj6I1qFxyU8ymc'
);

document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('error-msg').style.display = 'block';
    return;
  }

  // Redirigir si el login fue exitoso
  window.location.href = 'index.html';
});
