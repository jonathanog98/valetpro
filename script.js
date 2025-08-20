
document.addEventListener("DOMContentLoaded", function () {
  const usuario = sessionStorage.getItem("usuario");
  const rol = sessionStorage.getItem("rol");

  if (!usuario || !rol) {
    window.location.href = "login.html";
  }

  const userInfo = document.getElementById("user-info");
  if (userInfo) {
    userInfo.textContent = `Usuario: ${usuario} | Rol: ${rol}`;
  }

  setInterval(() => {
    document.querySelectorAll(".blink").forEach((el) => {
      el.style.visibility = el.style.visibility === "hidden" ? "visible" : "hidden";
    });
  }, 500);

  const vinInput = document.getElementById("vin");
  if (vinInput) {
    vinInput.addEventListener("blur", async () => {
      const vin = vinInput.value.trim();
      if (vin.length === 17) {
        try {
          const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
          const data = await res.json();
          const modeloEntry = data.Results.find(entry => entry.Variable === "Model");
          const modelo = modeloEntry ? modeloEntry.Value : "";
          const modeloInput = document.getElementById("modelo");
          if (modeloInput) {
            modeloInput.value = modelo || "Desconocido";
          }
        } catch (err) {
          console.error("Error al decodificar VIN:", err);
        }
      }
    });
  }

  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const hora = document.getElementById("hora").value;
      const tag = document.getElementById("vin").value;
      const modelo = document.getElementById("modelo").value;
      const color = document.getElementById("color").value;
      const asesor = document.getElementById("asesor").value;
      const descripcion = document.getElementById("descripcion").value;
      const proposito = document.getElementById("proposito").value;
      const promise_time = document.getElementById("promise_time")?.value || "";
      const telefono = document.getElementById("telefono")?.value || "";
      const direccion = document.getElementById("direccion")?.value || "";
      const personas = document.getElementById("personas")?.value || "";
      const asignado = document.getElementById("asignado")?.value || "";

      let tabla = "";
      let payload = {};

      switch (proposito) {
        case "Waiter":
          tabla = "en_sala";
          payload = { hora, tag, modelo, color, asesor, descripcion, status: "", promise_time };
          break;
        case "Recogiendo":
          tabla = "recogiendo";
          payload = { hora, tag, modelo, color, asesor, descripcion, status_cajero: "", status_jockey: "" };
          break;
        case "Loaner":
          tabla = "loaners";
          payload = { hora, nombre_cliente: asesor, descripcion };
          break;
        case "Transportación":
          tabla = "transportaciones";
          payload = { hora, nombre: asesor, telefono, direccion, personas: parseInt(personas), asignado };
          break;
        default:
          alert("Propósito no reconocido.");
          return;
      }

      const { error } = await supabase.from(tabla).insert([payload]);

      if (error) {
        alert("Error al guardar los datos: " + error.message);
      } else {
        alert("Datos guardados correctamente.");
        form.reset();
      }
    });
  }
});
