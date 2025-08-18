// Adds inline editing to tablero rows based on user role
const role = sessionStorage.getItem('rol');

async function updateRecogiendoStatus(id, field, value) {
  const { error } = await supabase
    .from('recogiendo')
    .update({ [field]: value })
    .eq('id', id);
  if (error) {
    console.error('Error actualizando recogiendo:', error.message);
  } else {
    console.log(`Actualizado ${field} a ${value} para ID ${id}`);
  }
}

async function updateTransportacionAsignado(id, value) {
  const { error } = await supabase
    .from('transportaciones')
    .update({ asignado: value })
    .eq('id', id);
  if (error) {
    console.error('Error actualizando asignado:', error.message);
  } else {
    console.log(`Asignado actualizado para transporte ID ${id}`);
  }
}


import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  document.getElementById('pickup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
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
        console.warn('Propósito inválido');
        return;
    }

    console.log('Datos a insertar:', data);
    const { error } = await supabase.from(tablaDestino).insert([data]);

    if (error) {
      console.warn('Error al insertar:', error.message);
    } else {
      console.log('Pickup agregado con éxito');
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
      const modelo = data?.Results?.[0]?.Model || 'ModeloDesconocido';
      const modeloInput = document.getElementById('modelo');
      if (modeloInput) modeloInput.value = modelo;
    } catch (err) {
      console.error('Error al decodificar VIN:', err);
    }
  };

  // Cargar datos a tableros
  loadRecogiendo();
  loadEnSala();
  loadLoaners();
  loadTransportacion();
});

// Funciones para cargar tableros (sin cambios mayores)

const { data, error } = await supabase.from('recogiendo').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-recogiendo tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    const statusCajero = role === 'Cajero' || role === 'Admin' ? `
      <select onchange="updateRecogiendoStatus('${row.id}', 'status_cajero', this.value)">
        <option value="">—</option>
        <option value="Pendiente" ${row.status_cajero === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="Entregado" ${row.status_cajero === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>` : row.status_cajero || '—';

    const statusJockey = role === 'Jockey' || role === 'Admin' ? `
      <select onchange="updateRecogiendoStatus('${row.id}', 'status_jockey', this.value)">
        <option value="">—</option>
        <option value="Esperando" ${row.status_jockey === 'Esperando' ? 'selected' : ''}>Esperando</option>
        <option value="En camino" ${row.status_jockey === 'En camino' ? 'selected' : ''}>En camino</option>
        <option value="Entregado" ${row.status_jockey === 'Entregado' ? 'selected' : ''}>Entregado</option>
      </select>` : row.status_jockey || '—';

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
  const { data, error } = await supabase.from('recogiendo').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-recogiendo tbody');
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
      <td>${row.status_cajero || '-'}</td>
      <td>${row.status_jockey || '-'}</td>
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
      <td>${row.status || '-'}</td>
      <td>${row.promise_time || '-'}</td>`;
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
    const asignadoEditable = role === 'Transportación' || role === 'Admin' ? `
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
  const { data, error } = await supabase.from('transportaciones').select('*').order('hora', { ascending: false });
  if (error) return console.error(error);
  const tbody = document.querySelector('#tabla-transporte tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHora(row.hora)}</td>
      <td>${row.nombre || ''}</td>
      <td>${row.telefono || ''}</td>
      <td>${row.direccion || ''}</td>
      <td>${row.personas || ''}</td>
      <td>${row.asignado || '-'}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });
}

function formatHora(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
