// script.js
// - Render dinámico de campos por propósito
// - Inserción en tabla por propósito
// - LECTURA y render de tableros desde Supabase
// - Logout
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://sqllpksunzuyzkzgmhuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (sel) => document.querySelector(sel);
const valueOf = (sel) => ($(sel) ? $(sel).value?.trim() : undefined);

const TABLE_BY_PURPOSE = {
  'recogiendo': 'recogiendo',
  'waiter': 'en_sala',            // Clientes en sala
  'loaner': 'loaners',
  'transportación': 'transportaciones',
  'transportacion': 'transportaciones'
};

const FIELDS_BY_PURPOSE = {
  'recogiendo': ['vin','tag','modelo','color','asesor','descripcion'],
  'waiter': ['vin','tag','modelo','color','asesor','descripcion'],
  'loaner': ['nombre','hora_cita','descripcion'],
  'transportación': ['nombre','telefono','direccion','cantidad','descripcion','desea_recogido'],
  'transportacion': ['nombre','telefono','direccion','cantidad','descripcion','desea_recogido']
};

const fieldTemplates = {
  vin:       () => `<label>VIN <input id="vin" maxlength="17" type="text"/></label>`,
  tag:       () => `<label>TAG <input id="tag" type="text"/></label>`,
  modelo:    () => `<label>Modelo <input id="modelo" type="text"/></label>`,
  color:     () => `<label>Color <input id="color" type="text"/></label>`,
  asesor:    () => `<label>Asesor <input id="asesor" type="text"/></label>`,
  descripcion:() => `<label>Descripción <input id="descripcion" type="text"/></label>`,

  nombre:    () => `<label>Nombre <input id="nombre" type="text"/></label>`,
  telefono:  () => `<label>Teléfono <input id="telefono" type="tel"/></label>`,
  direccion: () => `<label>Dirección <input id="direccion" type="text"/></label>`,
  cantidad:  () => `<label>Cantidad <input id="cantidad" type="number" min="1" step="1"/></label>`,
  hora_cita: () => `<label>Hora de la Cita <input id="hora_cita" type="time"/></label>`,
  desea_recogido: () => `
    <label>¿Desea recogido?
      <select id="desea_recogido">
        <option value="">Seleccione...</option>
        <option value="Sí">Sí</option>
        <option value="No">No</option>
      </select>
    </label>`
};

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  } catch { return '—'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#pickup-form');
  const proposito = $('#proposito');
  const extra = $('#extra-fields');
  const btnLogout = $('#btn-logout');

  // ===== Render dinámico por propósito =====
  const renderFields = () => {
    if (!extra) return;
    extra.innerHTML = '';
    const key = (proposito?.value || '').toLowerCase();
    const fields = FIELDS_BY_PURPOSE[key] || [];
    fields.forEach(f => {
      const tpl = fieldTemplates[f];
      if (tpl) extra.insertAdjacentHTML('beforeend', tpl());
    });

    // Hook VIN blur si aplica (decodificador externo)
    if (key === 'recogiendo' || key === 'waiter') {
      setTimeout(() => {
        const vinEl = $('#vin');
        if (vinEl && typeof window.handleVinBlur === 'function') {
          vinEl.addEventListener('blur', window.handleVinBlur);
        }
      }, 0);
    }
  };

  proposito?.addEventListener('change', renderFields);
  renderFields();

  // ===== Envío de formulario (INSERT) =====
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const purpose = (proposito.value || '').toLowerCase();
    const table = TABLE_BY_PURPOSE[purpose];
    if (!table) return alert('Propósito no reconocido.');

    const payload = {};
    (FIELDS_BY_PURPOSE[purpose] || []).forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;
      let val = el.value?.trim();
      if (f === 'cantidad' && val) val = parseInt(val, 10);
      payload[f] = val || undefined;
    });

    // Validaciones mínimas para Transportación
    if (table === 'transportaciones') {
      if (!payload.nombre) return alert('Nombre es requerido.');
      if (!payload.telefono) return alert('Teléfono es requerido.');
      if (!payload.direccion) return alert('Dirección es requerida.');
      if (!payload.cantidad || isNaN(payload.cantidad) || payload.cantidad < 1) {
        return alert('Cantidad debe ser un número >= 1.');
      }
      if (!payload.descripcion) return alert('Descripción es requerida.');
      if (!payload.desea_recogido) return alert('Seleccione si desea recogido.');
    }

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      const { error } = await supabase.from(table).insert([payload]);
      if (error) throw error;
      alert(`Guardado correctamente en ${table}`);
      form.reset();
      renderFields();
      // Recargar tablero específico
      if (table === 'en_sala') loadSala();
      else if (table === 'recogiendo') loadRecogiendo();
      else if (table === 'loaners') loadLoaner();
      else if (table === 'transportaciones') loadTransportes();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err?.message || err));
    }
  });

  // ===== Logout =====
  btnLogout?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });

  // ===== Carga inicial de tableros (SELECT) =====
  loadSala();
  loadRecogiendo();
  loadLoaner();
  loadTransportes();
});

