import React, { useState, useMemo } from 'react';
import { db } from '../../components/firebase/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';

const CierreDia = ({ onCierre }) => {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Determina la configuración del turno basado en la hora actual y si es domingo
  const { textoBoton, mensajeConfirmacion, mensajeExito, fechaDestino } = useMemo(() => {
    const ahora = dayjs();
    const hoyEsDomingo = ahora.day() === 0; // 0 para Domingo en dayjs

    // Es turno de mañana lógico solo si es de Lunes a Sábado antes de las 18h
    const esTurnoMananaLogico = ahora.hour() < 18 && !hoyEsDomingo;

    if (esTurnoMananaLogico) {
      // TURNO MAÑANA (Lunes a Sábado)
      const fechaAyer = ahora.subtract(1, 'day').format('YYYY-MM-DD');
      return {
        textoBoton: 'Cierre Mañana',
        mensajeConfirmacion: `¿Estás seguro de cerrar el turno de MAÑANA?\n\n⚠️`,
        mensajeExito: `Cierre de AYER (${fechaAyer}) guardado/actualizado con éxito.`,
        fechaDestino: fechaAyer,
      };
    } else {
      // TURNO TARDE (Lunes a Sábado >= 18h) O DOMINGO (cualquier hora)
      const fechaHoy = ahora.format('YYYY-MM-DD');
      return {
        textoBoton: 'Cierre Tarde',
        mensajeConfirmacion: `¿Estás seguro de cerrar el turno de TARDE?\n).`,
        mensajeExito: `Cierre de HOY (${fechaHoy}) guardado con éxito.`,
        fechaDestino: fechaHoy,
      };
    }
  }, []);

  const handleCerrarDia = async () => {
    if (!window.confirm(mensajeConfirmacion)) {
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      if (onCierre) {
        console.log(`CierreDia: Ejecutando onCierre para ${textoBoton}...`);
        await onCierre();
        console.log("CierreDia: onCierre completado.");
      }

      const productosSnapshot = await getDocs(collection(db, 'productos'));
      const stockFinalDelTurno = {};
      productosSnapshot.forEach((productoDoc) => {
        const productoData = productoDoc.data();
        stockFinalDelTurno[productoDoc.id] = productoData.stock || 0;
      });

      const historicoDocRef = doc(db, 'historialStock', fechaDestino);

      await setDoc(historicoDocRef, {
        fecha: new Date(),
        stocks: stockFinalDelTurno,
      });

      setMensaje(mensajeExito);

    } catch (error) {
      console.error("Error al cerrar el turno: ", error);
      setMensaje("Error al guardar el cierre.");
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(''), 5000);
    }
  };

  return (
    <div className="flex items-center ml-4">
      <button
        onClick={handleCerrarDia}
        disabled={loading}
        className="px-4 py-1 bg-red-600 text-white font-nunito font-bold rounded-md shadow-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300"
      >
        {loading ? 'Guardando...' : textoBoton}
      </button>
      {mensaje && <p className="ml-4 text-sm font-semibold text-white">{mensaje}</p>}
    </div>
  );
};

export default CierreDia;