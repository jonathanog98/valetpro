// script.js — SIN rol "Waiter": VIN→Modelo (NHTSA) + permisos por matriz + delete + updates puntuales
let supabase = null;

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const ROLE = (sessionStorage.getItem('rol') || '').trim();
const USER = (sessionStorage.getItem('usuario') || '').trim();

// ===== Roles / Permisos (frontend) =====
// Admin y Cajero: ven TODAS las tablas (como en la matriz)
function canViewAllTables(role) {
  role = (role||'').toLowerCase();
  return role === 'admin' || role === 'cajero';
}
function allowedTablesForRole(role) {
  if (canViewAllTables(role)) return ['en_sala','recogiendo','loaners','transportaciones'];
  role = (role||'').toLowerCase();
  if (role === 'jockey') return ['recogiendo'];
  if (role === 'loaner' || role === 'loaners') return ['loaners'];
  if (role === 'transportación' || role === 'transportacion') return ['transportaciones'];
  // (No existe rol "Waiter"; solo Admin/Cajero acceden a en_sala)
  return [];
}
function canDelete(table, role) {
  role = (role||'').toLowerCase();
  // Borrar pickups en todas las tablas: Sí para Admin y Cajero (matriz)
  return role === 'admin' || role === 'cajero';
}
function canUpdateCajeroStatus(role) { role = (role||'').toLowerCase(); return role==='admin'||role==='cajero'; } // Recogiendo: status_cajero
function canUpdateJockeyStatus(role) { role = (role||'').toLowerCase(); return role==='admin'||role==='cajero'; } // Recogiendo: status_jockey
function canUpdatePromiseTime(role)   { role = (role||'').toLowerCase(); return role==='admin'||role==='cajero'; } // en_sala: promise_time
function canChangeAsignado(role)      { role = (role||'').toLowerCase(); return role==='admin'||role==='cajero'||role==='transportación'||role==='transportacion'; } // transportaciones: asignado
function canUpdateEnSalaStatus(role)  { role = (role||'').toLowerCase(); return role==='admin'||role==='cajero'; } // en_sala: status

const TABLE_BY_PURPOSE = {
  'recogiendo': 'recogiendo',
  'waiter': 'en_sala',              // opción del formulario puede existir, pero no hay rol "Waiter"
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
  vin:         () => `<label>VIN <input id="vin" maxlength="17" type="text" placeholder="17 caracteres"/></label>`,
  tag:         () => `<label>TAG <input id="tag" type="text"/></label>`,
  modelo:      () => `<label>Modelo <input id="modelo" type="text" placeholder="Se llena con VIN"/></label>`,
  color:       () => `<label>Color <input id="color" type="text"/></label>`,
  asesor:      () => `<label>Asesor <input id="asesor" type="text"/></label>`,
  descripcion: () => `<label>Descripción <input id="descripcion" type="text"/></label>`,
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

// ===== Supabase (lazy) =====
async function initSupabase(){
  if (supabase) return supabase;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  supabase = createClient('https://sqllpksunzuyzkzgmhuo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGxwa3N1bnp1eXpremdtaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjIzNjQsImV4cCI6MjA3MDgzODM2NH0.Oesm9_iFmdJRQORSWL2AQUy3ynQrQX7H0UY5YA2Ow7A');
  return supabase;
}
function fmtTime(ts){ try{ const d=new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }catch{return '—';} }

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
  }catch(e){ console.warn('VIN decode error:', e); modeloEl.value = 'ModeloDesconocido'; }
}

// ===== Render de formulario según rol/propósito =====
function renderFields(){
  const extra = $('#extra-fields'), proposito = $('#proposito');
  if (!extra || !proposito) return;
  // Limitar opciones del select por rol (en_sala solo Admin/Cajero)
  const allowed = new Set(allowedTablesForRole(ROLE));
  [...proposito.options].forEach(opt => {
    const t = TABLE_BY_PURPOSE[(opt.value||'').toLowerCase()];
    opt.disabled = !!t && !allowed.has(t);
  });
  if (proposito.selectedOptions[0]?.disabled) {
    const firstAllowed = [...proposito.options].find(o => !o.disabled);
    if (firstAllowed) proposito.value = firstAllowed.value;
  }
  // Campos
  extra.innerHTML = '';
  const key = (proposito.value||'').toLowerCase();
  (FIELDS_BY_PURPOSE[key]||[]).forEach(f => {
    const tpl = fieldTemplates[f];
    if (tpl) extra.insertAdjacentHTML('beforeend', tpl());
  });
  if (key==='recogiendo' || key==='waiter') { $('#vin')?.addEventListener('blur', decodeVinAndFill); }
}

