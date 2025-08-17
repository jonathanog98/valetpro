
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

// DOM elements
const form = $('pickup-form');
const roleLabel = $('rol-label');
const userInfo = $('user-info');
const adminBtn = $('admin-btn');
const resultCount = $('result-count');
const propositoInput = $('proposito');
const extraFields = $('extra-fields');

const sections = {
  Recogiendo: $('recogiendo-cards'),
  Loaner: $('loaner-cards'),
  Sala: $('sala-cards'),
  Transportación: $('transportacion-cards'),
};

let currentUser = null;

// VIN decoding (placeholder)
async function decodeVIN(vin) {
  if (!vin || vin.length !== 17) return '';
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
    const data = await res.json();
    const modelEntry = data.Results.find(item => item.Variable === 'Model');
    return modelEntry ? modelEntry.Value || '' : '';
  } catch (e) {
    console.error('VIN decoding error:', e);
    return '';
  }
}

// Update extra fields based on propósito
function updateExtraFields(purpose) {
  if (!extraFields) return;
  extraFields.innerHTML = '';

  if (purpose === 'Recogiendo' || purpose === 'Waiter') {
    extraFields.innerHTML = `
      <label>VIN (opcional)
        <input type="text" id="vin" maxlength="17"/>
      </label>
      <label>TAG
        <input type="text" id="tag"/>
      </label>
      <label>Modelo
        <input type="text" id="modelo"/>
      </label>
      <label>Color
        <input type="text" id="color"/>
      </label>
      <label>Asesor
        <input type="text" id="asesor"/>
      </label>
      <label>Descripción
        <input type="text" id="descripcion"/>
      </label>
    `;

    setTimeout(() => {
      $('vin')?.addEventListener('blur', async () => {
        const vin = $('vin')?.value;
        if (vin?.length === 17) {
          $('modelo').value = await decodeVIN(vin);
        }
      });
    }, 0);

  } else if (purpose === 'Loaner') {
    extraFields.innerHTML = `
      <label>Nombre
        <input type="text" id="nombre"/>
      </label>
      <label>Descripción
        <input type="text" id="descripcion"/>
      </label>
      <label>Hora de la Cita
        <input type="time" id="hora"/>
      </label>
    `;
  } else if (purpose === 'Transportación') {
    extraFields.innerHTML = `
      <label>Nombre
        <input type="text" id="nombre"/>
      </label>
      <label>Teléfono
        <input type="tel" id="telefono"/>
      </label>
      <label>Dirección
        <input type="text" id="direccion"/>
      </label>
      <label>Descripción
        <input type="text" id="descripcion"/>
      </label>
      <label>Cantidad de Pasajeros
        <input type="number" id="pasajeros" min="1"/>
      </label>
    `;
  }
}

// Create a pickup card element
function createCard(pickup) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <h4>${pickup.proposito}</h4>
    <p><strong>TAG:</strong> ${pickup.tag || pickup.nombre || '—'}</p>
    <p><strong>Modelo:</strong> ${pickup.modelo || '—'}</p>
    <p><strong>Color:</strong> ${pickup.color || '—'}</p>
    <p><strong>Asesor:</strong> ${pickup.asesor || '—'}</p>
    <p><strong>Descripción:</strong> ${pickup.descripcion || '—'}</p>
  `;
  return div;
}

// Load pickups
async function load(userId) {
  const { data, error } = await supabase
    .from('pickups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load error:', error);
    alert('Error al cargar pickups');
    return;
  }

  Object.values(sections).forEach((section) => (section.innerHTML = ''));
  resultCount.textContent = `${data.length} resultados`;

  data.forEach((pickup) => {
    let section;
    if (pickup.proposito === 'Waiter') section = sections.Sala;
    else section = sections[pickup.proposito] || sections.Sala;
    section.appendChild(createCard(pickup));
  });
}

// Submit form
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const proposito = propositoInput.value;

  const payload = {
    user_id: currentUser.id,
    proposito,
  };

  if (proposito === 'Recogiendo' || proposito === 'Waiter') {
    payload.vin = $('vin')?.value || '';
    payload.tag = $('tag')?.value || '';
    payload.modelo = $('modelo')?.value || '';
    payload.color = $('color')?.value || '';
    payload.asesor = $('asesor')?.value || '';
    payload.descripcion = $('descripcion')?.value || '';
  } else if (proposito === 'Loaner') {
    payload.nombre = $('nombre')?.value || '';
    payload.descripcion = $('descripcion')?.value || '';
    payload.hora = $('hora')?.value || '';

// Send SMS to Twilio via Supabase Edge Function
await fetch('https://sqllpksunzuyzkzgmhuo.functions.supabase.co/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: payload.nombre, hora: payload.hora })
});

    // TODO: Send SMS via Twilio (requires server endpoint)
  } else if (proposito === 'Transportación') {
    payload.nombre = $('nombre')?.value || '';
    payload.telefono = $('telefono')?.value || '';
    payload.direccion = $('direccion')?.value || '';
    payload.descripcion = $('descripcion')?.value || '';
    payload.pasajeros = parseInt($('pasajeros')?.value || '0', 10);
  }

  const { error } = await supabase.from('pickups').insert([payload]);

  if (error) {
    console.error('Insert error:', error);
    alert('Error al guardar pickup');
  } else {
    form.reset();
    updateExtraFields(propositoInput.value);
    await load(currentUser.id);
  }
});

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return (window.location.href = 'login.html');

  const { data: roleData } = await supabase
    .from('current_user_roles')
    .select('role_code')
    .maybeSingle();

  currentUser = user;
  userInfo.textContent = user.email;
  roleLabel.textContent = roleData?.role_code || 'User';
  adminBtn.style.display = roleData?.role_code === 'Admin' ? 'inline-block' : 'none';

  updateExtraFields(propositoInput.value);
  propositoInput?.addEventListener('change', () => updateExtraFields(propositoInput.value));

  await load(currentUser.id);
});
