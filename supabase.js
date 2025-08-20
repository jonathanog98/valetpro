import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://sqllpksunzuyzkzgmhuo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI2MjM2NCwiZXhwIjoyMDcwODM4MzY0fQ.xvTuFENnE23q-kXtv-Cpc0BqlmEO-3p5auK6LCuTqvs'  // ⚠️ Reemplaza esto manualmente SOLO para desarrollo privado
export const supabase = createClient(supabaseUrl, supabaseKey)