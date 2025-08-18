

document.addEventListener('DOMContentLoaded', () => {
  const vinInput = document.getElementById('vin');
  if (vinInput) {
    vinInput.addEventListener('blur', handleVinBlur);
  }
});

async function handleVinBlur() {
  const vin = document.getElementById('vin')?.value;
  if (vin?.length === 17) {
    const modeloInput = document.getElementById('modelo');
    modeloInput.value = await decodeVIN(vin);
  }
}

async function decodeVIN(vin) {
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
?format=json`);
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
