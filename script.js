
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  setTimeout(() => {
    $('vin')?.addEventListener('blur', () => {
      handleVinBlur();
    });
  }, 0);

  $('pickup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const proposito = $('proposito')?.value;
    const vin = $('vin')?.value || null;
    const tag = $('tag')?.value;
    const modelo = $('modelo')?.value;
    const color = $('color')?.value;
    const asesor = $('asesor')?.value;
    const descripcion = $('descripcion')?.value;
    const { data: { user } } = await supabase.auth.getUser();

    const data = {
      tag,
      modelo,
      color,
      asesor,
      descripcion,
      user_id: user.id,
      hora: new Date().toISOString()
    };

    let tablaDestino = null;

    switch (proposito) {
      case 'Recogiendo':
        tablaDestino = 'recogiendo';
        break;
      case 'Waiter':
        tablaDestino = 'en_sala';
        break;
      case 'Loaner':
        tablaDestino = 'loaners';
        break;
      case 'Transportación':
        tablaDestino = 'transportaciones';
        break;
      default:
        alert('Propósito no válido.');
        return;
    }

    console.log('Datos a insertar:', data);
    const { error } = await supabase.from(tablaDestino).insert([data]);

    if (error) {
      console.error('Supabase insert error:', error);
      console.warn('Error al agregar pickup:', error.message);
    } else {
      console.log('Pickup agregado con éxito.');
      location.reload();
    }
  });

  loadRecogiendo();
  loadEnSala();
  loadLoaners();
  loadTransportacion();

  async function handleVinBlur() {
    const vin = $('vin')?.value;
    if (vin?.length === 17) {
      $('modelo').value = await decodeVIN(vin);
    }
  }

  async function decodeVIN(vin) {
    if (!vin) return '';
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
      const data = await response.json();
      return data?.Results?.[0]?.Model || 'ModeloDesconocido';
    } catch (error) {
      console.error('Error al decodificar el VIN:', error);
      return 'ModeloDesconocido';
    }
  }
});

async function loadRecogiendo() {
  const { data, error } = await supabase.from('recogiendo').select('*').order('hora', { ascending: false });
  if (error) return console.error('Supabase insert error:', error);
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
  if (error) return console.error('Supabase insert error:', error);
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
  if (error) return console.error('Supabase insert error:', error);
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
  if (error) return console.error('Supabase insert error:', error);
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
