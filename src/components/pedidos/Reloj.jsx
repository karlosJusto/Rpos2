import { useState, useEffect } from 'react';

function Reloj() {
  const [fechaHora, setFechaHora] = useState('');

  useEffect(() => {
    const actualizarFechaHora = () => {
      const ahora = new Date();
      const opciones = { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
      const fechaHoraFormateada = ahora.toLocaleDateString('es-ES', opciones);
      setFechaHora(fechaHoraFormateada);
    };

    actualizarFechaHora(); // Llamamos a la función por primera vez para inicializar
    const intervalo = setInterval(actualizarFechaHora, 1000); // Actualizamos cada segundo

    // Limpiamos el intervalo cuando el componente se desmonta
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div>
      <h1 className='font-nunito text-gray-400 text-[1.2vw] text-right font-bold'>{fechaHora}</h1>
    </div>
  );
}

export default Reloj;