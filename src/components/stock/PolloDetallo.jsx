import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { collection, doc, updateDoc, onSnapshot, getDoc, writeBatch } from 'firebase/firestore';
import Table from 'react-bootstrap/Table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const PolloDetallo = () => {
  const [estadisticas, setEstadisticas] = useState([]);
  const [loading, setLoading] = useState(true);

  // FUNCIÓN PARA CORREGIR Y ACTUALIZAR DATOS (MODIFICADA)
  // Ahora acepta un stock inicial como punto de partida fiable
  const corregirYActualizarDatos = useCallback(async (datosSinCorregir, stockInicial) => {
    if (datosSinCorregir.length === 0) {
      setLoading(false);
      return;
    }

    // 1. OBTENER LAS VENTAS DE LA COLECCIÓN SECUNDARIA
    const ventasPromises = datosSinCorregir.map(item =>
      getDoc(doc(db, 'estadisticas_diarias2', item.dia))
    );
    const ventasDocs = await Promise.all(ventasPromises);
    const ventasDiarias = {};
    ventasDocs.forEach((docSnap, index) => {
      const dia = datosSinCorregir[index].dia;
      ventasDiarias[dia] = docSnap.exists() ? docSnap.data().vd || 0 : 0;
    });

    // 2. CORREGIR LA CADENA DE STOCK EN MEMORIA (LÓGICA MEJORADA)
    const datosCorregidos = [];
    // Usamos el stockInicial recibido como el primer "stockAnteriorCalculado"
    let stockAnteriorCalculado = stockInicial;

    datosSinCorregir.forEach((item) => {
      // Ya no necesitamos la condición para el índice 0. Siempre empezamos con el valor calculado anterior.
      const quedan = stockAnteriorCalculado;
      const ventas = ventasDiarias[item.dia] || 0;
      const total = quedan + (item.entran || 0);
      const stockFinal = total - ventas - (item.baja || 0) - (item.devueltos || 0);

      datosCorregidos.push({
        ...item,
        vd: ventas,
        stock_anterior: quedan,
        stock: stockFinal,
      });

      // El siguiente stock anterior será el stock final de este día
      stockAnteriorCalculado = stockFinal;
    });

    // 3. ACTUALIZAR EL ESTADO DE REACT
    setEstadisticas(datosCorregidos);
    setLoading(false);

    // 4. ACTUALIZAR FIRESTORE EN SEGUNDO PLANO
    try {
      const batch = writeBatch(db);
      let stockFinalDelPeriodo = 0;

      datosCorregidos.forEach(item => {
        const docRef = doc(db, 'estadisticas_diarias', item.dia);
        batch.update(docRef, {
          stock_anterior: item.stock_anterior,
          stock: item.stock,
          vd: item.vd,
          entran: item.entran || 0,
          baja: item.baja || 0,
          devueltos: item.devueltos || 0,
        });
        stockFinalDelPeriodo = item.stock;
      });

      const docRefProd = doc(db, 'productos', '1');
      batch.update(docRefProd, { stock: stockFinalDelPeriodo });

      await batch.commit();
      console.log("Corrección y actualización automática completada en Firestore.");
    } catch (error) {
      console.error("Error al actualizar los datos en Firebase:", error);
    }
  }, []);

  // EFECTO PRINCIPAL (MODIFICADO)
  useEffect(() => {
    setLoading(true);
    const estadisticasRef = collection(db, "estadisticas_diarias");
    const unsubscribe = onSnapshot(estadisticasRef, (querySnapshot) => {
      const datos = querySnapshot.docs.map(doc => ({
        dia: doc.id,
        ...doc.data()
      }));

      const datosOrdenados = datos.sort((a, b) => {
        return dayjs(a.dia, 'DD-MM-YYYY').diff(dayjs(b.dia, 'DD-MM-YYYY'));
      });
      
      if (datosOrdenados.length === 0) {
        setLoading(false);
        return;
      }

      // 1. OBTENEMOS 9 DÍAS EN LUGAR DE 8
      const datosConArranque = datosOrdenados.slice(-9);

      // 2. DETERMINAMOS EL STOCK INICIAL
      // Si tenemos menos de 9 días (por ejemplo al principio), el stock inicial es 0.
      // Si tenemos 9, el stock inicial es el stock final del primer día de la lista.
      const stockDeArranque = datosConArranque.length < 9 ? 0 : datosConArranque[0].stock || 0;
      
      // 3. SEPARAMOS LOS DATOS QUE REALMENTE VAMOS A MOSTRAR (LOS ÚLTIMOS 8)
      const datosParaMostrar = datosConArranque.slice(-8);

      // 4. Iniciar el proceso de corrección con el stock inicial correcto
      corregirYActualizarDatos(datosParaMostrar, stockDeArranque);

    }, (error) => {
      console.error("Error al obtener datos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [corregirYActualizarDatos]);

  const handleInputChange = (e, dia, campo) => {
    const value = parseFloat(e.target.value) || 0;
    const nuevasEstadisticas = estadisticas.map(item =>
      item.dia === dia ? { ...item, [campo]: value } : item
    );
    
    // Al recalcular, usamos el stock_anterior del primer elemento que ya está en el estado,
    // que fue corregido durante la carga inicial.
    const stockInicialRecalculo = estadisticas.length > 0 ? estadisticas[0].stock_anterior : 0;
    
    corregirYActualizarDatos(nuevasEstadisticas, stockInicialRecalculo);
  };
  
  const handleActualizarManual = () => {
      setLoading(true);
      const stockInicialRecalculo = estadisticas.length > 0 ? estadisticas[0].stock_anterior : 0;
      corregirYActualizarDatos(estadisticas, stockInicialRecalculo);
  }

  if (loading) {
    return <p className="text-center">Cargando y corrigiendo datos...</p>;
  }

  return (
    <div className="container my-4">
      <div className="overflow-auto max-h-[70vh] pt-[10vh]">
        <Table striped bordered hover size="sm" className="font-nunito min-w-full">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className='text-center'>
              <th>Día</th>
              <th>Quedan</th>
              <th>Entran</th>
              <th>Total</th>
              <th>Salen</th>
              <th>Baja</th>
              <th>Devueltos</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody className='text-center'>
            {estadisticas.map((item, index) => {
              const stockActualizado = item.stock_anterior + (item.entran || 0);
              const isEditable = index >= estadisticas.length - 3;
              const isMonday = item.diasemana && item.diasemana.toLowerCase() === 'lunes';

              return (
                <React.Fragment key={`fragment-${item.dia}`}>
                  {isMonday && (
                    <tr key={`separator-${item.dia}`} className="separator-row">
                      <td colSpan="8" className="text-center py-2"><span className="text-yellow-500 "></span></td>
                    </tr>
                  )}
                  <tr key={item.dia} className="table-row">
                    <td className="table-cell-width capitalize">{item.diasemana}, {item.dia}</td>
                    <td className="table-cell-width w-36 font-extrabold">{item.stock_anterior.toFixed(2)}</td>
                    <td className="table-cell-width text-center w-32">
                      <input type="number" value={item.entran === 0 ? '' : item.entran || ''} onChange={(e) => handleInputChange(e, item.dia, 'entran')} className="form-control w-24 mx-auto text-center" min="0" disabled={!isEditable}/>
                    </td>
                    <td className="table-cell-width w-40 font-extrabold">{stockActualizado.toFixed(2)}</td>
                    <td className="table-cell-width w-40 font-bold text-red-600">{item.vd}</td>
                    <td className="table-cell-width w-32">
                      <input type="number" value={item.baja === 0 ? '' : item.baja || ''} onChange={(e) => handleInputChange(e, item.dia, 'baja')} className="form-control w-24 mx-auto text-center" min="0" disabled={!isEditable}/>
                    </td>
                    <td className="table-cell-width w-40">
                      <input type="number" value={item.devueltos === 0 ? '' : item.devueltos || ''} onChange={(e) => handleInputChange(e, item.dia, 'devueltos')} className="form-control w-24 mx-auto text-center" min="0" disabled={!isEditable}/>
                    </td>
                    <td className="table-cell-width w-40 font-extrabold">{item.stock.toFixed(2)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className='flex text-center justify-center items-center'>
        <button className="mt-[2vw] w-[10vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none" onClick={handleActualizarManual}>
            <span className="ml-[0.5vw] font-nunito text-md">Actualizar</span>
        </button>
      </div>
    </div>
  );
};

export default PolloDetallo;