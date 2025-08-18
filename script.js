
// --- Estados definidos ---
const cajeroStatuses = [
  "Complete", "Tiene Doc", "No ha pagado", "Falta book", "En Camino", "Pert", "Dudas",
  "Se va sin docs", "Llaves a asesor", "Lav. Cortesía", "Test Drive", "Llevar a taller",
  "Inspección", "Valet", "Poner a Cargar", "Grua"
];

const jockeyStatuses = [
  "Arriba", "Subiendo", "Lavado", "Secado", "Working", "No lavar", "Ubicada",
  "Detailing", "Zona Blanca"
];

const enSalaStatuses = [
  "Working", "Falta Book", "Listo", "Grua", "Lav. Cortesía",
  "Status Asesor", "Call Center", "Cargando", "Inspección"
];

// --- Helper para crear dropdowns ---
function createSelect(options, currentValue, onChangeCallback) {
  const select = document.createElement("select");
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "—";
  select.appendChild(emptyOption);
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  });
  if (onChangeCallback) select.addEventListener("change", onChangeCallback);
  return select;
}

// --- Renderizado condicional por rol ---
function renderCell(role, type, value, onChange) {
  if ((type === "status_cajero" && (role === "Admin" || role === "Cajero")) ||
      (type === "status_jockey" && (role === "Admin" || role === "Jockey")) ||
      (type === "status_en_sala" && (role === "Admin" || role === "Cajero")) ||
      (type === "asignado" && (role === "Admin" || role === "Transportacion"))) {
    let options;
    switch (type) {
      case "status_cajero": options = cajeroStatuses; break;
      case "status_jockey": options = jockeyStatuses; break;
      case "status_en_sala": options = enSalaStatuses; break;
    }
    return createSelect(options, value, onChange);
  } else {
    const span = document.createElement("span");
    span.textContent = value || "—";
    return span;
  }
}

// --- Control de botón eliminar ---
function createDeleteButton(role, onClick) {
  if (role === "Admin" || role === "Cajero") {
    const btn = document.createElement("button");
    btn.textContent = "Eliminar";
    btn.onclick = onClick;
    return btn;
  } else {
    return document.createTextNode("");
  }
}

// TODO: Incluir aquí funciones de renderizado de pickups y actualización a base de datos/backend

