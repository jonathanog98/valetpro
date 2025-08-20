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
  'Recogiendo': ['vin','tag','modelo','color','asesor','descripcion'],
  'En sala':    ['vin','tag','modelo','color','asesor','descripcion','promise_time'],
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
  $('#proposito')?.addEventListener('change', renderFields);
  $('#pickup-form')?.addEventListener('submit', handleSubmit);
  renderFields(); // Render inicial
});
