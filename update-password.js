// update-password.js — robust recovery handler for Supabase v2
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm'

const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $ = (id) => document.getElementById(id)
const msg = $('msg')
const btn = $('btn')
const form = $('reset-form')
const hashError = $('hash-error')

function show(el, text, type='err') {
  el.classList.remove('hidden')
  el.className = 'msg ' + (type === 'ok' ? 'ok' : 'err')
  el.textContent = text
}

function parseHash() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  const type = hash.get('type') || search.get('type')
  const access_token = hash.get('access_token') || search.get('access_token')
  const refresh_token = hash.get('refresh_token') || search.get('refresh_token')
  const error = hash.get('error') || search.get('error')
  const error_code = hash.get('error_code') || search.get('error_code')
  const error_description = hash.get('error_description') || search.get('error_description')
  return { type, access_token, refresh_token, error, error_code, error_description }
}

async function ensureRecoverySession() {
  const { type, access_token, refresh_token, error, error_code, error_description } = parseHash()

  if (error) {
    show(hashError, `${error_description || error} (${error_code || 'error'})`)
    throw new Error(error_description || error)
  }

  if (type !== 'recovery') {
    show(hashError, 'El enlace de recuperación no es válido. Solicita un nuevo enlace desde la pantalla de login.')
    throw new Error('Invalid type')
  }
  if (!access_token || !refresh_token) {
    show(hashError, 'Faltan tokens de recuperación en la URL. Vuelve a solicitar el enlace.')
    throw new Error('Missing tokens')
  }
  const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
  if (setErr) {
    show(hashError, 'No fue posible activar la sesión de recuperación: ' + setErr.message)
    throw setErr
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  msg.textContent = ''
  hashError.classList.add('hidden')

  const pwd1 = document.getElementById('pwd').value
  const pwd2 = document.getElementById('pwd2').value
  if (pwd1 !== pwd2) {
    show(msg, 'Las contraseñas no coinciden.')
    return
  }
  if (pwd1.length < 8) {
    show(msg, 'La contraseña debe tener al menos 8 caracteres.')
    return
  }

  try {
    btn.disabled = true
    btn.textContent = 'Procesando…'

    await ensureRecoverySession()

    const { error } = await supabase.auth.updateUser({ password: pwd1 })
    if (error) throw error

    show(msg, 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.', 'ok')
    // Limpia los tokens del hash por seguridad
    history.replaceState(null, '', window.location.pathname)
  } catch (err) {
    show(msg, 'No se pudo actualizar la contraseña: ' + (err?.message || String(err)))
  } finally {
    btn.disabled = false
    btn.textContent = 'Actualizar contraseña'
  }
})

// Al cargar, si ya viene un error en el hash, muéstralo
window.addEventListener('DOMContentLoaded', () => {
  const { error, error_code, error_description } = parseHash()
  if (error) {
    show(hashError, `${error_description || error} (${error_code || 'error'})`)
  }
})
