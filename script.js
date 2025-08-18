
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

const userInfo = $("user-info");
const roleLabel = $("rol-label");
const adminBtn = $("admin-btn");
const logoutBtn = $("logout-btn");

// Mostrar nombre y rol
const rol = sessionStorage.getItem("rol");
const usuario = sessionStorage.getItem("usuario");

if (userInfo) userInfo.textContent = usuario || "";
if (roleLabel) roleLabel.textContent = rol || "";

// Botón de administración solo visible para Admin
if (rol === "Admin" && adminBtn) {
  adminBtn.style.display = "inline-block";
  adminBtn.onclick = () => location.href = "admin.html";
}

// Cerrar sesión
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    location.href = "login.html";
  };
}

// Cargar datos a tableros
async function cargarTableros() {
  if (!["Admin", "Cajero"].includes(rol)) return;

  const { data, error } = await supabase
    .from("pickups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar pickups:", error);
    return;
  }

  const tbodyById = (id) => document.querySelector(`#${id} tbody`);

  const waiter = tbodyById("tabla-waiter");
  const recogiendo = tbodyById("tabla-recogiendo");
  const loaner = tbodyById("tabla-loaner");
  const transporte = tbodyById("tabla-transporte");

  waiter.innerHTML = "";
  recogiendo.innerHTML = "";
  loaner.innerHTML = "";
  transporte.innerHTML = "";

  data.forEach((p) => {
    if (p.proposito === "Sala" && waiter) {
      waiter.innerHTML += `
        <tr><td>${p.hora}</td><td>${p.tag || ""}</td><td>${p.modelo || ""}</td>
        <td>${p.color || ""}</td><td>${p.asesor || ""}</td><td>${p.descripcion || ""}</td>
        <td>${p.status || ""}</td><td>${p.promise_time || ""}</td></tr>`;
    } else if (p.proposito === "Recogiendo" && recogiendo) {
      recogiendo.innerHTML += `
        <tr><td>${p.hora}</td><td>${p.tag || ""}</td><td>${p.modelo || ""}</td><td>${p.color || ""}</td>
        <td>${p.asesor || ""}</td><td>${p.descripcion || ""}</td>
        <td>${p.status_cajero || ""}</td><td>${p.status_jockey || ""}</td>
        <td><button>Editar</button></td></tr>`;
    } else if (p.proposito === "Loaner" && loaner) {
      loaner.innerHTML += `
        <tr><td>${p.hora}</td><td>${p.nombre || ""}</td><td><button>Ver</button></td></tr>`;
    } else if (p.proposito === "Transportación" && transporte) {
      transporte.innerHTML += `
        <tr><td>${p.hora}</td><td>${p.nombre || ""}</td><td>${p.telefono || ""}</td>
        <td>${p.direccion || ""}</td><td>${p.pasajeros || ""}</td>
        <td>${p.asignado || ""}</td><td><button>Ver</button></td></tr>`;
    }
  });
}

cargarTableros();


// Manejar evento de 'Agregar'
const form = document.getElementById("crear-pickup-form");
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const proposito = $("proposito").value;
    const tag = $("tag").value;
    const modelo = $("modelo").value;
    const color = $("color").value;
    const asesor = $("asesor").value;
    const descripcion = $("descripcion").value;
    const vin = $("vin").value || null;
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const { data, error } = await supabase.from("pickups").insert([{
      proposito, tag, modelo, color, asesor, descripcion, vin, hora
    }]);

    if (error) {
      alert("Error al crear pickup.");
      console.error(error);
      return;
    }

    // Limpiar campos
    form.reset();

    // Recargar tablas
    cargarTableros();
  };
}
