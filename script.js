// script.js — Formulario siempre visible + VIN→Modelo + inserción a tablas por propósito
let supabase = null;

// ===== Helpers DOM =====
const $  = (sel) => document.querySelector(sel);

// ===== Mapas por propósito (claves EXACTAS como en index.html) =====
const TABLE_BY_PURPOSE = {
  'Recogiendo': 'recogiendo',
  'En sala': 'en_sala',
  'Loaner': 'loaners',
  'Transportación': 'transportaciones'
};

const FIELDS_BY_PURPOSE = {
  'Recogiendo': ['tag','vin','modelo','color','asesor','descripcion'],
  'En sala':    ['tag','vin','modelo','color','asesor','descripcion','promise_time'],
  'Loaner':     ['nombre','hora_cita','descripcion'],
  'Transportación': ['nombre','telefono','direccion','cantidad','descripcion','desea_recogido']
};

// Plantillas de campos
const fieldTemplates = {
  vin:         () => `<label>VIN <input id="vin" maxlength="17" type="text" placeholder="17 caracteres"/></label>`,
  tag:         () => `<label>TAG <input id="tag" type="text"/></label>`,
  modelo:      () => `<label>Modelo <input id="modelo" type="text" placeholder="Se llena con VIN"/></label>`,
  color:       () => `<label>Color <input id="color" type="text"/></label>`,
  asesor:      () => `<label>Asesor <input id="asesor" type="text"/></label>`,
  descripcion: () => `<label>Descripción <input id="descripcion" type="text"/></label>`,

  promise_time:() => `<label>Promise Time <input id="promise_time" type="time"/></label>`,

  nombre:      () => `<label>Nombre <input id="nombre" type="text"/></label>`,
  telefono:    () => `<label>Teléfono <input id="telefono" type="tel"/></label>`,
  direccion:   () => `<label>Dirección <input id="direccion" type="text"/></label>`,
  cantidad:    () => `<label>Cantidad <input id="cantidad" type="number" min="1" step="1"/></label>`,
  hora_cita:   () => `<label>Hora de la Cita <input id="hora_cita" type="time"/></label>`,

  desea_recogido: () => `
    <label>¿Desea recogido?
      <select id="desea_recogido">
        <option value="">Seleccione...</option>
        <option value="Sí">Sí</option>
        <option value="No">No</option>
      </select>
    </label>`
};

