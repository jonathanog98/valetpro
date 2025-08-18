
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarTodos();
});

const form = document.getElementById('pickupForm');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const proposito = document.getElementById('proposito').value;
  const tag = document.getElementById('tag')?.value || null;
  const vin = document.getElementById('vin')?.value || null;
  const modelo = document.getElementById('modelo')?.value || null;
  const color = document.getElementById('color')?.value || null;
  const asesor = document.getElementById('asesor')?.value || null;
  const descripcion = document.getElementById('descripcion')?.value || null;

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("No se pudo obtener el usuario.");
    return;
  }

  const hora = new Date().toISOString();
  let insertData = { user_id: user.id, hora };

  let tabla = null;

  switch (proposito) {
    case "Recogiendo":
      tabla = "recogiendo";
      Object.assign(insertData, { tag, vin, modelo, color, asesor, descripcion });
      break;
    case "En Sala":
      tabla = "en_sala";
      Object.assign(insertData, { tag, vin, modelo, color, asesor, descripcion });
      break;
    case "Loaner":
      tabla = "loaners";
      Object.assign(insertData, { nombre_cliente: asesor });
      break;
    case "Transportación":
      tabla = "transportaciones";
      Object.assign(insertData, { nombre: asesor });
      break;
    default:
      alert("Propósito inválido.");
      return;
  }

  const { error } = await supabase.from(tabla).insert([insertData]);

  if (error) {
    console.error("Error al insertar:", error);
    alert("Error al guardar el pickup.");
  } else {
    alert("Pickup guardado correctamente.");
    form.reset();
    await cargarTodos();
  }
});

async function cargarTodos() {
  await cargar("recogiendo", "recogiendoSection");
  await cargar("en_sala", "ensalaSection");
  await cargar("loaners", "loanersSection");
  await cargar("transportaciones", "transportacionesSection");
}

async function cargar(tabla, sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const { data, error } = await supabase.from(tabla).select('*').order('hora', { ascending: false });

  if (error) {
    console.error(`Error cargando datos de ${tabla}:`, error);
    return;
  }

  section.innerHTML = "";
  data.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("pickup-card");
    div.textContent = Object.values(item).join(" | ");
    section.appendChild(div);
  });
}
