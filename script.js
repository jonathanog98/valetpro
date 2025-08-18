
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

const form = $("pickup-form");
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const pickup = {
      tag: $("tag")?.value || "",
      modelo: $("modelo")?.value || "",
      color: $("color")?.value || "",
      asesor: $("asesor")?.value || "",
      descripcion: $("descripcion")?.value || "",
      proposito: $("proposito")?.value || "",
      hora: new Date().toISOString()
    };

    const { data, error } = await supabase.from("pickups").insert([pickup]);

    if (error) {
      console.error("Error al insertar pickup:", error);
      alert("No se pudo guardar el pickup.");
    } else {
      alert("Pickup guardado exitosamente.");
      form.reset();
    }
  };
}
