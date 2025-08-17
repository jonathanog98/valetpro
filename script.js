import { supabase } from './supabase.js';
import { supabase } from './lib/supabase.js';

const $ = (id) => document.getElementById(id);

// DOM elements
const form = $('pickup-form');
const roleLabel = $('rol-label');
const userInfo = $('user-info');
const adminBtn = $('admin-btn');
const resultCount = $('result-count');

const propositoInput = $('proposito');
const customPurposeWrapper = $('custom-purpose-wrapper');
const customDetailInput = $('custom-detail');

const sections = {
  Recogiendo: $('recogiendo-cards'),
  Loaner: $('loaner-cards'),
  Sala: $('sala-cards'),
  Transportación: $('transportacion-cards'),
};

let currentUser = null;

// Get user and role
async function getCurrentUserAndRole() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error("Auth error or no user:", error);
    window.location.href = 'login.html';
    return null;
  }

  const { data: roleData, error: roleError } = await supabase
    .from('current_user_roles')
    .select('role_code')
    .maybeSingle();

  if (roleError) console.error("Role fetch error:", roleError);

  return { user, role: roleData?.role_code || 'User' };
}

// Create a pickup card element
function createCard(pickup) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <h4>${pickup.proposito}</h4>
    <p><strong>TAG:</strong> ${pickup.tag}</p>
    <p><strong>Modelo:</strong> ${pickup.modelo}</p>
    <p><strong>Color:</strong> ${pickup.color}</p>
    <p><strong>Asesor:</strong> ${pickup.asesor}</p>
    <p><strong>Descripción:</strong> ${pickup.descripcion}</p>
  `;
  return div;
}

// Load and render pickups
async function load(userId) {
  console.log("Loading pickups for user:", userId);

  const { data, error } = await supabase
    .from('pickups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log("Pickup load result →", { data, error });

  if (error) {
    console.error('Load error:', error);
    alert('Error al cargar pickups');
    return;
  }

  Object.values(sections).forEach((section) => (section.innerHTML = ''));
  resultCount.textContent = `${data.length} resultados`;

  data.forEach((pickup) => {
    const section = sections[pickup.proposito] || sections.Sala;
    section.appendChild(createCard(pickup));
  });
}

// Submit form
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const proposito = propositoInput.value;
  const customDetail = customDetailInput.value;
  const finalPurpose =
    proposito === 'Otro' && customDetail ? customDetail : proposito;

  const payload = {
    user_id: currentUser.id,
    proposito: finalPurpose,
    vin: $('vin')?.value,
    tag: $('tag')?.value,
    modelo: $('modelo')?.value,
    color: $('color')?.value,
    asesor: $('asesor')?.value,
    descripcion: $('descripcion')?.value,
  };

  console.log("Submitting pickup payload:", payload);

  const { error } = await supabase.from('pickups').insert([payload]);

  if (error) {
    console.error('Insert error:', error);
    alert('Error al guardar pickup');
  } else {
    form.reset();
    customPurposeWrapper.style.display = 'none';
    await load(currentUser.id);
  }
});

// Toggle custom purpose input
propositoInput?.addEventListener('change', () => {
  customPurposeWrapper.style.display =
    propositoInput.value === 'Otro' ? 'block' : 'none';
});

// Init
document.addEventListener('DOMContentLoaded', async () => {
  console.log("script.js execution started");

  const auth = await getCurrentUserAndRole();
  if (!auth) return;

  currentUser = auth.user;
  userInfo.textContent = auth.user.email;
  roleLabel.textContent = auth.role;
  adminBtn.style.display = auth.role === 'Admin' ? 'inline-block' : 'none';

  await load(currentUser.id);
});