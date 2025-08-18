import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async function () {
  // ====== Estilos para parpadeo ======
  (function ensureBlinkStyles() {
    const STYLE_ID = "blink-styles";
    if (document.getElementById(STYLE_ID)) return;
    const css = `
@keyframes blinkYellow { 0%{background-color:transparent;} 50%{background-color:rgba(255,235,59,0.4);} 100%{background-color:transparent;} }
@keyframes blinkRed    { 0%{background-color:transparent;} 50%{background-color:rgba(244,67,54,0.4);} 100%{background-color:transparent;} }
tr.blink-yellow { animation: blinkYellow 1s linear infinite; }
tr.blink-red    { animation: blinkRed 1s linear infinite; }
`;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ====== SESIÓN (sessionStorage) ======
  const userRole  = sessionStorage.getItem("rol") || "Guest";
  const userEmail = sessionStorage.getItem("usuario") || "";

  // ====== Listas de status ======
  const cajeroStatuses = [
    "--","Complete","Tiene Doc","No ha pagado","Falta book","En Camino","Pert",
    "Dudas","Se va sin docs","Llaves a asesor","Lav. Cortesía","Test Drive",
    "Llevar a taller","Inspección","Valet","Poner a Cargar","Grua"
  ];
  const jockeyStatuses = [
    "Arriba","Subiendo","Lavado","Secado","Working","No lavar","Ubicada","Detailing","Zona Blanca"
  ];
  const enSalaStatuses = [
    "Working","Falta Book","Listo","Grua","Lav. Cortesía","Status Asesor","Call Center","Cargando","Inspección"
  ];

  // ====== Hora en 12h como texto ======
  function horaActual12h() {
    return new Date().toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }).toUpperCase();
  }

  // ====== VIN Decoder (NHTSA) ======
  async function handleVinBlur() {
    const vinEl = document.getElementById("vin");
    const modeloEl = document.getElementById("modelo");
    if (!vinEl || !modeloEl) return;
    const vin = vinEl.value?.trim();
    if (!vin || !vin.length) return;
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

  // ====== UI helpers ======
  function createDropdown(options, selectedValue, onChange, disabled) {
    const select = document.createElement("select");
    select.disabled = !!disabled;
    options.forEach((optVal) => {
      const opt = document.createElement("option");
      opt.value = optVal;
      opt.textContent = optVal;
      if ((selectedValue ?? "") === optVal) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", (e) => onChange(e.target.value));
    return select;
  }

  function createTextInput(value, onChange, disabled) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
    input.disabled = !!disabled;
    input.addEventListener("blur", (e) => onChange(e.target.value));
    return input;
  }

  function createTimeInput(value, onChange, disabled) {
    const input = document.createElement("input");
    input.type = "time";
    input.step = 60;
    input.disabled = !!disabled;

    function parseAny(v) {
      if (!v) return "";
      const s = String(v).trim().toUpperCase();
      let m = s.match(/^([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/); // 24h
      if (m) return `${m[1].padStart(2,'0')}:${m[2]}`;
      m = s.match(/^([0-1]?\d):([0-5]\d)\s*(AM|PM)$/); // 12h
      if (m) {
        let hh = parseInt(m[1],10);
        const mm = m[2];
        const ap = m[3];
        if (ap === "AM") { if (hh === 12) hh = 0; }
        else { if (hh !== 12) hh += 12; }
        return `${String(hh).padStart(2,'0')}:${mm}`;
      }
      return "";
    }

    const v = parseAny(value);
    if (v) input.value = v;
    input.addEventListener("change", (e) => onChange(e.target.value));
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

  // ====== Helpers de tiempo/blink ======
  function parseCreatedAt(row) {
    if (row.created_at) {
      const d = new Date(row.created_at);
      if (!isNaN(d)) return d;
    }
    if (row.hora) {
      const s = String(row.hora).trim().toUpperCase();
      const m = s.match(/^([0-1]?\d):([0-5]\d)\s*(AM|PM)$/);
      const now = new Date();
      if (m) {
        let hh = parseInt(m[1],10);
        const mm = parseInt(m[2],10);
        const ap = m[3];
        if (ap === "AM") { if (hh === 12) hh = 0; }
        else { if (hh !== 12) hh += 12; }
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
        return d;
      }
    }
    return null;
  }

  function parsePromiseTime(row) {
    const v = row.promise_time;
    if (!v) return null;
    const now = new Date();
    const s = String(v).trim().toUpperCase();
    let m = s.match(/^([0-2]?\d):([0-5]\d)$/);
    if (m) {
      const hh = parseInt(m[1],10);
      const mm = parseInt(m[2],10);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    }
    m = s.match(/^([0-1]?\d):([0-5]\d)\s*(AM|PM)$/);
    if (m) {
      let hh = parseInt(m[1],10);
      const mm = parseInt(m[2],10);
      const ap = m[3];
      if (ap === "AM") { if (hh === 12) hh = 0; } else { if (hh !== 12) hh += 12; }
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    }
    return null;
  }

  function classifyBlink(row) {
    const now = new Date();
    const created = parseCreatedAt(row);
    let blinkYellow = false;
    let blinkRed = false;

    if (created) {
      const diffMin = (now.getTime() - created.getTime()) / 60000;
      if (diffMin >= 10) blinkRed = true;
      else if (diffMin >= 5) blinkYellow = true;
    }

    // Promise time: si está dentro de 30 min desde ahora → amarillo (no pisa rojo)
    if (!blinkRed && row.promise_time) {
      const p = parsePromiseTime(row);
      if (p) {
        const delta = (p.getTime() - now.getTime()) / 60000;
        if (delta >= 0 && delta <= 30) blinkYellow = true;
      }
    }
    return { blinkYellow, blinkRed };
  }

  // ====== Mover a Autos Entregados ======
  async function maybeMoveToEntregados(row) {
    try {
      if (!row) return;
      const caj = String(row.status_cajero ?? "").toLowerCase();
      const jok = String(row.status_jockey ?? "").toLowerCase();
      if (caj === "complete" && jok === "arriba") {
        const horaSalida = horaActual12h();
        function parseHora12(h12) {
          if (!h12) return null;
          const s = String(h12).trim().toUpperCase();
          const m = s.match(/^([0-1]?\d):([0-5]\d)\s*(AM|PM)$/);
          const now = new Date();
          if (!m) return null;
          let hh = parseInt(m[1],10);
          const mm = parseInt(m[2],10);
          const ap = m[3];
          if (ap === "AM") { if (hh === 12) hh = 0; }
          else { if (hh !== 12) hh += 12; }
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
          if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
          return d;
        }
        const llegada = parseHora12(row.hora);
        const esperaMin = llegada ? Math.round((new Date().getTime() - llegada.getTime())/60000) : null;
        const ent = {
          tag: row.tag, modelo: row.modelo, color: row.color, asesor: row.asesor,
          hora_llegada: row.hora || "", hora_salida: horaSalida,
          tiempo_espera_min: esperaMin
        };
        const { error: insErr } = await supabase.from("autos_entregados").insert([ent]);
        if (insErr) { console.error("insert autos_entregados:", insErr); return; }
        const { error: delErr } = await supabase.from("recogiendo").delete().eq("id", row.id);
        if (delErr) { console.error("delete recogiendo:", delErr); return; }
        await loadData();
      }
    } catch (e) {
      console.error("maybeMoveToEntregados error:", e);
    }
  }

  // ====== SELECT: orden ascendente (más viejo primero) ======
  async function fetchTable(table) {
    let r = await supabase.from(table).select("*").order("id", { ascending: true });
    if (!r.error) return r;
    r = await supabase.from(table).select("*").order("hora", { ascending: true });
    if (!r.error) return r;
    return await supabase.from(table).select("*");
  }

  // ====== Render de tablas ======
  async function loadData() {
    const roles = {
      admin:  userRole === "Admin",
      cajero: userRole === "Cajero",
      jockey: userRole === "Jockey",
      transporte: userRole === "Transportacion" || userRole === "Transportación",
    };

    const configs = [
      { table: "en_sala",          elementId: "tabla-waiter",      fields: ["hora","tag","modelo","color","asesor","descripcion","status","promise_time"] },
      { table: "recogiendo",       elementId: "tabla-recogiendo",  fields: ["hora","tag","modelo","color","asesor","descripcion","status_cajero","status_jockey"] },
      { table: "loaners",          elementId: "tabla-loaner",      fields: ["hora","nombre_cliente","descripcion"] },
      { table: "transportaciones", elementId: "tabla-transporte",  fields: ["hora","nombre","telefono","direccion","personas","asignado"] },
      { table: "autos_entregados", elementId: "tabla-entregados",  fields: ["tag","modelo","color","asesor","hora_llegada","hora_salida","tiempo_espera_min"] },
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

      // Promedio en Autos Entregados
      if (table === "autos_entregados") {
        const avgEl = document.getElementById("avg-entregados");
        if (avgEl) {
          const total = data.reduce((a,r)=> a + (Number(r.tiempo_espera_min)||0), 0);
          const n = data.length || 1;
          const avg = Math.round(total / n);
          const h = Math.floor(avg/60); const m = avg%60;
          avgEl.textContent = `Promedio de espera: ${h? h+"h ":""}${m}m`;
        }
      }

      for (const row of data) {
        const tr = document.createElement("tr");

        for (const field of fields) {
          const td = document.createElement("td");

          if (field === "status_cajero" && (roles.cajero || roles.admin) && elementId === "tabla-recogiendo") {
            td.appendChild(createDropdown(cajeroStatuses, row[field] ?? "--", async (val) => {
              const { error } = await supabase.from("recogiendo").update({ status_cajero: val }).eq("id", row.id);
              if (error) { console.error("update status_cajero:", error); return; }
              row.status_cajero = val;
              await maybeMoveToEntregados(row);
            }, false));
          } else if (field === "status_jockey" && (roles.jockey || roles.admin) && elementId === "tabla-recogiendo") {
            td.appendChild(createDropdown(jockeyStatuses, row[field], async (val) => {
              const { error } = await supabase.from("recogiendo").update({ status_jockey: val }).eq("id", row.id);
              if (error) { console.error("update status_jockey:", error); return; }
              row.status_jockey = val;
              await maybeMoveToEntregados(row);
            }, false));
          } else if (field === "status" && table === "en_sala" && (roles.admin || roles.cajero)) {
            td.appendChild(createDropdown(enSalaStatuses, row[field], async (val) => {
              const { error } = await supabase.from("en_sala").update({ status: val }).eq("id", row.id);
              if (error) { console.error("update status (en_sala):", error); return; }
              // Mover a 'recogiendo' si pasa a 'Falta book'
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
            td.appendChild(createTimeInput(row[field], async (val) => {
              const { error } = await supabase.from("en_sala").update({ promise_time: val }).eq("id", row.id);
              if (error) console.error("update promise_time:", error);
            }, false));
          } else if (field === "asignado" && table === "transportaciones" && (roles.admin || roles.transporte)) {
            td.appendChild(createTextInput(row[field], async (val) => {
              const { error } = await supabase.from("transportaciones").update({ asignado: val }).eq("id", row.id);
              if (error) console.error("update asignado:", error);
            }, false));
          } else {
            td.textContent = row[field] ?? "";
          }

          tr.appendChild(td);
        }

        // Parpadeo por tiempo / promise_time
        const cls = classifyBlink(row);
        tr.classList.remove("blink-yellow","blink-red");
        if (cls.blinkRed) tr.classList.add("blink-red");
        else if (cls.blinkYellow) tr.classList.add("blink-yellow");

        // Botón Eliminar en tablas operadas por Cajero/Admin, incluyendo en_sala
        const addDelete =
          (userRole === "Admin" || userRole === "Cajero") &&
          (table === "recogiendo" || table === "loaners" || table === "transportaciones" || table === "en_sala");
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

  // ===== Utilidades Autos Entregados (botones globales) =====
  async function deleteAllEntregados() {
    if (!confirm("¿Eliminar TODOS los Autos Entregados?")) return;
    try {
      const { error } = await supabase.from("autos_entregados").delete().neq("id", 0);
      if (error) throw error;
      await loadData();
      alert("Autos Entregados eliminados.");
    } catch (e) {
      console.error("deleteAllEntregados:", e);
      alert(`No se pudo borrar: ${e?.message || e}`);
    }
  }
  async function exportEntregadosCSV() {
    try {
      const { data, error } = await supabase.from("autos_entregados").select("*").order("id", { ascending: true });
      if (error) throw error;
      const rows = data || [];
      const headers = ["Tag","Modelo","Color","Asesor","Hora de Llegada","Hora de Salida","Tiempo de Espera (min)"];
      const csvLines = [headers.join(",")];
      for (const r of rows) {
        const line = [
          r.tag ?? "", r.modelo ?? "", r.color ?? "", r.asesor ?? "",
          r.hora_llegada ?? "", r.hora_salida ?? "", r.tiempo_espera_min ?? ""
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
        csvLines.push(line);
      }
      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autos_entregados.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("exportEntregadosCSV:", e);
      alert(`No se pudo exportar: ${e?.message || e}`);
    }
  }
  document.getElementById("btn-clear-entregados")?.addEventListener("click", deleteAllEntregados);
  document.getElementById("btn-export-entregados")?.addEventListener("click", exportEntregadosCSV);

  // ====== FORM INSERT ======
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
        // status_cajero por defecto "--"
        const payload = { hora, tag, modelo, color, asesor, descripcion, status_cajero: "--" };
        const { error } = await supabase.from("recogiendo").insert([payload]);
        if (error) throw error;
      } else if (proposito === "Waiter") {
        const payload = { hora, tag, modelo, color, asesor, descripcion, status: "Working" };
        const { error } = await supabase.from("en_sala").insert([payload]);
        if (error) throw error;
      } else if (proposito === "Loaner") {
        const nombre = document.getElementById("nombre")?.value?.trim() || null;
        const hora_cita = document.getElementById("hora_cita")?.value || null;
        const payload = { hora: (hora_cita || hora), nombre_cliente: nombre, descripcion };
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
