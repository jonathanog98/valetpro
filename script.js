// ===== Auth robusta (sessionStorage o localStorage) =====
function canUseSession() {
  try {
    sessionStorage.setItem('_t', '1');
    sessionStorage.removeItem('_t');
    return true;
  } catch (e) {
    return false;
  }
}
const sess = canUseSession() ? sessionStorage : localStorage;
const rol = sess.getItem('rol');
const usuario = sess.getItem('usuario');
const nombre = sess.getItem('nombre');

if (!usuario || !rol) {
  window.location.href = new URL('login.html', window.location.href).href;
}

document.getElementById('user-info').innerText = `${nombre || usuario} (${rol})`;
if (rol === 'Jockey') document.body.classList.add('jockey-mobile');
if (rol === 'Admin') document.getElementById('admin-btn').style.display = 'inline-flex';

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
const statusCajeroOptions = ["Tiene doc","No ha pagado","Falta Book","En camino","Complete","Pert.","Dudas con factura","Se va sin docs","Llaves a asesor","Lav. Cortesía","Test drive","Llevar a taller","Inspección","Valet","Poner a Grúa","VIP en camino"];
const statusJockeyOptions = ["Arriba","Subiendo","Lavado","Working","No Lavar","Taller","Secado","Ubicado","Detailing","Zona Blanca"];
const statusSalaOptions   = ["Status asesor","Charging","Lav. Cortesía","No Waiter","Supervisor","Working","Booked","Grúa","Call Center","Inspección","Listo"];
const transportistas      = ["J. Rodríguez","J. Díaz","C. Pla","D. Román"];

// ===== Utilidades =====
function toTimeLabel(ms) {
  return new Date(ms).toLocaleTimeString();
}
function waitDiffLabel(fromMs, toMs) {
  const diff = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const m = Math.floor(diff / 60), s = diff % 60;
  return `${m} min ${s} s`;
}
function epochFromTodayTimeString(h) {
  if (!h) return Date.now();
  const [hh, mm, ss] = h.split(':').map(x => parseInt(x, 10) || 0);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss).getTime();
}
function guardarYRefrescar() {
  localStorage.setItem('pickups', JSON.stringify(pickups));
  renderTablas();
}

// ===== Borrar entregados =====
function borrarEntregados() {
  if (!confirm("¿Estás seguro que deseas borrar todos los entregados?")) return;
  pickups = pickups.filter(p => !p.entregado);
  guardarYRefrescar();
}

// ===== Control de visibilidad según rol =====
function ocultarSegunRol() {
  const wrap = id => document.getElementById(id)?.closest('.table-wrapper');
  const f = document.getElementById('pickup-form');
  const wRec  = wrap('tabla-recogiendo');
  const wLoan = wrap('tabla-loaner');
  const wTrans= wrap('tabla-transporte');
  const wEntr = wrap('tabla-entregados');
  const wWait = wrap('tabla-waiter');

  // Mostrar todo por defecto
  [f, wWait, wRec, wLoan, wTrans, wEntr].forEach(el => el && (el.style.display = ''));

  if (rol === 'Admin') return;

  if (rol === 'Cajero') {
    if (wLoan) wLoan.style.display = 'none';
    if (wTrans) wTrans.style.display = 'none';
    return;
  }

  if (rol === 'Jockey') {
    if (f)     f.style.display = 'none';
    if (wLoan) wLoan.style.display = 'none';
    if (wTrans)wTrans.style.display = 'none';
    if (wWait) wWait.style.display = 'none';
    return;
  }

  if (rol === 'Loaners') {
    if (f)     f.style.display = 'none';
    if (wRec)  wRec.style.display = 'none';
    if (wTrans)wTrans.style.display = 'none';
    if (wEntr) wEntr.style.display = 'none';
    if (wWait) wWait.style.display = 'none';
    return;
  }

  if (rol === 'Transportación') {
    if (f)     f.style.display = 'none';
    if (wRec)  wRec.style.display = 'none';
    if (wLoan) wLoan.style.display = 'none';
    if (wEntr) wEntr.style.display = 'none';
    if (wWait) wWait.style.display = 'none';
    return;
  }

  // Por defecto, ocultar todo excepto entregados
  [f, wLoan, wTrans, wWait].forEach(el => el && (el.style.display = 'none'));
}

