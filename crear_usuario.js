import { createClient } from '@supabase/supabase-js';

// 🔐 Configura tus credenciales
const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI2MjM2NCwiZXhwIjoyMDcwODM4MzY0fQ.xvTuFENnE23q-kXtv-Cpc0BqlmEO-3p5auK6LCuTqvs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 📩 Cambia estos valores para cada nuevo usuario
const email = 'jangueandopuertorico@gmail.com';
const password = '5678';
const role_id = 2;

const crearUsuarioConRol = async () => {
  // 1. Crear usuario en Supabase Auth
  const { data: user, error: error1 } = await supabase.auth.admin.createUser({
    email,
    password,
  });

  if (error1) {
    console.error('🚫 Error al crear usuario:', error1.message);
    return;
  }

  const user_id = user.user.id;

  // 2. Insertar en userlist
  const { error: error2 } = await supabase.from('userlist').insert({
    id: user_id,
    email,
    role_id,
  });

  if (error2) {
    console.error('🚫 Error insertando en userlist:', error2.message);
    return;
  }

  // 3. Insertar en user_roles
  const { error: error3 } = await supabase.from('user_roles').insert({
    user_id,
    role_id,
  });

  if (error3) {
    console.error('🚫 Error insertando en user_roles:', error3.message);
    return;
  }

  console.log(`✅ Usuario ${email} creado con rol ${role_id} exitosamente.`);
};

crearUsuarioConRol();