// ===== Mostrar/Ocultar tableros por rol =====
function applyRoleVisibility(){
  const allowed = new Set(allowedTablesForRole(ROLE));
  const map = {
    'en_sala': $('#tabla-waiter')?.closest('.table-wrapper'),
    'recogiendo': $('#tabla-recogiendo')?.closest('.table-wrapper'),
    'loaners': $('#tabla-loaner')?.closest('.table-wrapper'),
    'transportaciones': $('#tabla-transporte')?.closest('.table-wrapper')
  };
  for (const [table, wrap] of Object.entries(map)) {
    if (!wrap) continue;
    wrap.style.display = allowed.has(table) ? '' : 'none';
  }
}

// ===== Helpers Update =====
async function updateField(table, id, patch){
  await initSupabase();
  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) alert('Error al actualizar: ' + (error.message || error));
}

// ===== SELECT + render por tabla (con botones según rol) =====
async function loadSala(){ await initSupabase(); const tb=$('#tabla-waiter tbody'); if(!tb) return; tb.innerHTML='';
  const {data,error}=await supabase.from('en_sala').select('*').order('created_at',{ascending:false}); if(error){console.error(error);return;}
  data.forEach(r=>{
    const canDel = canDelete('en_sala', ROLE);
    const canSts = canUpdateEnSalaStatus(ROLE);
    const canPrm = canUpdatePromiseTime(ROLE);
    tb.insertAdjacentHTML('beforeend',`<tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.tag??'—'}</td>
      <td>${r.modelo??'—'}</td>
      <td>${r.color??'—'}</td>
      <td>${r.asesor??'—'}</td>
      <td>${ canSts
          ? `<input data-table="en_sala" data-id="${r.id}" data-field="status" class="inp-status" value="${r.status??''}" />`
          : (r.status??'—') }
      </td>
      <td>${ canPrm
          ? `<input type="time" data-table="en_sala" data-id="${r.id}" data-field="promise_time" class="inp-time" value="${(r.promise_time||'').toString().slice(11,16)}" />`
          : (r.promise_time??'—') }
      </td>
      <td>${ canDel ? `<button class="btn-del" data-table="en_sala" data-id="${r.id}">Eliminar</button>` : '—' }</td>
    </tr>`);
  });
}

async function loadRecogiendo(){ await initSupabase(); const tb=$('#tabla-recogiendo tbody'); if(!tb) return; tb.innerHTML='';
  const {data,error}=await supabase.from('recogiendo').select('*').order('created_at',{ascending:false}); if(error){console.error(error);return;}
  data.forEach(r=>{
    const canDel = canDelete('recogiendo', ROLE);
    const canSC  = canUpdateCajeroStatus(ROLE);
    const canSJ  = canUpdateJockeyStatus(ROLE);
    tb.insertAdjacentHTML('beforeend',`<tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.tag??'—'}</td>
      <td>${r.modelo??'—'}</td>
      <td>${r.color??'—'}</td>
      <td>${r.asesor??'—'}</td>
      <td>${r.descripcion??'—'}</td>
      <td>${ canSC ? `<input data-table="recogiendo" data-id="${r.id}" data-field="status_cajero" class="inp-status" value="${r.status_cajero??''}" />` : (r.status_cajero??'—') }</td>
      <td>${ canSJ ? `<input data-table="recogiendo" data-id="${r.id}" data-field="status_jockey" class="inp-status" value="${r.status_jockey??''}" />` : (r.status_jockey??'—') }</td>
      <td>${ canDel ? `<button class="btn-del" data-table="recogiendo" data-id="${r.id}">Eliminar</button>` : '—' }</td>
    </tr>`);
  });
}

async function loadLoaner(){ await initSupabase(); const tb=$('#tabla-loaner tbody'); if(!tb) return; tb.innerHTML='';
  const {data,error}=await supabase.from('loaners').select('*').order('created_at',{ascending:false}); if(error){console.error(error);return;}
  data.forEach(r=>{
    const canDel = canDelete('loaners', ROLE);
    tb.insertAdjacentHTML('beforeend',`<tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.nombre??'—'}</td>
      <td>${r.hora_cita??'—'}</td>
      <td>${r.descripcion??'—'}</td>
      <td>${ canDel ? `<button class="btn-del" data-table="loaners" data-id="${r.id}">Eliminar</button>` : '—' }</td>
    </tr>`);
  });
}

