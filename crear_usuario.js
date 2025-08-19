import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  "https://sqllpksunzuyzkzgmhuo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI2MjM2NCwiZXhwIjoyMDcwODM4MzY0fQ.xvTuFENnE23q-kXtv-Cpc0BqlmEO-3p5auK6LCuTqvs"   // Usa el service_role key, no el anon
)

async function crearUsuario() {
  // 1. Crear el usuario en auth
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: "jonathan.ortiz@autogermana.com",
    password: "Admin1234!",
    email_confirm: true
  })

  if (error) {
    console.error("❌ Error creando usuario:", error)
    return
  }
  console.log("✅ Usuario creado en auth:", user.user.id)

  // 2. Insertar en user_roles con rol Admin
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: user.user.id,
      role_id: 1   // 1 = Admin (según tu tabla roles)
    })

  if (roleError) {
    console.error("❌ Error asignando rol Admin:", roleError)
  } else {
    console.log("✅ Rol Admin asignado correctamente")
  }
}

crearUsuario()
