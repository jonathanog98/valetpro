
// script.js

document.addEventListener("DOMContentLoaded", async function () {
  const userRole = localStorage.getItem("userRole") || "Guest";
  const userEmail = localStorage.getItem("userEmail") || "";

  const cajeroStatuses = [
    "Complete", "Tiene Doc", "No ha pagado", "Falta book", "En Camino", "Pert",
    "Dudas", "Se va sin docs", "Llaves a asesor", "Lav. Cortesía", "Test Drive",
    "Llevar a taller", "Inspección", "Valet", "Poner a Cargar", "Grua"
  ];

  const jockeyStatuses = [
    "Arriba", "Subiendo", "Lavado", "Secado", "Working", "No lavar",
    "Ubicada", "Detailing", "Zona Blanca"
  ];

  const enSalaStatuses = [
    "Working", "Falta Book", "Listo", "Grua", "Lav. Cortesía", "Status Asesor",
    "Call Center", "Cargando", "Inspección"
  ];

  async function handleVinBlur() {
    const vinInput = document.getElementById("vin");
    const vin = vinInput.value;
    if (vin.length >= 5) {
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
        const data = await res.json();
        const modelEntry = data.Results.find(entry => entry.Variable === "Model");
        if (modelEntry) {
          document.getElementById("modelo").value = modelEntry.Value || "";
        }
      } catch (err) {
        console.error("Error decoding VIN", err);
      }
    }
  }

  function createDropdown(options, selectedValue, onChange, disabled) {
    const select = document.createElement("select");
    select.disabled = disabled;
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", (e) => onChange(e.target.value));
    return select;
  }

  function createTextInput(value, onChange, disabled) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    input.disabled = disabled;
    input.addEventListener("blur", (e) => onChange(e.target.value));
    return input;
  }

  function createDeleteButton(id, table) {
    const btn = document.createElement("button");
    btn.textContent = "Eliminar";
    btn.addEventListener("click", async () => {
      if (confirm("¿Estás seguro de que deseas eliminar este pickup?")) {
        await supabase.from(table).delete().eq("id", id);
        location.reload();
      }
    });
    return btn;
  }

  // Populate tables from Supabase
  async function loadData() {
    const roles = {
      admin: userRole === "Admin",
      cajero: userRole === "Cajero",
      jockey: userRole === "Jockey",
      transporte: userRole === "Transportacion"
    };

    const pickups = [
      { table: "recogiendo", elementId: "recogiendo-table", fields: ["hora", "tag", "modelo", "color", "asesor", "descripcion", "status_cajero", "status_jockey"] },
      { table: "en_sala", elementId: "en-sala-table", fields: ["hora", "tag", "modelo", "color", "asesor", "descripcion", "status", "promise_time"] },
      { table: "transportaciones", elementId: "transportaciones-table", fields: ["hora", "nombre", "telefono", "direccion", "personas", "asignado"] },
      { table: "loaners", elementId: "loaners-table", fields: ["hora", "nombre_cliente"] }
    ];

    for (let { table, elementId, fields } of pickups) {
      const { data } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      const tbody = document.getElementById(elementId);
      if (!tbody) continue;
      tbody.innerHTML = "";
      for (let row of data) {
        const tr = document.createElement("tr");
        fields.forEach(field => {
          const td = document.createElement("td");

          if (field === "status_cajero" && (roles.cajero || roles.admin)) {
            td.appendChild(createDropdown(cajeroStatuses, row[field], async (val) => {
              await supabase.from(table).update({ status_cajero: val }).eq("id", row.id);
            }, false));
          } else if (field === "status_jockey" && (roles.jockey || roles.admin)) {
            td.appendChild(createDropdown(jockeyStatuses, row[field], async (val) => {
              await supabase.from(table).update({ status_jockey: val }).eq("id", row.id);
            }, false));
          } else if (field === "status" && table === "en_sala" && (roles.admin || roles.cajero)) {
            td.appendChild(createDropdown(enSalaStatuses, row[field], async (val) => {
              await supabase.from(table).update({ status: val }).eq("id", row.id);
            }, false));
          } else if (field === "promise_time" && table === "en_sala" && (roles.admin || roles.cajero)) {
            td.appendChild(createTextInput(row[field], async (val) => {
              await supabase.from(table).update({ promise_time: val }).eq("id", row.id);
            }, false));
          } else if (field === "asignado" && table === "transportaciones" && (roles.admin || roles.transporte)) {
            td.appendChild(createTextInput(row[field], async (val) => {
              await supabase.from(table).update({ asignado: val }).eq("id", row.id);
            }, false));
          } else {
            td.textContent = row[field] || "";
          }

          tr.appendChild(td);
        });

        const actionTd = document.createElement("td");
        if (roles.admin || roles.cajero) {
          actionTd.appendChild(createDeleteButton(row.id, table));
        }
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      }
    }
  }

  await loadData();

  const vinInput = document.getElementById("vin");
  if (vinInput) {
    vinInput.addEventListener("blur", handleVinBlur);
  }
});
