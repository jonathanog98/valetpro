
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const { data: { user } } = await supabase.auth.getUser();
  
async function updateEnSala(id, field, value) {
  const { error } = await supabase.from('en_sala').update({ [field]: value }).eq('id', id);
  if (error) console.error('Error actualizando en_sala:', error.message);
}


const role = sessionStorage.getItem('rol');

  // Registro de evento de formulario
  document.getElementById('pickup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const proposito = $('proposito')?.value;
    const horaActual = new Date().toISOString();
    let data = { user_id: user.id, hora: horaActual };
    let tablaDestino = '';

    switch (proposito) {
      case 'Recogiendo':
        tablaDestino = 'recogiendo';
        data = {
          tag: $('tag')?.value,
          modelo: $('modelo')?.value,
          color: $('color')?.value,
          asesor: $('asesor')?.value,
          descripcion: $('descripcion')?.value,
          user_id: user.id,
          hora: horaActual
        };
        break;
      case 'Waiter':
        tablaDestino = 'en_sala';
        data = {
          tag: $('tag')?.value,
          modelo: $('modelo')?.value,
          color: $('color')?.value,
          asesor: $('asesor')?.value,
          descripcion: $('descripcion')?.value,
          user_id: user.id,
          hora: horaActual
        };
        break;
      case 'Loaner':
        tablaDestino = 'loaners';
        data = {
          nombre: $('nombre')?.value,
          hora_cita: $('hora_cita')?.value,
          user_id: user.id,
          hora: horaActual
        };
        break;
      case 'Transportación':
        tablaDestino = 'transportaciones';
        data = {
          nombre: $('nombre')?.value,
          telefono: $('telefono')?.value,
          direccion: $('direccion')?.value,
          personas: parseInt($('personas')?.value, 10) || 0,
          descripcion: $('descripcion')?.value,
          user_id: user.id,
          hora: horaActual
        };
        break;
      default:
        return;
    }

    const { error } = await supabase.from(tablaDestino).insert([data]);
    if (error) {
      console.warn('Error al insertar:', error.message);
    } else {
      console.log('Pickup agregado');
      location.reload();
    }
  });

  window.handleVinBlur = async function () {
    const vinInput = document.getElementById('vin');
    if (!vinInput) return;
    const vin = vinInput.value;
    if (vin?.length !== 17) return;

    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
      const data = await response.json();
      const modelo = data?.Results?.[0]?.Model || '';
      const modeloInput = document.getElementById('modelo');
      if (modeloInput) modeloInput.value = modelo;
    } catch (err) {
      console.error('Error al decodificar VIN:', err);
    }
  };

  loadRecogiendo();
  loadEnSala();
  loadLoaners();
  loadTransportacion();
});

function formatHora(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}


async function updateEnSala(id, field, value) {
  const { error } = await supabase.from('en_sala').update({ [field]: value }).eq('id', id);
  if (error) console.error('Error actualizando en_sala:', error.message);
}


const role = sessionStorage.getItem('rol');

async function updateRecogiendoStatus(id, field, value) {
  const { error } = await supabase.from('recogiendo').update({ [field]: value }).eq('id', id);
  if (error) console.error('Error actualizando recogiendo:', error.message);
}

async function updateTransportacionAsignado(id, value) {
  const { error } = await supabase.from('transportaciones').update({ asignado: value }).eq('id', id);
  if (error) console.error('Error actualizando transportación:', error.message);
}

