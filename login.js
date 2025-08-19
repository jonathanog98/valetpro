// login.js — Supabase SDK v2 (ESM) + Forgot Password
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm'

// Project credentials
const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// DOM helpers
const $ = (id) => document.getElementById(id)
const form = $('login-form')
const emailEl = $('email')
const passEl = $('password')
const btn = $('login-btn') || $('loginBtn') || document.querySelector('button[type="submit"]')
const msgBox = $('login-msg') || $('error-msg')
const forgot = $('forgot-link')

function setMsg(text, type = 'err') {
  if (!msgBox) return console.log('[LOGIN]', text)
  msgBox.textContent = text
  msgBox.style.display = 'block'
  // opcional: estilos según tipo
  msgBox.classList.remove('ok', 'err')
  msgBox.classList.add(type === 'ok' ? 'ok' : 'err')
}
function clearMsg() { if (msgBox) msgBox.style.display = 'none' }

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearMsg()

  const email = (emailEl?.value || '').trim()
  const password = passEl?.value || ''

  if (!email || !password) {
    setMsg('Escribe correo y contraseña.')
    return
  }

  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Ingresando…' }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMsg(error.message || 'No se pudo iniciar sesión.')
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
      return
    }

    if (!data?.session) {
      setMsg('No se obtuvo sesión. Verifica el correo o la contraseña.')
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
      return
    }

    // Obtener usuario
    const { data: userResp } = await supabase.auth.getUser()
    const user = userResp?.user
    if (!user) {
      setMsg('No se pudo obtener el usuario autenticado.')
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
      return
    }

    // Buscar rol desde user_roles → roles(name)
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    if (rolesError) {
      setMsg('No se pudo consultar el rol del usuario.')
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
      return
    }

    const roleName = roles?.[0]?.roles?.name
    if (!roleName) {
      setMsg('Tu usuario no tiene rol asignado. Contacta al administrador.')
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
      return
    }

    // Persistir para index.html (usa sessionStorage)
    try {
      sessionStorage.setItem('usuario', user.email || email)
      sessionStorage.setItem('rol', roleName)
    } catch {}

    // Redirección según rol
    window.location.href = new URL(roleName === 'Admin' ? 'admin.html' : 'index.html', window.location.href).href
  } catch (err) {
    setMsg(err?.message || String(err))
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
  }
})

// Forgot password: envía email con redirect a tu página update-password.html
forgot?.addEventListener('click', async (e) => {
  e.preventDefault()
  clearMsg()

  const email = (emailEl?.value || '').trim()
  if (!email) {
    setMsg('Escribe tu correo en el campo y vuelve a tocar "Recuperar contraseña".')
    return
  }
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…' }
    const redirectTo = 'https://valetpro-ag.com/update-password.html'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
    setMsg('Te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada.', 'ok')
  } catch (err) {
    setMsg('No se pudo enviar el email de recuperación: ' + (err?.message || String(err)))
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar' }
  }
})
