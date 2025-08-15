
# ValetPro Web App

Aplicación web profesional para gestionar vehículos, clientes y usuarios con diferentes roles.

---

## ✅ Características

- Login seguro con Supabase (email + contraseña)
- Soporte para roles: Admin, Cajero, Jockey, Loaners, Transportación
- Panel de administración para gestionar usuarios
- Aplicación principal con formulario y vistas organizadas por tipo
- Estilo limpio, profesional y responsivo
- Compatible con escritorio y móvil

---

## 🧰 Tecnologías

- HTML + CSS + JavaScript
- Supabase (auth + base de datos)
- GitHub Pages (deploy)
- Compatible con Vercel / Netlify también

---

## 🚀 Cómo correr localmente

Requiere tener Python instalado.

```bash
# Clona el proyecto
git clone https://github.com/TU_USUARIO/valetpro.git
cd valetpro

# Inicia servidor local
python -m http.server 3000

# Abre en el navegador
http://localhost:3000/login.html
```

---

## 📦 Estructura del Proyecto

```
├── index.html
├── login.html
├── admin.html
├── script.js
├── login.js
├── admin.js
├── style.css
```

---

## 🌐 Deploy en GitHub Pages

1. Sube todos los archivos al branch `main` (o `gh-pages`)
2. Ve a Settings → Pages → Source → selecciona rama `main`, folder root `/`
3. Abre la URL generada: `https://tuusuario.github.io/valetpro`

---

## ✅ Supabase Setup (resumen)

- Tabla `users`: id, email, pass, role, name
- Vista `current_user_roles` para identificar rol del usuario autenticado
- Políticas de seguridad (RLS) activadas

> Ver archivo `docs/setup.sql` para la estructura completa

---

## 📱 Responsivo

El diseño está optimizado para usarse desde móviles sin necesidad de app nativa.
