import React, { useState } from 'react';
import { db } from '../../components/firebase/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';

const CierreDia = () => {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleCerrarDia = async () => {
    if (!window.confirm("¿Estás seguro de que quieres cerrar el día? Esta acción guardará el stock final de HOY para TODOS los productos y no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      // 1. Obtener TODOS los productos de la colección 'productos'
      const productosSnapshot = await getDocs(collection(db, 'productos'));

      const stockFinalDelDia = {};
      productosSnapshot.forEach((productoDoc) => {
        const productoData = productoDoc.data();
        // Guardamos el stock usando el ID del producto como clave
        stockFinalDelDia[productoDoc.id] = productoData.stock || 0;
      });

      // 2. Definir el documento con la fecha de HOY como ID
      const fechaHoy = dayjs().format('YYYY-MM-DD');
      const historicoDocRef = doc(db, 'historialStock', fechaHoy);

      // 3. Guardar el objeto con todos los stocks en ese documento
      await setDoc(historicoDocRef, {
        fecha: new Date(),
        stocks: stockFinalDelDia,
      });

    } catch (error) {
      console.error("Error al cerrar el día: ", error);
      setMensaje("Error al guardar el cierre.");
    } finally {
      setLoading(false);
      // Ocultar el mensaje después de unos segundos
      setTimeout(() => setMensaje(''), 4000);
    }
  };

  return (
    <div className="flex items-center ml-4">
      <button
        onClick={handleCerrarDia}
        disabled={loading}
        className="px-4 py-1 bg-red-600 text-white font-nunito font-bold rounded-md shadow-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-300"
      >
        {loading ? 'Guardando...' : 'Cerrar Día'}
      </button>

    </div>
  );
};

export default CierreDia;