// ===== Supabase init (usa tu URL y ANON KEY) =====
async function initSupabase(){
  if (supabase) return supabase;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A';
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ===== VIN decoder (NHTSA) =====
async function decodeVinAndFill(){
  const vinEl = $('#vin'), modeloEl = $('#modelo');
  if (!vinEl || !modeloEl) return;
  const vin = vinEl.value.trim();
  if (vin.length < 11) return;
  try{
    const resp = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`);
    const data = await resp.json();
    const modelo = data?.Results?.[0]?.Model || '';
    modeloEl.value = modelo || 'ModeloDesconocido';
  }catch(e){
    console.warn('VIN decode error:', e);
    $('#modelo').value = 'ModeloDesconocido';
  }
}

// ===== Render dinámico del formulario =====
function renderFields(){
  const extra = $('#extra-fields');
  const proposito = $('#proposito');
  if (!extra || !proposito) return;

  extra.innerHTML = '';
  const key = proposito.value;
  const fields = FIELDS_BY_PURPOSE[key] || [];

  fields.forEach(f => {
    const tpl = fieldTemplates[f];
    if (tpl) extra.insertAdjacentHTML('beforeend', tpl());
  });

  if (key==='Recogiendo' || key==='En sala') {
    $('#vin')?.addEventListener('blur', decodeVinAndFill);
  }
}

// ===== Submit: inserta en la tabla correcta =====
async function handleSubmit(e){
  e.preventDefault();
  await initSupabase();

  // Validar sesión de Supabase (si usas auth)
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      // Si no usas auth, puedes comentar estas 2 líneas
      alert('Tu sesión no está activa. Inicia sesión.');
      location.href = 'login.html';
      return;
    }
  } catch {
    // Si no tienes auth configurado, no bloquees el submit
  }

  const proposito = $('#proposito');
  const table = TABLE_BY_PURPOSE[proposito.value];
  if (!table) { alert('Seleccione un propósito válido.'); return; }

  const fields = FIELDS_BY_PURPOSE[proposito.value] || [];
  const payload = {};

  fields.forEach(f => {
    // En en_sala/recogiendo NO guardamos VIN, solo lo usamos para autocompletar modelo
    if ((table==='en_sala' || table==='recogiendo') && f==='vin') return;
    const el = document.getElementById(f);
    if (!el) return;
    let v = el.value?.trim?.() ?? el.value ?? '';
    if (f==='cantidad' && v) v = parseInt(v,10);
    payload[f] = v || null;
  });

  // Validaciones mínimas por propósito
  if (table==='transportaciones') {
    if (!payload.nombre) return alert('Nombre es requerido.');
    if (!payload.telefono) return alert('Teléfono es requerido.');
    if (!payload.direccion) return alert('Dirección es requerida.');
    if (!payload.cantidad || isNaN(payload.cantidad) || payload.cantidad<1) return alert('Cantidad debe ser un número ≥ 1.');
    if (!payload.descripcion) return alert('Descripción es requerida.');
    if (!payload.desea_recogido) return alert('Seleccione si desea recogido.');
  }

  const { error } = await supabase.from(table).insert([payload]);
  if (error) { alert('Error al guardar: ' + (error.message || error)); return; }

  alert(`Guardado correctamente en ${table}`);
  $('#pickup-form')?.reset();
  renderFields();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  cargarPickupsDesdeSupabase();
  $('#proposito')?.addEventListener('change', renderFields);
  $('#pickup-form')?.addEventListener('submit', handleSubmit);
  renderFields(); // Render inicial
});



async function cargarPickupsDesdeSupabase() {
  await initSupabase();
  const propKeys = Object.keys(TABLE_BY_PURPOSE);

  for (const key of propKeys) {
    const table = TABLE_BY_PURPOSE[key];
    const { data, error } = await supabase.from(table).select('*');
    if (error || !data) continue;

    data.forEach(item => {
      const row = document.createElement('tr');
      const hora = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

      if (table === 'recogiendo') {
        row.innerHTML = `
          <td>${hora}</td>
          <td>${item.tag || ''}</td>
          <td>${item.modelo || ''}</td>
          <td>${item.color || ''}</td>
          <td>${item.asesor || ''}</td>
          <td>${item.descripcion || ''}</td>
          <td>
            <select class="status-cajero">
              <option>—</option>
              <option ${item.status_cajero==='Complete'?'selected':''}>Complete</option>
              <option>Tiene Doc.</option><option>No ha pagado</option>
              <option>Falta Book</option><option>En Camino</option><option>Pert.</option>
              <option>Dudas</option><option>Se va sin docs.</option><option>Llaves a asesor</option>
              <option>Test Drive</option><option>Lav. Cortesía</option><option>Llevar a taller</option>
              <option>Inspección</option><option>Valet</option><option>Poner a cargar</option><option>Grúa</option>
            </select>
          </td>
          <td>
            <select class="status-jockey">
              <option>—</option>
              <option ${item.status_jockey==='Arriba'?'selected':''}>Arriba</option>
              <option>Subiendo</option><option>Lavado</option>
              <option>Working</option><option>No Lavar</option><option>Taller</option>
              <option>Secado</option><option>Ubicada</option><option>Detailing</option><option>Zona Blanca</option>
            </select>
          </td>
          <td><button class="btn-delete" data-id="${item.id}" data-table="${table}">Eliminar</button></td>
        `;
        $('#tabla-recogiendo tbody')?.appendChild(row);
      }

      else if (table === 'en_sala') {
        row.innerHTML = `
          <td>${hora}</td>
          <td>${item.tag || ''}</td>
          <td>${item.modelo || ''}</td>
          <td>${item.color || ''}</td>
          <td>${item.asesor || ''}</td>
          <td>${item.descripcion || ''}</td>
          <td>
            <select class="status-general">
              <option>—</option>
              <option>Falta Book</option><option>Status asesor</option>
              <option>Cargando</option><option>Complete</option>
              <option>Grúa</option><option>Call Center</option>
            </select>
          </td>
          <td>${item.promise_time || ''}</td>
          <td><button class="btn-delete" data-id="${item.id}" data-table="${table}">Eliminar</button></td>
        `;
        $('#tabla-waiter tbody')?.appendChild(row);
      }

      else if (table === 'loaners') {
        row.innerHTML = `
          <td>${hora}</td>
          <td>${item.nombre || ''}</td>
          <td>${item.hora_cita || ''}</td>
          <td>${item.descripcion || ''}</td>
          <td><button class="btn-delete" data-id="${item.id}" data-table="${table}">Eliminar</button></td>
        `;
        $('#tabla-loaner tbody')?.appendChild(row);
      }

      else if (table === 'transportaciones') {
        row.innerHTML = `
          <td>${hora}</td>
          <td>${item.nombre || ''}</td>
          <td>${item.telefono || ''}</td>
          <td>${item.direccion || ''}</td>
          <td>${item.cantidad || ''}</td>
          <td>${item.descripcion || ''}</td>
          <td>${item.desea_recogido || ''}</td>
          <td>—</td>
          <td><button class="btn-delete" data-id="${item.id}" data-table="${table}">Eliminar</button></td>
        `;
        $('#tabla-transporte tbody')?.appendChild(row);
      }
    });
  }
}

// === Parche mínimo: submit del formulario por Propósito ==================
(function () {
  const $ = (id) => document.getElementById(id);

  function tableByPurpose(p) {
    if (p === 'Recogiendo') return 'recogiendo';
    if (p === 'En sala')    return 'en_sala';         // Clientes en Sala (antes Waiter)
    if (p === 'Loaner')     return 'loaners';
    if (p === 'Transportación') return 'transportaciones';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const proposito = $('proposito')?.value || '';
    const table = tableByPurpose(proposito);
    if (!table) {
      alert('Selecciona un propósito válido.');
      return;
    }

    let payload = {};
    if (proposito === 'Recogiendo' || proposito === 'En sala') {
      const tag    = $('tag')?.value?.trim() || '';
      const modelo = $('modelo')?.value?.trim() || '';
      const color  = $('color')?.value?.trim() || '';
      const asesor = $('asesor')?.value?.trim() || '';
      const desc   = $('descripcion')?.value?.trim() || '';

      if (proposito === 'Recogiendo') {
        payload = {
          hora: currentHour,
          tag, modelo, color, asesor,
          descripcion: desc,
          status_cajero: '--',
          status_jockey: '--'
        };
      } else {
        payload = {
          hora: currentHour,
          tag, modelo, color, asesor,
          descripcion: desc,
          status: '--',
          promise_time: null
        };
      }
    }

    if (proposito === 'Loaner') {
      const nombre    = $('nombre')?.value?.trim() || '';
      const hora_cita = $('hora_cita')?.value || null;
      const desc      = $('descripcion')?.value?.trim() || '';
      payload = { nombre_cliente: nombre, hora_cita, descripcion: desc };
    }

    if (proposito === 'Transportación') {
      const nombre    = $('nombre')?.value?.trim() || '';
      const telefono  = $('telefono')?.value?.trim() || '';
      const direccion = $('direccion')?.value?.trim() || '';
      const cantidad  = Number($('cantidad')?.value || 1);
      const desc      = $('descripcion')?.value?.trim() || '';
      const desea     = !!$('desea-regreso')?.checked;
      payload = {
        nombre, telefono, direccion, cantidad,
        descripcion: desc,
        desea_recogido: desea
      };
    }

    try {
      const { data, error } = await supabase.from(table).insert([payload]).select();
      if (error) {
        console.error('Insert error:', error);
        alert('No se pudo guardar: ' + (error.message || 'Error desconocido'));
        return;
      }
      const inputs = document.querySelectorAll('#extra-fields input, #extra-fields textarea');
      inputs.forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });
    } catch (err) {
      console.error(err);
      alert('Error inesperado insertando.');
    }
  }

  function bindForm() {
    const form = document.getElementById('pickup-form');
    if (form && !form.__vp_submitBound) {
      form.addEventListener('submit', handleSubmit);
      form.__vp_submitBound = true;
    }
  }

  document.addEventListener('DOMContentLoaded', bindForm);
  const mo = new MutationObserver(bindForm);
  mo.observe(document.body, { childList: true, subtree: true });
})();
// === Fin parche mínimo ===================================================

// === Parche mínimo: refresco inmediato + Realtime ========================
(function () {
  function refreshAfterInsert(table) {
    try {
      // Llama a funciones existentes si están definidas
      if (typeof window.cargarRecogiendo === 'function' && table === 'recogiendo') {
        return window.cargarRecogiendo();
      }
      if (typeof window.cargarSala === 'function' && table === 'en_sala') {
        return window.cargarSala();
      }
      if (typeof window.cargarLoaners === 'function' && table === 'loaners') {
        return window.cargarLoaners();
      }
      if (typeof window.cargarTransportaciones === 'function' && table === 'transportaciones') {
        return window.cargarTransportaciones();
      }

      // Si no existen loaders, reconsulta y hace un append rápido
      // (fallback ultra simple: recargar la página para ver la data al instante)
      console.warn('No hay loaders específicos; recargando la página…');
      setTimeout(() => location.reload(), 150);
    } catch (e) {
      console.error('Error al refrescar tablero:', e);
    }
  }

  // Hook al insert ya existente: intercepta alert/limpieza y añade refresh
  (function injectIntoSubmit() {
    try {
      const form = document.getElementById('pickup-form');
      if (!form) return;
      if (!form.__vp_submitHooked) {
        form.addEventListener('submit', function () {
          // Enlazamos un listener de una sola vez para el próximo console log del insert
          const _log = console.log;
          console.log = function () {
            try {
              const args = Array.from(arguments);
              if (args && args[0] && typeof args[0] === 'string' && args[0].includes('Insert OK:')) {
                const table = args[1];
                refreshAfterInsert(table);
              }
            } catch (_) {}
            _log.apply(console, arguments);
          };
        }, { once: true });
        form.__vp_submitHooked = true;
      }
    } catch (_) {}
  })();

  // Exponer un helper para el bloque de submit original (si lo quieres usar):
  window.__vp_afterInsert = function (table) {
    console.log('Insert OK:', table);
    refreshAfterInsert(table);
  };

  // Realtime en vivo (si supabase está disponible)
  // Convertido a versión asíncrona segura (sin await a nivel top)
  ;(async function setupRealtimeSafe() {
    try {
      if (typeof window.supabase === 'undefined') return;
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user || null;

      // Exponer refresh para uso global si no existe
      if (typeof window.__vp_refreshAfterInsert !== 'function') {
        window.__vp_refreshAfterInsert = function (tbl) {
          try {
            if (typeof window.cargarRecogiendo === 'function' && tbl === 'recogiendo') return window.cargarRecogiendo();
            if (typeof window.cargarSala === 'function' && tbl === 'en_sala') return window.cargarSala();
            if (typeof window.cargarLoaners === 'function' && tbl === 'loaners') return window.cargarLoaners();
            if (typeof window.cargarTransportaciones === 'function' && tbl === 'transportaciones') return window.cargarTransportaciones();
            setTimeout(() => location.reload(), 150);
          } catch (e) { console.error(e); }
        };
      }

      const channel = supabase.channel('valetpro-realtime');
      ['recogiendo','en_sala','loaners','transportaciones'].forEach(tbl => {
        channel.on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: tbl },
          () => window.__vp_refreshAfterInsert(tbl)
        );
      });
      channel.subscribe();
    } catch (e) {
      console.warn('Realtime no disponible aún:', e?.message || e);
    }
  })();
// === Fin parche refresco + realtime =====================================