async function loadRecogiendo() {
  const { data, error } = await supabase.from('recogiendo').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-recogiendo tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const statusCajero = (role === 'Cajero' || role === 'Admin') ? `
      <select onchange="updateRecogiendoStatus('{row.id}', 'status_cajero', this.value')">
<option value="">—</option>
<option value="Complete">{row.status_cajero === "Complete" ? "selected" : ""}Complete</option>
<option value="Dudas">{row.status_cajero === "Dudas" ? "selected" : ""}Dudas</option>
<option value="En Camino">{row.status_cajero === "En Camino" ? "selected" : ""}En Camino</option>
<option value="Falta book">{row.status_cajero === "Falta book" ? "selected" : ""}Falta book</option>
<option value="Grua">{row.status_cajero === "Grua" ? "selected" : ""}Grua</option>
<option value="Inspección">{row.status_cajero === "Inspección" ? "selected" : ""}Inspección</option>
<option value="Lav. Cortesía">{row.status_cajero === "Lav. Cortesía" ? "selected" : ""}Lav. Cortesía</option>
<option value="Llaves a asesor">{row.status_cajero === "Llaves a asesor" ? "selected" : ""}Llaves a asesor</option>
<option value="Llevar a taller">{row.status_cajero === "Llevar a taller" ? "selected" : ""}Llevar a taller</option>
<option value="No ha pagado">{row.status_cajero === "No ha pagado" ? "selected" : ""}No ha pagado</option>
<option value="Pert">{row.status_cajero === "Pert" ? "selected" : ""}Pert</option>
<option value="Poner a Cargar">{row.status_cajero === "Poner a Cargar" ? "selected" : ""}Poner a Cargar</option>
<option value="Se va sin docs">{row.status_cajero === "Se va sin docs" ? "selected" : ""}Se va sin docs</option>
<option value="Test Drive">{row.status_cajero === "Test Drive" ? "selected" : ""}Test Drive</option>
<option value="Tiene Doc">{row.status_cajero === "Tiene Doc" ? "selected" : ""}Tiene Doc</option>
<option value="Valet">{row.status_cajero === "Valet" ? "selected" : ""}Valet</option>
</select>
        <option value="">—</option>
        <option value="Abierto" ${row.status_cajero === 'Abierto' ? 'selected' : ''}>Abierto</option>
        <option value="Pagado" ${row.status_cajero === 'Pagado' ? 'selected' : ''}>Pagado</option>
      </select>` : (row.status_cajero || '—');

    const statusJockey = (role === 'Jockey' || role === 'Admin') ? `
      <select onchange="updateRecogiendoStatus('{row.id}', 'status_jockey', this.value')">
<option value="">—</option>
<option value="Arriba">{row.status_jockey === "Arriba" ? "selected" : ""}Arriba</option>
<option value="Detailing">{row.status_jockey === "Detailing" ? "selected" : ""}Detailing</option>
<option value="Lavado">{row.status_jockey === "Lavado" ? "selected" : ""}Lavado</option>
<option value="No lavar">{row.status_jockey === "No lavar" ? "selected" : ""}No lavar</option>
<option value="Secado">{row.status_jockey === "Secado" ? "selected" : ""}Secado</option>
<option value="Subiendo">{row.status_jockey === "Subiendo" ? "selected" : ""}Subiendo</option>
<option value="Ubicada">{row.status_jockey === "Ubicada" ? "selected" : ""}Ubicada</option>
<option value="Working">{row.status_jockey === "Working" ? "selected" : ""}Working</option>
<option value="Zona Blanca">{row.status_jockey === "Zona Blanca" ? "selected" : ""}Zona Blanca</option>
</select>
        <option value="">—</option>
        <option value="Pendiente" ${row.status_jockey === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="En camino" ${row.status_jockey === 'En camino' ? 'selected' : ''}>En camino</option>
        <option value="Entregado" ${row.status_jockey === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>` : (row.status_jockey || '—');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHora(row.hora)}</td>
      <td>${row.tag || ''}</td>
      <td>${row.modelo || ''}</td>
      <td>${row.color || ''}</td>
      <td>${row.asesor || ''}</td>
      <td>${row.descripcion || ''}</td>
      <td>${statusCajero}</td>
      <td>${statusJockey}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });
}

async function loadEnSala() {
  const { data, error } = await supabase.from('en_sala').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-waiter tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHora(row.hora)}</td>
      <td>${row.tag || ''}</td>
      <td>${row.modelo || ''}</td>
      <td>${row.color || ''}</td>
      <td>${row.asesor || ''}</td>
      <td>${row.descripcion || ''}</td>
      <td>${
        (role === 'Admin') ? `<input type="text" value="${row.status || ''}" onchange="updateEnSala('${row.id}', 'status', this.value)" />` : (row.status || '-')
      }</td>
      <td>${
        (role === 'Admin') ? `<input type="text" value="${row.promise_time || ''}" onchange="updateEnSala('${row.id}', 'promise_time', this.value)" />` : (row.promise_time || '-')
      }</td>`;
    tbody.appendChild(tr);
  });
}

async function loadLoaners() {
  const { data, error } = await supabase.from('loaners').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-loaner tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHora(row.hora)}</td>
      <td>${row.nombre || ''}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });
}

async function loadTransportacion() {
  const { data, error } = await supabase.from('transportaciones').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-transporte tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const asignadoEditable = (role === 'Transportación' || role === 'Admin') ? `
      <input type="text" value="${row.asignado || ''}" onchange="updateTransportacionAsignado('${row.id}', this.value)" />
    ` : (row.asignado || '—');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHora(row.hora)}</td>
      <td>${row.nombre || ''}</td>
      <td>${row.telefono || ''}</td>
      <td>${row.direccion || ''}</td>
      <td>${row.personas || ''}</td>
      <td>${asignadoEditable}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });
}
