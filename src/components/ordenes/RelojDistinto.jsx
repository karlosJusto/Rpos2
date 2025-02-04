import React, { useState, useEffect } from 'react';

const RelojDistinto = ({ fecha }) => {
  const [fechaDia, setFechaDia] = useState('');
  const [fechaRestante, setFechaRestante] = useState('');
  const [horaActual, setHoraActual] = useState('');

  //console.log(fecha); // Verifica la fecha que se pasa como parámetro

  const actualizarFechaHora = () => {
    let ahora;

    // Si se pasa una fecha, usa esa, si no, usa la fecha y hora actual
    if (fecha) {
      ahora = new Date(fecha); // Usamos la fecha pasada como parámetro

      // Si la fecha no tiene hora (es decir, tiene las 00:00:00), mantenemos la hora actual
      if (isNaN(ahora.getHours()) || ahora.getHours() === 0) {
        const ahoraActual = new Date(); // Fecha actual con hora y minutos actuales
        ahora.setHours(ahoraActual.getHours(), ahoraActual.getMinutes(), ahoraActual.getSeconds());
      }
    } else {
      ahora = new Date(); // Si no se pasa fecha, usamos la fecha y hora actual
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

    // Opcional: Si deseas que la hora se actualice cada minuto, puedes usar un setInterval.
    const intervalo = setInterval(() => {
      actualizarFechaHora();
    }, 60000); // Actualiza cada minuto

    // Limpiar intervalo cuando el componente se desmonte
    return () => clearInterval(intervalo);
  }, [fecha]);  // La dependencia es la fecha, se actualizará si cambia

  return (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg ">
      <div className="text-[1vw] font-semibold  text-white font-nunito">{fechaDia}</div>  {/* Día de la semana */}
      <div className="text-[1.25vw] text-white font-nunito">{fechaRestante}</div>  {/* Fecha DD/MM/AA */}
      <div className="text-[1.10vw] text-white p-1 bg-gray-700 rounded-md font-nunito">{horaActual}</div>  {/* Hora en formato HH:mm */}
    </div>
  );
};

export default RelojDistinto;
