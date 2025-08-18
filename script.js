
import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async function () {
  // ===== SESIÓN (sessionStorage) =====
  const userRole = sessionStorage.getItem("rol") || "Guest";
  const userEmail = sessionStorage.getItem("usuario") || "";

  // ===== STATUS =====
  const cajeroStatuses = [
    "Complete","Tiene Doc","No ha pagado","Falta book","En Camino","Pert",
    "Dudas","Se va sin docs","Llaves a asesor","Lav. Cortesía","Test Drive",
    "Llevar a taller","Inspección","Valet","Poner a Cargar","Grua"
  ];
  const jockeyStatuses = [
    "Arriba","Subiendo","Lavado","Secado","Working","No lavar","Ubicada","Detailing","Zona Blanca"
  ];
  const enSalaStatuses = [
    "Working","Falta Book","Listo","Grua","Lav. Cortesía","Status Asesor","Call Center","Cargando","Inspección"
  ];

  // ===== HORA 12h TEXTO =====
  function horaActual12h() {
    return new Date().toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }).toUpperCase();
  }

  // ===== VIN DECODER =====
  async function handleVinBlur() {
    const vinEl = document.getElementById("vin");
    const modeloEl = document.getElementById("modelo");
    if (!vinEl || !modeloEl) return;
    const vin = vinEl.value?.trim();
    if (!vin || vin.length < 5) return;
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`);
      const data = await res.json();
      const modelEntry = data?.Results?.find((e) => e.Variable === "Model");
      if (modelEntry) modeloEl.value = modelEntry.Value || "";
    } catch (e) {
      console.error("Error decoding VIN:", e);
    }
  }
  window.handleVinBlur = handleVinBlur;

  // ===== UI HELPERS =====
  function createDropdown(options, selectedValue, onChange, disabled) {
    const select = document.createElement("select");
    select.disabled = !!disabled;
    options.forEach((optVal) => {
      const opt = document.createElement("option");
      opt.value = optVal;
      opt.textContent = optVal;
      if (optVal === selectedValue) opt.selected = true;
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
      if (!confirm("¿Eliminar este registro?")) return;
      try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        await loadData();
      } catch (e) {
        console.error("Error eliminando:", e);
        alert(`No se pudo eliminar: ${e?.message || e}`);
      }
    });
    return btn;
  }

  // ===== FETCH con orden de más viejo a más nuevo =====
  async function fetchTable(table) {
    // id ASC como proxy de antigüedad
    let r = await supabase.from(table).select("*").order("id", { ascending: true });
    if (!r.error) return r;
    // fallback a hora ASC
    r = await supabase.from(table).select("*").order("hora", { ascending: true });
    if (!r.error) return r;
    // último intento sin orden
    return await supabase.from(table).select("*");
  }

  // ===== CARGA DE TABLAS =====
  async function loadData() {
    const roles = {
      admin: userRole === "Admin",
      cajero: userRole === "Cajero",
      jockey: userRole === "Jockey",
      transporte: userRole === "Transportacion" || userRole === "Transportación",
    };

    const configs = [
      { table: "en_sala", elementId: "tabla-waiter", fields: ["hora","tag","modelo","color","asesor","descripcion","status","promise_time"] },
      { table: "recogiendo", elementId: "tabla-recogiendo", fields: ["hora","tag","modelo","color","asesor","descripcion","status_cajero","status_jockey"] },
      { table: "loaners", elementId: "tabla-loaner", fields: ["hora","nombre_cliente"] },
      { table: "transportaciones", elementId: "tabla-transporte", fields: ["hora","nombre","telefono","direccion","personas","asignado"] },
    ];

    for (const { table, elementId, fields } of configs) {
      const tableEl = document.getElementById(elementId);
      if (!tableEl) continue;
      const tbody = tableEl.querySelector("tbody") || tableEl;

      let data = [];
      try {
        const res = await fetchTable(table);
        if (res.error) throw res.error;
        data = res.data || [];
      } catch (e) {
        console.error(`Error consultando ${table}:`, e);
        alert(`No pude cargar ${table}: ${e?.message || e}`);
        continue;
      }

      tbody.innerHTML = "";
      for (const row of data) {
        const tr = document.createElement("tr");
        for (const field of fields) {
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
              if (String(val).toLowerCase() === "falta book") {
                try {
                  const insertPayload = {
                    hora: row.hora || horaActual12h(),
                    tag: row.tag,
                    modelo: row.modelo,
                    color: row.color,
                    asesor: row.asesor,
                    descripcion: row.descripcion,
                    status_cajero: "Falta book",
                  };
                  const { error: insErr } = await supabase.from("recogiendo").insert([insertPayload]);
                  if (insErr) throw insErr;
                  const { error: delErr } = await supabase.from("en_sala").delete().eq("id", row.id);
                  if (delErr) throw delErr;
                  await loadData();
                } catch (e) {
                  console.error("Error moviendo a Recogiendo:", e);
                  alert(`No se pudo mover a Recogiendo: ${e?.message || e}`);
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
              if (error) console.error("Error actualizando asignado:", error);
            }, false));
          } else {
            td.textContent = row[field] ?? "";
          }
          tr.appendChild(td);
        }

        // Acciones (Eliminar) para Cajero/Admin en recogiendo, loaners, transportaciones
        const addDelete =
          (roles.admin || roles.cajero) &&
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

  // ===== FORM INSERT =====
  const form = document.getElementById("pickup-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const proposito = document.getElementById("proposito")?.value;
    if (!proposito) return;

    const hora = horaActual12h();
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
  if (vinInput) vinInput.addEventListener("blur", handleVinBlur);

  console.log(`[APP] sessionStorage activo. usuario="${userEmail}", rol="${userRole}"`);
});
