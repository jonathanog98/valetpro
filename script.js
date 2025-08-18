
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

const form = $("pickup-form");
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const client_name = $("asesor")?.value || "";
    const location = $("proposito")?.value || "";
    const status = $("descripcion")?.value || "";
    const pickup_time = new Date().toISOString();

    const { data, error } = await supabase.from("pickups").insert([{
      client_name,
      location,
      status,
      pickup_time
    }]);

    if (error) {
      console.error("Error al insertar en Supabase:", error);
      alert("No se pudo guardar el pickup.");
    } else {
      alert("Pickup guardado exitosamente.");
      form.reset();
    }
  };
}
