document.addEventListener("DOMContentLoaded", () => {
  const propositoSelect = document.getElementById("proposito");
  if (propositoSelect) {
    propositoSelect.addEventListener("change", renderFields);
    renderFields(); // Render inmediato al cargar
  }
});

const FIELDS_BY_PURPOSE = {
  "En sala": [
    { id: "tag", label: "TAG", type: "text" },
    { id: "modelo", label: "Modelo", type: "text" },
    { id: "color", label: "Color", type: "text" },
    { id: "asesor", label: "Asesor", type: "text" },
    { id: "descripcion", label: "Descripción", type: "text" },
  ],
  "Recogiendo": [
    { id: "tag", label: "TAG", type: "text" },
    { id: "modelo", label: "Modelo", type: "text" },
    { id: "color", label: "Color", type: "text" },
    { id: "asesor", label: "Asesor", type: "text" },
    { id: "descripcion", label: "Descripción", type: "text" },
  ],
  "Loaner": [
    { id: "nombre", label: "Nombre", type: "text" },
    { id: "hora_cita", label: "Hora de la Cita", type: "time" },
    { id: "descripcion", label: "Descripción", type: "text" }
  ],
  "Transportación": [
    { id: "nombre", label: "Nombre", type: "text" },
    { id: "telefono", label: "Teléfono", type: "text" },
    { id: "direccion", label: "Dirección", type: "text" },
    { id: "cantidad", label: "Cantidad", type: "number" },
    { id: "descripcion", label: "Descripción", type: "text" }
  ]
};

function renderFields() {
  const form = document.getElementById("pickup-form");
  const select = document.getElementById("proposito");
  const container = document.getElementById("extra-fields");
  if (!form || !select || !container) return;

  container.innerHTML = '';
  const value = select.value;

  const fields = FIELDS_BY_PURPOSE[value] || [];
  for (const field of fields) {
    const div = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.id = field.id;
    input.name = field.id;
    input.type = field.type || "text";
    input.required = true;
    div.appendChild(label);
    div.appendChild(input);
    container.appendChild(div);
  }
}