// =====================
// Render: Clientes en Sala (en_sala)
// =====================
async function loadSala() {
  const tbody = document.querySelector('#tabla-waiter tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const { data, error } = await supabase
    .from('en_sala')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatTime(row.created_at)}</td>
      <td>${row.tag ?? '—'}</td>
      <td>${row.modelo ?? '—'}</td>
      <td>${row.color ?? '—'}</td>
      <td>${row.asesor ?? '—'}</td>
      <td>${row.descripcion ?? '—'}</td>
      <td>${row.status ?? '—'}</td>
      <td>${row.promise_time ?? '—'}</td>
      <td>
        <button data-id="${row.id}" class="btn-accion" disabled>—</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =====================
// Render: Recogiendo
// =====================
async function loadRecogiendo() {
  const tbody = document.querySelector('#tabla-recogiendo tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const { data, error } = await supabase
    .from('recogiendo')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatTime(row.created_at)}</td>
      <td>${row.tag ?? '—'}</td>
      <td>${row.modelo ?? '—'}</td>
      <td>${row.color ?? '—'}</td>
      <td>${row.asesor ?? '—'}</td>
      <td>${row.descripcion ?? '—'}</td>
      <td>${row.status_cajero ?? '—'}</td>
      <td>${row.status_jockey ?? '—'}</td>
      <td>
        <button data-id="${row.id}" class="btn-accion" disabled>—</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =====================
// Render: Loaner (loaners)
// =====================
async function loadLoaner() {
  const tbody = document.querySelector('#tabla-loaner tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const { data, error } = await supabase
    .from('loaners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatTime(row.created_at)}</td>
      <td>${row.nombre ?? '—'}</td>
      <td>${row.hora_cita ?? '—'}</td>
      <td>${row.descripcion ?? '—'}</td>
      <td>
        <button data-id="${row.id}" class="btn-accion" disabled>—</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatTime(row.created_at)}</td>
      <td>${row.nombre ?? '—'}</td>
      <td>${row.descripcion ?? '—'}</td>
      <td>
        <button data-id="${row.id}" class="btn-accion" disabled>—</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =====================
// Render: Transportación (transportaciones)
// =====================
async function loadTransportes() {
  const tbody = document.querySelector('#tabla-transporte tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const { data, error } = await supabase
    .from('transportaciones')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatTime(row.created_at)}</td>
      <td>${row.nombre ?? '—'}</td>
      <td>${row.telefono ?? '—'}</td>
      <td>${row.direccion ?? '—'}</td>
      <td>${row.cantidad ?? '—'}</td>
      <td>${row.descripcion ?? '—'}</td>
      <td>${row.desea_recogido ?? '—'}</td>
      <td>${row.asignado ?? '—'}</td>
      <td>
        <button data-id="${row.id}" class="btn-accion" disabled>—</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
