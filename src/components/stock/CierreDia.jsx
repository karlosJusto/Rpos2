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

      setMensaje(`Cierre del día ${fechaHoy} guardado con éxito.`);
    } catch (error) {
      console.error("Error al cerrar el día: ", error);
      setMensaje("Error al guardar el cierre. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '2px dashed red', padding: '20px', margin: '20px', textAlign: 'center' }}>
      <h3 style={{ marginTop: 0 }}>Panel de Cierre de Día</h3>
      <p>Pulsa este botón AL FINAL de la jornada para guardar el stock de todos los productos.</p>
      <button onClick={handleCerrarDia} disabled={loading} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: 'red', color: 'white' }}>
        {loading ? 'Guardando...' : 'Cerrar Día y Guardar Stock Final'}
      </button>
      {mensaje && <p style={{ marginTop: '10px' }}>{mensaje}</p>}
    </div>
  );
};

export default CierreDia;