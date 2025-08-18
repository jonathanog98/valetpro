
import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async function () {
  // ====== SESIÓN ======
  const userRole = sessionStorage.getItem("rol") || "Guest";
  const userEmail = sessionStorage.getItem("usuario") || "";

  // ====== LISTAS DE STATUS ======
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

  // ====== TIME HELPERS (12h TEXT) ======
  function horaActual12h() {
    // "01:49 PM" (siempre 2 dígitos y AM/PM en mayúsculas)
    const s = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return s.toUpperCase();
  }

  // ====== VIN DECODER ======
  async function handleVinBlur() {
    const vinInput = document.getElementById("vin");
    if (!vinInput) return;
    const vin = vinInput.value?.trim();
    if (vin && vin.length >= 5) {
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`);
        const data = await res.json();
        const modelEntry = data?.Results?.find(entry => entry.Variable === "Model");
        if (modelEntry) {
          const modeloEl = document.getElementById("modelo");
          if (modeloEl) modeloEl.value = modelEntry.Value || "";
        }
      } catch (err) {
        console.error("Error decoding VIN", err);
      }
    }
  }
  window.handleVinBlur = handleVinBlur;

  // ====== UI HELPERS ======
  function createDropdown(options, selectedValue, onChange, disabled) {
    const select = document.createElement("select");
    select.disabled = !!disabled;
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
    input.disabled = !!disabled;
    input.addEventListener("blur", (e) => onChange(e.target.value));
    return input;
  }

  function createDeleteButton(id, table) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Eliminar";
    btn.addEventListener("click", async () => {
      if (!supabase) {
        console.error("Supabase no está disponible (import falló)");
        return;
      }
      if (confirm("¿Estás seguro de que deseas eliminar este pickup?")) {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) {
          console.error("Error eliminando:", error);
          alert(`No se pudo eliminar. ${error.message || ''}`);
        } else {
          await loadData();
        }
      }
    });
    return btn;
  }

  // === SELECT robusto: intenta ordenar por 'hora' (texto 12h) y si falla, sin orden ===
  async function fetchTable(table) {
    let r1 = await supabase.from(table).select("*").order("hora", { ascending: false });
    if (!r1.error) return r1;
    console.warn(`Fallo order(hora) en ${table}. Cargando sin orden…`, r1.error);
    return await supabase.from(table).select("*");
  }

  // ====== CARGA DE TABLAS ======
  async function loadData() {
    const roles = {
      admin: userRole === "Admin",
      cajero: userRole === "Cajero",
      jockey: userRole === "Jockey",
      transporte: userRole === "Transportacion" || userRole === "Transportación"
    };

    const pickups = [
      { table: "en_sala", elementId: "tabla-waiter", fields: ["hora", "tag", "modelo", "color", "asesor", "descripcion", "status", "promise_time"] },
      { table: "recogiendo", elementId: "tabla-recogiendo", fields: ["hora", "tag", "modelo", "color", "asesor", "descripcion", "status_cajero", "status_jockey"] },
      { table: "loaners", elementId: "tabla-loaner", fields: ["hora", "nombre_cliente"] },
      { table: "transportaciones", elementId: "tabla-transporte", fields: ["hora", "nombre", "telefono", "direccion", "personas", "asignado"] }
    ];

    for (let { table, elementId, fields } of pickups) {
      const tableEl = document.getElementById(elementId);
      if (!tableEl) continue;
      const tbody = tableEl.querySelector("tbody") || tableEl;

      const { data, error } = await fetchTable(table);
      if (error) {
        console.error(`Error consultando ${table}:`, error);
        continue;
      }

      tbody.innerHTML = "";

      for (let row of (data || [])) {
        const tr = document.createElement("tr");

        for (let field of fields) {
          const td = document.createElement("td");

          if (field === "status_cajero" && (roles.cajero || roles.admin)) {
            td.appendChild(createDropdown(cajeroStatuses, row[field], async (val) => {
              const { error } = await supabase.from(table).update({ status_cajero: val }).eq("id", row.id);
              if (error) console.error("Error actualizando status_cajero:", error);
            }, false));
          } else if (field === "status_jockey" && (roles.jockey || roles.admin)) {
            td.appendChild(createDropdown(jockeyStatuses, row[field], async (val) => {
              const { error } = await supabase.from(table).update({ status_jockey: val }).eq("id", row.id);
              if (error) console.error("Error actualizando status_jockey:", error);
            }, false));
          } else if (field === "status" && table === "en_sala" && (roles.admin || roles.cajero)) {
            td.appendChild(createDropdown(enSalaStatuses, row[field], async (val) => {
              const { error } = await supabase.from(table).update({ status: val }).eq("id", row.id);
              if (error) {
                console.error("Error actualizando status (en_sala):", error);
                return;
              }
              // mover en_sala → recogiendo cuando elija "Falta book"
              if (String(val).toLowerCase() === "falta book") {
                try {
                  const insertPayload = {
                    hora: row.hora || horaActual12h(),
                    tag: row.tag,
                    modelo: row.modelo,
                    color: row.color,
                    asesor: row.asesor,
                    descripcion: row.descripcion,
                    status_cajero: "Falta book"
                  };
                  const { error: insertError } = await supabase.from("recogiendo").insert([insertPayload]);
                  if (insertError) throw insertError;
                  const { error: deleteError } = await supabase.from("en_sala").delete().eq("id", row.id);
                  if (deleteError) throw deleteError;
                  await loadData();
                } catch (e) {
                  console.error("Error moviendo registro a Recogiendo:", e);
                  alert(`No se pudo mover a Recogiendo: ${e.message || e}`);
                }
              }
            }, false));
          } else if (field === "promise_time" && table === "en_sala" && (roles.admin || roles.cajero)) {
            td.appendChild(createTextInput(row[field], async (val) => {
              const { error } = await supabase.from(table).update({ promise_time: val }).eq("id", row.id);
              if (error) console.error("Error actualizando promise_time:", error);
            }, false));
          } else if (field === "asignado" && table === "transportaciones" && (roles.admin || roles.transporte)) {
            td.appendChild(createTextInput(row[field], async (val) => {
              const { error } = await supabase.from(table).update({ asignado: val }).eq("id", row.id);
              if (error) console.error("Error actualizando asignado (transportaciones):", error);
            }, false));
          } else {
            td.textContent = row[field] ?? "";
          }

          tr.appendChild(td);
        }

        // Acciones (Eliminar) para Admin o Cajero en tablas con columna Acciones
        const addDelete =
          (userRole === "Admin" || userRole === "Cajero") &&
          (table === "recogiendo" || table === "loaners" || table === "transportaciones");

        if (addDelete) {
          const actionTd = document.createElement("td");
          actionTd.appendChild(createDeleteButton(row.id, table));
          tr.appendChild(actionTd);
        }

        tbody.appendChild(tr);
      }
    }
  }

  await loadData();

  // ====== INSERTAR NUEVOS PICKUPS ======
  const form = document.getElementById("pickup-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const proposito = document.getElementById("proposito")?.value;
    if (!proposito) return;

    const hora = horaActual12h(); // <-- ahora guardamos "01:49 PM" (texto)
    const tag = document.getElementById("tag")?.value?.trim() || null;
    const modelo = document.getElementById("modelo")?.value?.trim() || null;
    const color = document.getElementById("color")?.value?.trim() || null;
    const asesor = document.getElementById("asesor")?.value?.trim() || null;
    const descripcion = document.getElementById("descripcion")?.value?.trim() || null;

    try {
      if (proposito === "Recogiendo") {
        const payload = { hora, tag, modelo, color, asesor, descripcion };
        const { error } = await supabase.from("recogiendo").insert([payload]);
        if (error) throw error;
      } else if (proposito === "Waiter") {
        const payload = { hora, tag, modelo, color, asesor, descripcion, status: "Working" };
        const { error } = await supabase.from("en_sala").insert([payload]);
        if (error) throw error;
      } else if (proposito === "Loaner") {
        const nombre = document.getElementById("nombre")?.value?.trim() || null;
        const hora_cita = document.getElementById("hora_cita")?.value || null;
        const payload = { hora: (hora_cita || hora), nombre_cliente: nombre };
        const { error } = await supabase.from("loaners").insert([payload]);
        if (error) throw error;
      } else if (proposito === "Transportación") {
        const nombre = document.getElementById("nombre")?.value?.trim() || null;
        const telefono = document.getElementById("telefono")?.value?.trim() || null;
        const direccion = document.getElementById("direccion")?.value?.trim() || null;
        const personasVal = document.getElementById("personas")?.value;
        const personas = personasVal ? Number(personasVal) : null;
        const payload = { hora, nombre, telefono, direccion, personas, asignado: "" };
        const { error } = await supabase.from("transportaciones").insert([payload]);
        if (error) throw error;
      }

      form.reset();
      document.getElementById("proposito").value = "Recogiendo";
      document.getElementById("proposito").dispatchEvent(new Event("change"));

      await loadData();
      alert("Pickup creado correctamente.");
    } catch (err) {
      console.error("Error insertando pickup:", err);
      alert(`No se pudo crear el pickup. ${err?.message || err}`);
    }
  });

  // VIN blur
  const vinInput = document.getElementById("vin");
  if (vinInput) {
    vinInput.addEventListener("blur", handleVinBlur);
  }

  console.log(`[APP] sessionStorage activo. usuario="${userEmail}", rol="${userRole}"`);
});
