// ===== Auth robusta (sessionStorage con fallback a localStorage) =====
function canUseSession() {
  try {
    sessionStorage.setItem('_t','1');
    sessionStorage.removeItem('_t');
    return true;
  } catch(e) {
    return false;
  }
}
const sess = canUseSession() ? sessionStorage : localStorage;

const rol     = sess.getItem('rol');
const usuario = sess.getItem('usuario');
const nombre  = sess.getItem('nombre');

if (!usuario || !rol) {
  window.location.href = new URL('login.html', window.location.href).href;
}

const displayName = nombre || usuario;
document.getElementById('user-info').innerText = `${displayName} (${rol})`;
if (rol === 'Jockey') {
  document.body.classList.add('jockey-mobile');
}

const adminBtn = document.getElementById('admin-btn');
if (adminBtn && rol === 'Admin') adminBtn.style.display = 'inline-flex';

function logout() {
  try {
    sessionStorage.clear();
    localStorage.removeItem('usuario');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
  } finally {
    window.location.href = new URL('login.html', window.location.href).href;
  }
}

// ===== Estado base =====
let pickups = JSON.parse(localStorage.getItem('pickups') || '[]');

// ===== Catálogos =====
const statusCajeroOptions = [
  "Tiene doc","No ha pagado","Falta Book","En camino","Complete",
  "Pert.","Dudas con factura","Se va sin docs","Llaves a asesor",
  "Lav. Cortesía","Test drive","Llevar a taller","Inspección",
  "Valet","Poner a Grúa","VIP en camino"
];
const statusJockeyOptions = [
  "Arriba","Subiendo","Lavado","Working","No Lavar",
  "Taller","Secado","Ubicado","Detailing","Zona Blanca"
];
const transportistas = ["J. Rodríguez","J. Díaz","C. Pla","D. Román"];

// ===== Utils =====
function toTimeLabel(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString();
}
function waitDiffLabel(fromMs, toMs) {
  const diff = Math.max(0, (toMs - fromMs) / 1000 | 0);
  const mins = (diff / 60) | 0;
  const secs = diff % 60;
  return `${mins} min ${secs} s`;
}
function epochFromTodayTimeString(horaStr) {
  if (!horaStr) return Date.now();
  const now = new Date();
  const [hh, mm, ss] = (horaStr || '0:0:0').split(':').map(x => parseInt(x, 10) || 0);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss, 0).getTime();
}
function guardarYRefrescar() {
  localStorage.setItem('pickups', JSON.stringify(pickups));
  renderTablas();
}

// ===== Mostrar/Ocultar por rol =====
function ocultarSegunRol() {
  const wrapOf = id => document.getElementById(id)?.closest('.table-wrapper');
  const form   = document.getElementById('pickup-form');
  const wRec   = wrapOf('tabla-recogiendo');
  const wLoan  = wrapOf('tabla-loaner');
  const wTrans = wrapOf('tabla-transporte');
  const wEntr  = wrapOf('tabla-entregados');

  if (rol === 'Admin' || rol === 'Cajero') {
    [form, wRec, wLoan, wTrans, wEntr].forEach(el => { if (el) el.style.display = ''; });
    return;
  }

  if (rol === 'Jockey') {
    if (form)   form.style.display = 'none';
    if (wLoan)  wLoan.style.display = 'none';
    if (wTrans) wTrans.style.display = 'none';
    if (wRec)   wRec.style.display = '';
    if (wEntr)  wEntr.style.display = '';
    return;
  }

  if (rol === 'Loaners') {
    if (form) form.style.display = 'none';
    if (wRec) wRec.style.display = 'none';
    if (wTrans) wTrans.style.display = 'none';
    if (wEntr) wEntr.style.display = 'none';
    return;
  }

  if (rol === 'Transportación') {
    if (form) form.style.display = 'none';
    if (wRec) wRec.style.display = 'none';
    if (wLoan) wLoan.style.display = 'none';
    if (wEntr) wEntr.style.display = 'none';
    return;
  }

  [form, wRec, wLoan, wTrans, wEntr].forEach(el => { if (el) el.style.display = 'none'; });
}