async function loadTransportes(){ await initSupabase(); const tb=$('#tabla-transporte tbody'); if(!tb) return; tb.innerHTML='';
  const {data,error}=await supabase.from('transportaciones').select('*').order('created_at',{ascending:false}); if(error){console.error(error);return;}
  data.forEach(r=>{
    const canDel = canDelete('transportaciones', ROLE);
    const canAsg = canChangeAsignado(ROLE);
    tb.insertAdjacentHTML('beforeend',`<tr>
      <td>${fmtTime(r.created_at)}</td>
      <td>${r.nombre??'—'}</td>
      <td>${r.telefono??'—'}</td>
      <td>${r.direccion??'—'}</td>
      <td>${r.cantidad??'—'}</td>
      <td>${r.descripcion??'—'}</td>
      <td>${r.desea_recogido??'—'}</td>
      <td>${ canAsg ? `<input data-table="transportaciones" data-id="${r.id}" data-field="asignado" class="inp-asignado" value="${r.asignado??''}" />` : (r.asignado??'—') }</td>
      <td>${ canDel ? `<button class="btn-del" data-table="transportaciones" data-id="${r.id}">Eliminar</button>` : '—' }</td>
    </tr>`);
  });
}

// ===== Eventos: submit, delete, inline updates =====
async function handleSubmit(e){
  e.preventDefault();
  await initSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) { alert('Tu sesión no está activa. Inicia sesión.'); location.href='login.html'; return; }

  const proposito = $('#proposito');
  const purpose = (proposito?.value||'').toLowerCase();
  const table = TABLE_BY_PURPOSE[purpose];
  if (!table) return alert('Propósito no reconocido.');

  // Construir payload y NO enviar VIN a en_sala/recogiendo
  const fields = FIELDS_BY_PURPOSE[purpose] || [];
  const payload = {};
  fields.forEach(f=>{
    if ((table==='en_sala' || table==='recogiendo') && f==='vin') return;
    const el = document.getElementById(f);
    if (!el) return;
    let v = el.value?.trim();
    if (f==='cantidad' && v) v = parseInt(v,10);
    payload[f] = v || undefined;
  });

  // Validaciones para Transportación
  if (table==='transportaciones') {
    if (!payload.nombre) return alert('Nombre es requerido.');
    if (!payload.telefono) return alert('Teléfono es requerido.');
    if (!payload.direccion) return alert('Dirección es requerida.');
    if (!payload.cantidad || isNaN(payload.cantidad) || payload.cantidad<1) return alert('Cantidad debe ser un número ≥ 1.');
    if (!payload.descripcion) return alert('Descripción es requerida.');
    if (!payload.desea_recogido) return alert('Seleccione si desea recogido.');
  }

  const { error } = await supabase.from(table).insert([payload]);
  if (error) return alert('Error al guardar: ' + (error.message || error));

  alert(`Guardado correctamente en ${table}`);
  $('#pickup-form')?.reset(); renderFields();
  if (table==='en_sala') loadSala(); else if (table==='recogiendo') loadRecogiendo(); else if (table==='loaners') loadLoaner(); else if (table==='transportaciones') loadTransportes();
}

document.body.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.btn-del'); if(!btn) return;
  const table = btn.dataset.table, id = btn.dataset.id;
  if (!canDelete(table, ROLE)) return alert('No tienes permisos para eliminar.');
  if (!confirm('¿Eliminar este registro?')) return;
  await initSupabase();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return alert('No se pudo eliminar: ' + (error.message || error));
  if (table==='en_sala') loadSala(); else if (table==='recogiendo') loadRecogiendo(); else if (table==='loaners') loadLoaner(); else if (table==='transportaciones') loadTransportes();
});

document.body.addEventListener('change', async (e)=>{
  const inp = e.target;
  const table = inp?.dataset?.table;
  const id    = inp?.dataset?.id;
  const field = inp?.dataset?.field;
  if (!table || !id || !field) return;
  // permisos por campo
  if (table==='recogiendo' && field==='status_cajero' && !canUpdateCajeroStatus(ROLE)) return;
  if (table==='recogiendo' && field==='status_jockey' && !canUpdateJockeyStatus(ROLE)) return;
  if (table==='en_sala' && field==='status' && !canUpdateEnSalaStatus(ROLE)) return;
  if (table==='en_sala' && field==='promise_time' && !canUpdatePromiseTime(ROLE)) return;
  if (table==='transportaciones' && field==='asignado' && !canChangeAsignado(ROLE)) return;
  await updateField(table, id, { [field]: inp.value });
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  applyRoleVisibility();
  renderFields();
  $('#proposito')?.addEventListener('change', renderFields);
  $('#pickup-form')?.addEventListener('submit', handleSubmit);

  const allowed = new Set(allowedTablesForRole(ROLE));
  if (allowed.has('en_sala')) loadSala();
  if (allowed.has('recogiendo')) loadRecogiendo();
  if (allowed.has('loaners')) loadLoaner();
  if (allowed.has('transportaciones')) loadTransportes();
});
