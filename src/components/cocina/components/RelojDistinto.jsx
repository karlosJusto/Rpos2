import React, { useState, useEffect } from 'react';

const RelojDistinto = ({ fecha, isToday }) => {
  const [fechaDia, setFechaDia] = useState('');
  const [fechaRestante, setFechaRestante] = useState('');
  const [horaActual, setHoraActual] = useState('');

  const actualizarFechaHora = () => {
    let ahora;

    if (isToday) {
      // Si es hoy, siempre usar la hora actual para que el reloj avance.
      ahora = new Date();
    } else if (fecha) {
      // Si es un día de supervisión (no hoy), usar la fecha proporcionada.
      ahora = new Date(fecha);
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

    // Array con los nombres de los días de la semana, considerando que la semana empieza el lunes
    const diasDeLaSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    // Obtenemos el día de la semana (ajustamos para que lunes sea 0)
    const diaSemana = diasDeLaSemana[(ahora.getDay() + 6) % 7];  // Ajuste para que lunes sea 0
    const dia = String(ahora.getDate()).padStart(2, '0');  // Día con ceros a la izquierda
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');  // Mes con ceros a la izquierda
    const año = String(ahora.getFullYear()).slice(2);  // Año con 2 dígitos

    // Obtener hora en formato 24 horas (HH:mm)
    const horas = String(ahora.getHours()).padStart(2, '0');  // Hora con ceros a la izquierda
    const minutos = String(ahora.getMinutes()).padStart(2, '0');  // Minutos con ceros a la izquierda
    const horaFormateada = `${horas}:${minutos}`;

    // Formato final "Lunes" y "DD/MM/AA"
    const fechaDia = diaSemana;  // El día de la semana (Lunes, Martes, etc.)
    const fechaRestante = `${dia}/${mes}/${año}`;  // El día, mes y año

    // Guardamos los valores en el estado
    setFechaDia(fechaDia);
    setFechaRestante(fechaRestante);
    setHoraActual(horaFormateada);
  };

  useEffect(() => {
    actualizarFechaHora();  // Llamamos a la función al montar el componente

    // Actualizar la hora cada minuto.
    const intervalo = setInterval(() => {
      actualizarFechaHora();
    }, 60000); // Actualiza cada minuto

    // Limpiar intervalo cuando el componente se desmonte
    return () => clearInterval(intervalo);
  }, [fecha, isToday]);  // Actualizar si 'fecha' o 'isToday' cambian

  return (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg ">
      <div className="text-[1vw] font-semibold  text-white font-nunito">{fechaDia}</div>  {/* Día de la semana */}
      <div className="text-[1vw] text-white font-nunito">{fechaRestante}</div>  {/* Fecha DD/MM/AA */}
      <div className="text-[0.9vw] text-white p-1 bg-gray-700 rounded-md font-nunito">{horaActual}</div>  {/* Hora en formato HH:mm */}
    </div>
  );
};

export default RelojDistinto;
