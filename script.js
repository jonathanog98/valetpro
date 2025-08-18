
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);

  setTimeout(() => {
    $('vin')?.addEventListener('blur', () => {
      handleVinBlur();
    });
  }, 0);

  async function handleVinBlur() {
    const vin = $('vin')?.value;
    if (vin?.length === 17) {
      $('modelo').value = await decodeVIN(vin);
    }
  }

  async function decodeVIN(vin) {
    // Aquí iría la lógica para decodificar el VIN, puedes ajustarla si tienes una API
    return 'ModeloDesconocido';
  }

  // Resto del código...
});
