// login.js — Supabase SDK v2 (ESM)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm'

// Project credentials (from user)
const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// DOM helpers
const $ = (id) => document.getElementById(id)
const form = $('login-form')
const emailEl = $('email')
const passEl = $('password')
const btn = $('login-btn')
const errBox = $('error-msg')

function showError(msg) {
  if (errBox) {
    errBox.textContent = msg || 'Error de autenticación.'
    errBox.style.display = 'block'
  }
  console.error('[LOGIN]', msg)
}

function clearError() {
  if (errBox) errBox.style.display = 'none'
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearError()

  const email = (emailEl?.value || '').trim()
  const password = passEl?.value || ''

  if (!email || !password) {
    showError('Escribe correo y contraseña.')
    return
  }

  try {
    btn.disabled = true
    btn.textContent = 'Ingresando…'

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showError(error.message || 'No se pudo iniciar sesión.')
      btn.disabled = false
      btn.textContent = 'Ingresar'
      return
    }

    if (!data?.session) {
      showError('No se obtuvo sesión. Verifica el correo o la contraseña.')
      btn.disabled = false
      btn.textContent = 'Ingresar'
      return
    }

    // Obtener usuario
    const { data: userResp } = await supabase.auth.getUser()
    const user = userResp?.user
    if (!user) {
      showError('No se pudo obtener el usuario autenticado.')
      btn.disabled = false
      btn.textContent = 'Ingresar'
      return
    }

    // Buscar rol desde user_roles → roles(name)
    // Requiere FK user_roles.role_id → roles.id
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    if (rolesError) {
      showError('No se pudo consultar el rol del usuario.')
      btn.disabled = false
      btn.textContent = 'Ingresar'
      return
    }

    const roleName = roles?.[0]?.roles?.name
    if (!roleName) {
      showError('Tu usuario no tiene rol asignado. Contacta al administrador.')
      btn.disabled = false
      btn.textContent = 'Ingresar'
      return
    }

    // Persistir para index.html (usa sessionStorage)
    try {
      sessionStorage.setItem('usuario', user.email || email)
      sessionStorage.setItem('rol', roleName)
    } catch {}

    // Redirección según rol
    if (roleName === 'Admin') {
      window.location.href = new URL('admin.html', window.location.href).href
    } else {
      window.location.href = new URL('index.html', window.location.href).href
    }
  } catch (err) {
    showError(err?.message || String(err))
    btn.disabled = false
    btn.textContent = 'Ingresar'
  }
})