// ===== Render de tablas =====
function renderTablas() {
  ocultarSegunRol();

  const btnBorrar = document.getElementById('btn-borrar-entregados');
  if (btnBorrar) btnBorrar.style.display = (rol === 'Admin') ? 'inline-block' : 'none';

  const tbRec  = document.querySelector("#tabla-recogiendo tbody");
  const tbLoan = document.querySelector("#tabla-loaner tbody");
  const tbTran = document.querySelector("#tabla-transporte tbody");
  const tbEntr = document.querySelector("#tabla-entregados tbody");
  const tbWait = document.querySelector("#tabla-waiter tbody");
  const lblProm= document.getElementById('promedio-espera');

  [tbRec, tbLoan, tbTran, tbEntr, tbWait].forEach(tb => tb && (tb.innerHTML = ""));

  let totalWaitSeconds = 0, waitCount = 0;

  pickups.forEach((p, i) => {
    // Waiter (solo visible para Admin/Cajero)
    if (p.proposito === 'Waiter' && tbWait && (rol === 'Admin' || rol === 'Cajero')) {
      renderClientesSala(p, i, tbWait);
      return;
    }

    // Jockey solo ve Recogiendo y Entregados
    if (rol === 'Jockey' && !(p.proposito === 'Recogiendo' || p.entregado)) return;

    // Entregados
    if (p.entregado && tbEntr) {
      const cMs = p.createdAt || epochFromTodayTimeString(p.hora);
      const eMs = p.entregadoAt || epochFromTodayTimeString(p.entregado);
      totalWaitSeconds += Math.max(0, Math.floor((eMs - cMs) / 1000));
      waitCount++;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.tag || ''}</td>
        <td>${p.modelo || ''}</td>
        <td>${p.color || ''}</td>
        <td>${p.asesor || ''}</td>
        <td>${p.hora || toTimeLabel(cMs)}</td>
        <td>${p.entregado || toTimeLabel(eMs)}</td>
        <td>${waitDiffLabel(cMs, eMs)}</td>`;
      tbEntr.appendChild(tr);
      return;
    }

    // Recogiendo
    if (p.proposito === 'Recogiendo' && tbRec) {
      const cajeroCell = (rol === 'Cajero' || rol === 'Admin')
        ? `<select data-idx="${i}" class="status-cajero">
             <option value="">--</option>
             ${statusCajeroOptions.map(s => `<option value="${s}" ${p.statusCajero === s ? 'selected' : ''}>${s}</option>`).join("")}
           </select>`
        : (p.statusCajero || '');
      const jockeyCell = (rol === 'Jockey' || rol === 'Admin')
        ? `<select data-idx="${i}" class="status-jockey">
             <option value="">--</option>
             ${statusJockeyOptions.map(s => `<option value="${s}" ${p.statusJockey === s ? 'selected' : ''}>${s}</option>`).join("")}
           </select>`
        : (p.statusJockey || '');
      const actions = (rol === 'Cajero' || rol === 'Admin') ? `<button data-idx="${i}" class="borrar">Eliminar</button>` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.hora}</td>
        <td>${p.tag}</td>
        <td>${p.modelo}</td>
        <td>${p.color}</td>
        <td>${p.asesor}</td>
        <td>${p.descripcion}</td>
        <td>${cajeroCell}</td>
        <td>${jockeyCell}</td>
        <td>${actions}</td>`;
      const created = p.createdAt || epochFromTodayTimeString(p.hora);
      if (Date.now() - created > 5 * 60 * 1000) tr.classList.add('blink');
      tbRec.appendChild(tr);
      return;
    }

    // Loaner
    if (p.proposito === 'Loaner' && tbLoan) {
      const borr = (rol === 'Cajero' || rol === 'Loaners' || rol === 'Admin') ? `<button data-idx="${i}" class="borrar">Eliminar</button>` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.hora}</td><td>${p.loanerNombre || ''}</td><td>${borr}</td>`;
      tbLoan.appendChild(tr);
      return;
    }

    // Transportación
    if (p.proposito === 'Transportación' && tbTran) {
      const canAssign   = (rol === 'Transportación' || rol === 'Admin');
      const canComplete = (rol === 'Transportación' || rol === 'Admin');
      const canDelete   = (rol === 'Cajero' || rol === 'Admin');
      const assignCell = canAssign
        ? `<select data-idx="${i}" class="transportista">
             <option value="">--</option>
             ${transportistas.map(s => `<option value="${s}" ${p.transportista === s ? 'selected' : ''}>${s}</option>`).join('')}
           </select>`
        : (p.transportista || '');
      const actionsArr = [];
      if (canComplete) actionsArr.push(`<button data-idx="${i}" class="completar">Completado</button>`);
      if (canDelete)   actionsArr.push(`<button data-idx="${i}" class="borrar">Eliminar</button>`);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.hora}</td>
        <td>${p.transNombre || ''}</td>
        <td>${p.transTel || ''}</td>
        <td>${p.transDireccion || ''}</td>
        <td>${p.transPersonas || ''}</td>
        <td>${assignCell}</td>
        <td>${actionsArr.join(' ')}</td>`;
      tbTran.appendChild(tr);
      return;
    }
  });

  if (lblProm) {
    lblProm.textContent = waitCount
      ? `Promedio de espera: ${Math.floor(totalWaitSeconds / waitCount / 60)} min ${Math.floor((totalWaitSeconds / waitCount) % 60)} s`
      : 'Promedio de espera: —';
  }

  // Listeners dinámicos
  document.querySelectorAll(".status-sala").forEach(el =>
    el.addEventListener("change", () => {
      const idx = +el.dataset.idx;
      pickups[idx].statusSala = el.value;
      if (el.value === "Listo") {
        pickups[idx].proposito = "Recogiendo";
        delete pickups[idx].statusSala;
        delete pickups[idx].promiseTime;
      }
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".promise-time").forEach(el =>
    el.addEventListener("change", () => {
      pickups[+el.dataset.idx].promiseTime = el.value;
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".status-cajero").forEach(el =>
    el.addEventListener("change", () => {
      const idx = +el.dataset.idx;
      pickups[idx].statusCajero = el.value;
      if (pickups[idx].statusCajero === "Complete" && pickups[idx].statusJockey === "Arriba" && !pickups[idx].entregadoAt) {
        pickups[idx].entregadoAt = Date.now();
        pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      }
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".status-jockey").forEach(el =>
    el.addEventListener("change", () => {
      const idx = +el.dataset.idx;
      pickups[idx].statusJockey = el.value;
      if (pickups[idx].statusCajero === "Complete" && pickups[idx].statusJockey === "Arriba" && !pickups[idx].entregadoAt) {
        pickups[idx].entregadoAt = Date.now();
        pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      }
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".transportista").forEach(el =>
    el.addEventListener("change", () => {
      pickups[+el.dataset.idx].transportista = el.value;
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".completar").forEach(el =>
    el.addEventListener("click", () => {
      const idx = +el.dataset.idx;
      pickups[idx].entregadoAt = Date.now();
      pickups[idx].entregado = toTimeLabel(pickups[idx].entregadoAt);
      guardarYRefrescar();
    })
  );
  document.querySelectorAll(".borrar").forEach(el =>
    el.addEventListener("click", () => {
      pickups.splice(+el.dataset.idx, 1);
      guardarYRefrescar();
    })
  );
}

// ===== Readiness / UI dinámica =====
document.addEventListener("DOMContentLoaded", () => {
  // Hook formulario (solo Cajero/Admin)
  const form = document.getElementById("pickup-form");
  if (form && (rol === 'Cajero' || rol === 'Admin')) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const proposito = document.getElementById("proposito").value;
      const pickup = {
        createdAt: Date.now(),
        hora: new Date().toLocaleTimeString(),
        proposito,
        tag: document.getElementById("tag").value.trim(),
        modelo: document.getElementById("modelo").value.trim(),
        color: document.getElementById("color").value.trim(),
        asesor: document.getElementById("asesor").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        statusCajero: "",
        statusJockey: ""
      };
      if (proposito === "Loaner") {
        pickup.loanerNombre = document.getElementById("loaner-nombre")?.value.trim();
      } else if (proposito === "Transportación") {
        pickup.transNombre    = document.getElementById("trans-nombre")?.value.trim();
        pickup.transTel       = document.getElementById("trans-tel")?.value.trim();
        pickup.transDireccion = document.getElementById("trans-direccion")?.value.trim();
        pickup.transPersonas  = document.getElementById("trans-personas")?.value.trim();
      }
      pickups.push(pickup);
      guardarYRefrescar();
      form.reset();
      const extra = document.getElementById("extra-fields");
      if (extra) extra.innerHTML = "";
    });
  }

  // Campos extra dinámicos por propósito
  const propositoSel = document.getElementById("proposito");
  if (propositoSel) {
    propositoSel.addEventListener("change", function () {
      const container = document.getElementById("extra-fields");
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
            <input type="text" id="trans-direccion" required />
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

  // VIN decode → Modelo
  const vinInput = document.getElementById("vin");
  if (vinInput) {
    vinInput.addEventListener("blur", async function () {
      const vin = this.value.trim();
      if (vin.length === 17) {
        try {
          const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
          const data = await res.json();
          const modeloEntry = data.Results.find(r => r.Variable === "Model");
          if (modeloEntry?.Value) document.getElementById("modelo").value = modeloEntry.Value;
        } catch (err) {
          console.error("Error decodificando VIN:", err);
        }
      }
    });
  }

  // Botón borrar entregados
  const btn = document.getElementById("btn-borrar-entregados");
  if (btn && rol === "Admin") btn.addEventListener("click", borrarEntregados);

  // Si no existe la tabla Waiter en el HTML, no hacemos nada extra (tu index ya no la incluye por defecto)
  // Render inicial + auto-refresh
  renderTablas();
  setInterval(() => {
    pickups = JSON.parse(localStorage.getItem("pickups") || "[]");
    renderTablas();
  }, 3000);
});

// ===== Render de Waiter (si se usa) =====
function renderClientesSala(p, i, tbWait) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${p.hora}</td>
    <td>${p.tag}</td>
    <td>${p.modelo}</td>
    <td>${p.color}</td>
    <td>${p.asesor}</td>
    <td>${p.descripcion}</td>
    <td>
      <select data-idx="${i}" class="status-sala">
        ${statusSalaOptions.map(s => `<option value="${s}" ${p.statusSala === s ? 'selected' : ''}>${s}</option>`).join("")}
      </select>
    </td>
    <td><input type="datetime-local" data-idx="${i}" class="promise-time" value="${p.promiseTime || ''}"></td>`;
  if (p.promiseTime) {
    const rem = new Date(p.promiseTime).getTime() - Date.now();
    if (rem > 0 && rem < 30 * 60 * 1000) tr.classList.add("blink-red");
  }
  tbWait.appendChild(tr);
}
