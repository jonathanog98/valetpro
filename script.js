
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarTodos();
});

const form = document.getElementById('pickupForm');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const proposito = document.getElementById('proposito').value;
    const tag = document.getElementById('tag').value;
    const vin = document.getElementById('vin').value;
    const modelo = document.getElementById('modelo').value;
    const color = document.getElementById('color').value;
    const asesor = document.getElementById('asesor').value;
    const descripcion = document.getElementById('descripcion').value;


  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

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
    section.appendChild(div);
  });
}

const statusCajeroOptions = [
  "Complete", "Tiene Doc", "No ha pagado", "Falta book", "En Camino",
  "Pert", "Dudas", "Se va sin docs", "Llaves a asesor", "Lav. Cortesía",
  "Test Drive", "Llevar a taller", "Inspección", "Valet", "Poner a Cargar", "Grua"
];

const statusJockeyOptions = [
  "Arriba", "Subiendo", "Lavado", "Secado", "Working", "No lavar",
  "Ubicada", "Detailing", "Zona Blanca"
];

function createDropdown(value, options, onChange) {
  const select = document.createElement('select');
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', onChange);
  return select;
}

async function handleStatusUpdate(pickup, column, newValue) {
  const update = {};
  update[column] = newValue;

  await supabase.from("recogiendo").update(update).eq("id", pickup.id);

  if ((column === "status_cajero" || column === "status_jockey")) {
    const { data: updatedPickup } = await supabase
      .from("recogiendo")
      .select("*")
      .eq("id", pickup.id)
      .single();

    if (updatedPickup.status_cajero === "Complete" &&
        updatedPickup.status_jockey === "Arriba") {
      const { error } = await supabase.from("autos_entregados").insert([updatedPickup]);
      if (!error) {
        await supabase.from("recogiendo").delete().eq("id", pickup.id);
      }
    }
  }
}
