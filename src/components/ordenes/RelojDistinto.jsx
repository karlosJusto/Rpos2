import React, { useState, useEffect } from 'react';

// Función pura para calcular los datos del reloj
const calculateDateTime = (currentFecha, currentIsToday) => {
    let ahora;
    if (currentIsToday) {
      // Si es hoy, siempre usar la hora actual para que el reloj avance.
      ahora = new Date();
    } else if (currentFecha) {
      // Si es un día de supervisión (no hoy), usar la fecha proporcionada.
      ahora = new Date(currentFecha);
      // Si la fecha de supervisión está a medianoche (común en selectores de fecha),
      // mostrar la hora actual del día, pero para esa fecha seleccionada.
      if (ahora.getHours() === 0 && ahora.getMinutes() === 0 && ahora.getSeconds() === 0) {
        const ahoraReal = new Date();
        ahora.setHours(ahoraReal.getHours(), ahoraReal.getMinutes(), ahoraReal.getSeconds());
      }
      // Si 'fecha' ya tiene una hora específica, se usará esa.
    } else {
      // Fallback si 'fecha' no se proporciona y no es 'isToday' (debería ser manejado por el componente padre)
      ahora = new Date();
    }

    const diasDeLaSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const diaSemanaCalculado = diasDeLaSemana[(ahora.getDay() + 6) % 7];  // Ajuste para que lunes sea 0
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const año = String(ahora.getFullYear()).slice(2);
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const horaFormateada = `${horas}:${minutos}`;
    const fechaRestanteCalculada = `${dia}/${mes}/${año}`;

    return {
        diaSemana: diaSemanaCalculado,
        fechaRestante: fechaRestanteCalculada,
        hora: horaFormateada,
    };
};

const RelojDistinto = ({ fecha, isToday }) => {
  // Inicializar el estado con los valores calculados
  const [dateTime, setDateTime] = useState(() => calculateDateTime(fecha, isToday));

  const actualizarFechaHora = () => {
    const newDateTime = calculateDateTime(fecha, isToday);
    setDateTime(newDateTime);
  };


  useEffect(() => {
    // Actualizar si las props cambian
    actualizarFechaHora();

    // Actualizar la hora cada minuto.
    const intervalo = setInterval(() => {
      // Solo necesitamos recalcular si es "hoy" para que la hora avance.
      // Si no es "hoy", la fecha/hora es fija basada en la prop 'fecha'.
      if (isToday) {
        setDateTime(calculateDateTime(null, true)); // Forzar uso de new Date()
      }
    }, 60000); // Actualiza cada minuto

    // Limpiar intervalo cuando el componente se desmonte
    return () => clearInterval(intervalo);
  }, [fecha, isToday]);  // Actualizar si 'fecha' o 'isToday' cambian

  return (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg ">
      <div className="text-[1vw] font-semibold  text-white font-nunito">{dateTime.diaSemana}</div>  {/* Día de la semana */}
      <div className="text-[1vw] text-white font-nunito">{dateTime.fechaRestante}</div>  {/* Fecha DD/MM/AA */}
      <div className="text-[0.9vw] text-white p-1 bg-gray-700 rounded-md font-nunito">{dateTime.hora}</div>  {/* Hora en formato HH:mm */}
    </div>
  );
};

export default React.memo(RelojDistinto);
