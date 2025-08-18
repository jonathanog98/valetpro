
import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

const form = $("pickup-form");
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const proposito = $("proposito")?.value;
    const tag = $("tag")?.value || null;
    const modelo = $("modelo")?.value || null;
    const color = $("color")?.value || null;
    const asesor = $("asesor")?.value || null;
    const descripcion = $("descripcion")?.value || null;
    const cliente = $("cliente")?.value || null;
    const direccion = $("direccion")?.value || null;
    const telefono = $("telefono")?.value || null;
    const personas = $("personas")?.value ? parseInt($("personas").value) : null;

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("No se pudo obtener el usuario.");
      return;
    }

    const hora = new Date().toISOString();
    let insertData = { user_id: user.id, hora };

    let tabla = null;

    switch (proposito) {
      case "Recogiendo":
        tabla = "recogiendo";
        Object.assign(insertData, { tag, modelo, color, asesor, descripcion });
        break;
      case "En Sala":
        tabla = "en_sala";
        Object.assign(insertData, { tag, modelo, color, asesor, descripcion });
        break;
      case "Loaner":
        tabla = "loaners";
        Object.assign(insertData, { nombre_cliente: cliente });
        break;
      case "Transportación":
        tabla = "transportaciones";
        Object.assign(insertData, { nombre: cliente, direccion, telefono, personas });
        break;
      default:
        alert("Propósito inválido o no especificado.");
        return;
    }

    const { error } = await supabase.from(tabla).insert([insertData]);

    if (error) {
      console.error("Error al insertar:", error);
      alert("Error al guardar el pickup.");
    } else {
      alert("Pickup guardado correctamente.");
      form.reset();
    }
  };
}