// ===== Render Principal =====
function renderTablas() {
  ocultarSegunRol();

  const btnBorrar = document.getElementById('btn-borrar-entregados');
  if (btnBorrar) btnBorrar.style.display = (rol === 'Admin') ? 'inline-block' : 'none';

  const tbRec = document.querySelector("#tabla-recogiendo tbody");
  const tbLoan = document.querySelector("#tabla-loaner tbody");
  const tbTran = document.querySelector("#tabla-transporte tbody");
  const tbEntr = document.querySelector("#tabla-entregados tbody");
  const lblProm = document.getElementById('promedio-espera');

  if (tbRec) tbRec.innerHTML = "";
  if (tbLoan) tbLoan.innerHTML = "";
  if (tbTran) tbTran.innerHTML = "";
  if (tbEntr) tbEntr.innerHTML = "";

  let totalWaitSeconds = 0, waitCount = 0;

  pickups.forEach((p, i) => {
    // Filtrar visibilidad fuerte para Jockey
    if (rol === 'Jockey' && !(p.proposito === 'Recogiendo' || p.entregado)) return;

    // ENTREGADOS
    if (p.entregado && tbEntr) {
      const createdMs = p.createdAt || epochFromTodayTimeString(p.hora);
      const entregadoMs = p.entregadoAt || epochFromTodayTimeString(p.entregado);
      const tLabel = waitDiffLabel(createdMs, entregadoMs);
      totalWaitSeconds += Math.max(0, ((entregadoMs - createdMs) / 1000) | 0);
      waitCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.tag || ''}</td>
        <td>${p.modelo || ''}</td>
        <td>${p.color || ''}</td>
        <td>${p.asesor || ''}</td>
        <td>${p.hora || toTimeLabel(createdMs)}</td>
        <td>${p.entregado || toTimeLabel(entregadoMs)}</td>
        <td>${tLabel}</td>`;
      tbEntr.appendChild(tr);
      return;
    }

    // RECOGIENDO
    if (p.proposito === 'Recogiendo' && tbRec) {
      const cajeroCell = (rol === 'Cajero' || rol === 'Admin') ? `
        <select data-idx="${i}" class="status-cajero">
          <option value="">--</option>
          ${statusCajeroOptions.map(s => `<option value="${s}" ${p.statusCajero === s ? 'selected' : ''}>${s}</option>`).join("")}
        </select>` : (p.statusCajero || '');

      const jockeyCell = (rol === 'Jockey' || rol === 'Admin') ? `
        <select data-idx="${i}" class="status-jockey">
          <option value="">--</option>
          ${statusJockeyOptions.map(s => `<option value="${s}" ${p.statusJockey === s ? 'selected' : ''}>${s}</option>`).join("")}
        </select>` : (p.statusJockey || '');

      const accionesCell = (rol === 'Cajero' || rol === 'Admin') ? `<button data-idx="${i}" class="borrar">Eliminar</button>` : '';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.hora}</td>
        <td>${p.tag}</td>
        <td>${p.modelo}</td>
        <td>${p.color}</td>
        <td>${p.asesor}</td>
        <td>${p.descripcion}</td>
        <td>${cajeroCell}</td>
        <td>${jockeyCell}</td>
        <td>${accionesCell}</td>`;

      const createdMs = p.createdAt || epochFromTodayTimeString(p.hora);
      if (Date.now() - createdMs > 5 * 60 * 1000) tr.classList.add('blink');

      tbRec.appendChild(tr);
    }

    // LOANER
    if (p.proposito === 'Loaner' && tbLoan) {
      const puedeBorrar = (rol === 'Cajero' || rol === 'Loaners' || rol === 'Admin');
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.hora}</td>
        <td>${p.loanerNombre || ''}</td>
        <td>${puedeBorrar ? `<button data-idx="${i}" class="borrar">Eliminar</button>` : ''}</td>`;
      tbLoan.appendChild(tr);
    }

    // TRANSPORTACIÓN
    if (p.proposito === 'Transportación' && tbTran) {
      const puedeAsignar = (rol === 'Transportación' || rol === 'Admin');
      const puedeCompletar = (rol === 'Transportación' || rol === 'Admin');
      const puedeBorrar = (rol === 'Cajero' || rol === 'Admin');

      const asignadoCell = puedeAsignar ? `
        <select data-idx="${i}" class="transportista">
          <option value="">--</option>
          ${transportistas.map(s => `<option value="${s}" ${p.transportista === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>` : (p.transportista || '');

      const acciones = [];
      if (puedeCompletar) acciones.push(`<button data-idx="${i}" class="completar">Completado</button>`);
      if (puedeBorrar) acciones.push(`<button data-idx="${i}" class="borrar">Eliminar</button>`);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.hora}</td>
        <td>${p.transNombre || ''}</td>
        <td>${p.transTel || ''}</td>
        <td>${p.transDireccion || ''}</td>
        <td>${p.transPersonas || ''}</td>
        <td>${asignadoCell}</td>
        <td>${acciones.join(' ')}</td>`;
      tbTran.appendChild(tr);
    }
  });

  if (lblProm) {
    if (waitCount === 0) lblProm.textContent = 'Promedio de espera: —';
    else {
      const avg = Math.round(totalWaitSeconds / waitCount);
      const mins = (avg / 60) | 0, secs = avg % 60;
      lblProm.textContent = `Promedio de espera: ${mins} min ${secs} s`;
    }
  }

  // Listeners dinámicos...

  document.querySelectorAll(".status-cajero").forEach(sel => {
    sel.addEventListener("change", function () {
      const idx = +this.dataset.idx;
      pickups[idx].statusCajero = this.value;
      if (pickups[idx].statusCajero === "Complete" && pickups[idx].statusJockey === "Arriba" && !pickups[idx].entregadoAt) {
        pickups[idx].entregadoAt = Date.now();
        pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      }
      guardarYRefrescar();
    });
  });

  document.querySelectorAll(".status-jockey").forEach(sel => {
    sel.addEventListener("change", function () {
      const idx = +this.dataset.idx;
      pickups[idx].statusJockey = this.value;
      if (pickups[idx].statusCajero === "Complete" && pickups[idx].statusJockey === "Arriba" && !pickups[idx].entregadoAt) {
        pickups[idx].entregadoAt = Date.now();
        pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      }
      guardarYRefrescar();
    });
  });

  document.querySelectorAll(".transportista").forEach(sel => {
    sel.addEventListener("change", function () {
      const idx = +this.dataset.idx;
      pickups[idx].transportista = this.value;
      guardarYRefrescar();
    });
  });

  document.querySelectorAll(".completar").forEach(btn => {
    btn.addEventListener("click", function () {
      const idx = +this.dataset.idx;
      pickups[idx].entregadoAt = Date.now();
      pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      guardarYRefrescar();
    });
  });

  document.querySelectorAll(".borrar").forEach(btn => {
    btn.addEventListener("click", function () {
      const idx = +this.dataset.idx;
      pickups.splice(idx, 1);
      guardarYRefrescar();
    });
  });
}

// ===== Formulario (Cajero/Admin) =====
if (rol === 'Cajero' || rol === 'Admin') {
  const form = document.getElementById('pickup-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const proposito = document.getElementById('proposito').value;
      const pickup = {
        createdAt: Date.now(),
        hora: new Date().toLocaleTimeString(),
        proposito,
        tag: document.getElementById('tag').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        color: document.getElementByAr( 'color').value.trim(),
        asesor: document.getElementById('asesor').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        statusCajero: "", statusJockey: ""   
      };

      if (proposito === 'Loaner') {
        pickup.loanerNombre = document.getElementById('loaner-nombre').value.trim();
      } else if (proposito === 'Transportación') {
        pickup.transNombre = document.getElementById('trans-nombre').value.trim();
        pickup.transTel = document.getElementById('trans-tel').value.trim();
        pickup.transDireccion = document.getElementById('trans-direccion').value.trim();
        pickup.transPersonas = document.getElementById('trans-personas').value.trim();
      }

      pickups.push(pickup);
      guardarYRefrescar();
      this.reset();
      const extra = document.getElementById('extra-fields');
      if (extra) extra.innerHTML = "";
    });

    const vinInput = document.getElementById('vin');
    if (vinInput) {
      vinInput.addEventListener('blur', async function () {
        const vin = this.value.trim();
        if (vin.length === 17) {
          try {
            const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
            const data = await res.json();
            const modeloEntry = data.Results.find(r => r.Variable === "Model");
            if (modeloEntry?.Value) document.getElementById('modelo').value = modeloEntry.Value;
          } catch (err) {
            console.error('Error decodificando VIN:', err);
          }
        }
      });
    }

    const propositoSel = document.getElementById('proposito');
    if (propositoSel) {
      propositoSel.addEventListener('change', function () {
        const container = document.getElementById('extra-fields');
        if (!container) return;
        container.innerHTML = "";

        if (this.value === "Transportación") {
          container.innerHTML = `
            <label class="full">Nombre del cliente
              <input type="text" id="trans-nombre" required />
            </label>
            <label class="full">Número de teléfono
              <input type="tel" id="trans-tel" required />
            </label>
            <label class="full">Dirección
              <input type="text" id="trans-dirección" required />
            </label>
            <label class="full">Cantidad de Personas
              <input type="number" id="trans-personas" required min="1" />
            </label>`;
        } else if (this.value === "Loaner") {
          container.innerHTML = `
            <label class="full">Nombre del cliente
              <input type="text" id="loaner-nombre" required />
            </label>`;
        }
      });
    }
  }
} else {
  const form = document.getElementById('pickup-form');
  if (form) form.style.display = 'none';
}

// ===== Primer render + Auto-refresh =====
document.addEventListener('DOMContentLoaded', () => {
  if (rol) {
    renderTablas();
    setInterval(() => {
      pickups = JSON.parse(localStorage.getItem('pickups') || '[]');
      renderTablas();
    }, 3000);
  }
});
