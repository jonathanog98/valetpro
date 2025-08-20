import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async function () {
  // ====== Estilos para parpadeo ======
  (function ensureBlinkStyles() {
    const STYLE_ID = "blink-styles";
    if (document.getElementById(STYLE_ID)) return;
    const css = `
@keyframes blinkYellow { 0%{background-color:transparent;} 50%{background-color:rgba(255,235,59,0.4);} 100%{background-color:transparent;} }
@keyframes blinkRed    { 0%{background-color:transparent;} 50%{background-color:rgba(244,67,54,0.4);} 100%{background-color:transparent;} }
tr.blink-yellow { animation: blinkYellow 1s linear infinite; }
tr.blink-red    { animation: blinkRed 1s linear infinite; }
`;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ====== SESIÓN (sessionStorage) ======
  const userRole  = sessionStorage.getItem("rol") || "Guest";
  const userEmail = sessionStorage.getItem("usuario") || "";

  if (!userEmail || !userRole || userRole === "Guest") {
    alert("Tu sesión ha expirado o es inválida. Por favor inicia sesión nuevamente.");
    sessionStorage.clear();
    window.location.href = "login.html";
    return;
  }

  document.querySelector("#user-role")?.textContent = userRole;
  document.querySelector("#user-email")?.textContent = userEmail;

  // Aquí puedes continuar con la lógica según el rol...
});