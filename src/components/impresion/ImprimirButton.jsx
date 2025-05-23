// src/components/ImprimirButton.jsx
import React, { useState } from 'react';

// Es buena práctica tener la URL de la API configurable,
// por ejemplo, mediante variables de entorno. Para este ejemplo, lo mantenemos simple.
const API_URL = 'http://localhost:3000/imprimir';

const ImprimirButton = () => {
  const [textoParaImprimir, setTextoParaImprimir] = useState('Ticket de prueba desde React');

  const imprimir = async () => {
    if (!textoParaImprimir.trim()) {
      alert('Por favor, ingresa algún texto para imprimir.');
      return;
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texto: textoParaImprimir
        })
      });

      const responseBodyText = await response.text(); // Obtener el texto del cuerpo para más información

      if (!response.ok) {
        // El servidor devolvió un estado de error (4xx, 5xx)
        console.error(`Error del servidor: ${response.status} ${response.statusText}`, responseBodyText);
        alert(`Error del servidor: ${response.status} - ${responseBodyText || response.statusText}. Revisa la consola del servidor Node.js.`);
        return;
      }

      alert(`Servidor respondió: ${responseBodyText}`);
    } catch (error) {
      console.error('Error de red o al enviar la solicitud:', error);
      alert('Fallo al conectar con el servidor de impresión. Verifica que el servidor Node.js esté corriendo y revisa la consola del navegador y del servidor.');
    }
  };

  return (
    <div>
      <textarea
        value={textoParaImprimir}
        onChange={(e) => setTextoParaImprimir(e.target.value)}
        rows="4"
        cols="50"
        placeholder="Escribe aquí el texto para el ticket..."
      />
      <br />
      <button onClick={imprimir} style={{ marginTop: '10px' }}>
        Imprimir Ticket
      </button>
    </div>
  );
};

export default ImprimirButton;
