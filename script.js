
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
  if (!vin) return '';
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    return data?.Results?.[0]?.Model || 'ModeloDesconocido';
  } catch (error) {
    console.error('Error al decodificar el VIN:', error);
    return 'ModeloDesconocido';
  }
    // Aquí iría la lógica para decodificar el VIN, puedes ajustarla si tienes una API

  async function decodeVIN(vin) {
  if (!vin) return '';
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    return data?.Results?.[0]?.Model || 'ModeloDesconocido';
  } catch (error) {
    console.error('Error al decodificar el VIN:', error);
    return 'ModeloDesconocido';
  }
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
      const data = await res.json();
      const modelEntry = data.Results.find(entry => entry.Variable === 'Model');
      return modelEntry?.Value || 'Desconocido';
    } catch (err) {
      console.error("Error decodificando VIN:", err);
      return 'Error';
    }
  }
  }

  // Resto del código...
});
