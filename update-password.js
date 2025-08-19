// update-password.js — Supabase v2 (ESM) password recovery handler
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm'

// === Your project (provided by you) ===
const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $ = (id) => document.getElementById(id)
const form = $('reset-form')
const btn  = $('btn')
const msg  = $('msg')
const pwd1 = $('pwd')
const pwd2 = $('pwd2')

function show(text, type = '') {
  msg.className = 'msg ' + (type ? (type === 'ok' ? 'ok' : 'err') : '')
  msg.textContent = text
}

function parseParams() {
  // Supabase envía tokens en el hash (#) por defecto: #access_token=...&refresh_token=...&type=recovery
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)

  const access_token  = hash.get('access_token')  || search.get('access_token')
  const refresh_token = hash.get('refresh_token') || search.get('refresh_token')
  const type = hash.get('type') || search.get('type')
  return { access_token, refresh_token, type }
}

async function ensureSessionFromRecovery() {
  const { access_token, refresh_token, type } = parseParams()
  if (type !== 'recovery' || !access_token || !refresh_token) {
    show('El enlace de recuperación no es válido o expiró. Solicita uno nuevo desde la pantalla de login.')
    throw new Error('Missing or invalid recovery tokens')
  }
  // Establece la sesión temporal con los tokens recibidos
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) throw error
  return data
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  show('Procesando…')
  btn.disabled = true

  try {
    if (pwd1.value !== pwd2.value) {
      show('Las contraseñas no coinciden.')
      btn.disabled = false
      return
    }
    if (pwd1.value.length < 8) {
      show('La contraseña debe tener al menos 8 caracteres.')
      btn.disabled = false
      return
    }

    await ensureSessionFromRecovery()

    // Con la sesión activa por el link de recuperación, ahora sí cambiamos la contraseña
    const { data, error } = await supabase.auth.updateUser({ password: pwd1.value })
    if (error) throw error

    show('Contraseña actualizada correctamente. Ya puedes iniciar sesión.', 'ok')
    // Limpia el hash para mayor seguridad
    history.replaceState(null, '', window.location.pathname)
  } catch (err) {
    console.error(err)
    show('No se pudo actualizar la contraseña: ' + (err?.message || String(err)), 'err')
  } finally {
    btn.disabled = false
  }
})

// Mensaje útil si llega sin tokens
window.addEventListener('DOMContentLoaded', () => {
  const { access_token, refresh_token, type } = parseParams()
  if (!access_token || !refresh_token || type !== 'recovery') {
    show('Abre este enlace solo desde el email de recuperación.')
  }
})
