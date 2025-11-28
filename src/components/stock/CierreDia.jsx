import { collection, getDocs, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../components/firebase/firebase';
import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';

const CierreDia = ({ onCierre }) => {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [isLastHourAvailable, setIsLastHourAvailable] = useState(false);

  const [isVisible, setIsVisible] = useState(false);

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

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'shop_data', 'last_hour'), (doc) => {
      if (doc.exists()) {
        setIsLastHourAvailable(doc.data().available);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkTime = async () => {
      const now = dayjs();
      const currentHour = now.hour();
      const currentMinute = now.minute();

      // Visibility Logic
      // Visible: 00:01 - 16:00 (inclusive of 16:00 minute)
      const isMorning = (currentHour === 0 && currentMinute >= 1) || (currentHour > 0 && currentHour < 16) || (currentHour === 16 && currentMinute === 0);

      // Evening: 16:01 - 23:59
      const isEvening = (currentHour === 16 && currentMinute >= 1) || (currentHour > 16);

      setIsVisible(isMorning || isEvening);

      // Auto-off at 16:00 and 00:00
      const isSwitchOffTime = (currentHour === 16 && currentMinute === 0) || (currentHour === 0 && currentMinute === 0);

      if (isSwitchOffTime && isLastHourAvailable) {
        try {
          await updateDoc(doc(db, 'shop_data', 'last_hour'), {
            available: false
          });
          console.log("Auto-turning off Last Hour availability");
        } catch (error) {
          console.error("Error auto-turning off last hour:", error);
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [isLastHourAvailable]);

  const toggleLastHour = async () => {
    try {
      const docRef = doc(db, 'shop_data', 'last_hour');
      await updateDoc(docRef, {
        available: !isLastHourAvailable
      });
    } catch (error) {
      console.error("Error updating last hour availability:", error);
      alert("Error al actualizar el estado de pedidos última hora");
    }
  };

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

      {isVisible && (
        <button
          onClick={toggleLastHour}
          className={`ml-4 px-4 py-1 font-nunito font-bold rounded-md shadow-md transition-colors duration-300 ${isLastHourAvailable
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
            }`}
        >
          Online Pedido Rapido: {isLastHourAvailable ? 'ON' : 'OFF'}
        </button>
      )}
    </div>
  );
};

export default CierreDia;