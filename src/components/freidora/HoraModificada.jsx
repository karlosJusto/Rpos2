import { useState, useEffect } from 'react';

function HoraModificada() {
  const [hora, setHora] = useState('');

  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date();
      
      // Sumar 15 minutos a la hora actual
      ahora.setMinutes(ahora.getMinutes() + 15);

      // Formateamos solo la hora y los minutos
      const opciones = { hour: 'numeric', minute: 'numeric' };
      const horaFormateada = ahora.toLocaleTimeString('es-ES', opciones);
      
      setHora(horaFormateada);
    };

    actualizarHora(); // Llamamos a la función por primera vez para inicializar
    const intervalo = setInterval(actualizarHora, 1000); // Actualizamos cada segundo

    // Limpiamos el intervalo cuando el componente se desmonta
    return () => clearInterval(intervalo);
  }, []);

  return (
   <>
      <h1 className='font-nunito text-gray-400 text-[1.2vw] text-right font-bold'>{hora}</h1>
   </>
  );
}

export default HoraModificada;
