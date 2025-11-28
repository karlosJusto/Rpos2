import React, { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase';
import { collection, doc, onSnapshot, getDoc, writeBatch } from 'firebase/firestore';
import Table from 'react-bootstrap/Table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const PolloDetallo = () => {
  const [estadisticas, setEstadisticas] = useState([]);
  const [loading, setLoading] = useState(true);
  const isUpdatingFromListener = useRef(true);

  // Función pura que solo recalcula la cadena de stock en memoria
  const recalcularCadenaDeStock = useCallback((datosEntrada, stockInicial) => {
    if (!datosEntrada || datosEntrada.length === 0) {
      return [];
    }
    const datosCorregidos = [];
    let stockAnteriorCalculado = stockInicial;

    datosEntrada.forEach((item) => {
      const quedan = stockAnteriorCalculado;
      const ventas = item.vd || 0;
      const total = quedan + (item.entran || 0);
      const stockFinal = total - ventas - (item.baja || 0) - (item.devueltos || 0);

      datosCorregidos.push({
        ...item,
        stock_anterior: quedan,
        stock: stockFinal,
      });
      stockAnteriorCalculado = stockFinal;
    });
    return datosCorregidos;
  }, []);

  // Efecto principal para escuchar cambios externos en Firestore
  useEffect(() => {
    setLoading(true);
    const estadisticasRef = collection(db, "estadisticas_diarias");
    
    const unsubscribe = onSnapshot(estadisticasRef, async (querySnapshot) => {
        if (!isUpdatingFromListener.current) {
            isUpdatingFromListener.current = true;
            return;
        }

      const datos = querySnapshot.docs.map(doc => ({ dia: doc.id, ...doc.data() }));
      const datosOrdenados = datos.sort((a, b) => dayjs(a.dia, 'DD-MM-YYYY').diff(dayjs(b.dia, 'DD-MM-YYYY')));
      
      if (datosOrdenados.length === 0) {
        setLoading(false);
        return;
      }
      
      const datosConArranque = datosOrdenados.slice(-9);
      const stockDeArranque = datosConArranque.length < 9 ? 0 : datosConArranque[0].stock || 0;
      const datosParaMostrar = datosConArranque.slice(-8);

      const ventasPromises = datosParaMostrar.map(item => getDoc(doc(db, 'estadisticas_diarias2', item.dia)));
      const ventasDocs = await Promise.all(ventasPromises);
      const datosConVentas = datosParaMostrar.map((item, index) => {
        const ventaDoc = ventasDocs[index];
        return { ...item, vd: ventaDoc.exists() ? ventaDoc.data().vd || 0 : 0 };
      });

      const datosRecalculados = recalcularCadenaDeStock(datosConVentas, stockDeArranque);
      setEstadisticas(datosRecalculados);
      setLoading(false);

    }, (error) => {
      console.error("Error al obtener datos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [recalcularCadenaDeStock]);

  // Maneja cambios en los inputs, actualizando solo el estado local
  const handleInputChange = (e, dia, campo) => {
    const value = parseFloat(e.target.value) || 0;
    
    const nuevasEstadisticas = estadisticas.map(item =>
      item.dia === dia ? { ...item, [campo]: value } : item
    );
    
    const stockInicialRecalculo = nuevasEstadisticas.length > 0 ? nuevasEstadisticas[0].stock_anterior : 0;
    const datosRecalculados = recalcularCadenaDeStock(nuevasEstadisticas, stockInicialRecalculo);

    setEstadisticas(datosRecalculados);
  };
  
  // El botón "Actualizar" es el único que escribe en Firestore
  const handleActualizarManual = async () => {
      setLoading(true);
      try {
        const batch = writeBatch(db);
        let stockFinalDelPeriodo = 0;

        estadisticas.forEach(item => {
          const docRef = doc(db, 'estadisticas_diarias', item.dia);
          batch.update(docRef, {
            stock_anterior: item.stock_anterior,
            stock: item.stock,
            entran: item.entran || 0,
            baja: item.baja || 0,
            devueltos: item.devueltos || 0,
          });
          stockFinalDelPeriodo = item.stock;
        });

        const docRefProd = doc(db, 'productos', '1');
        batch.update(docRefProd, { stock: stockFinalDelPeriodo });
        
        isUpdatingFromListener.current = false;
        await batch.commit();

        console.log("¡Datos actualizados en Firestore correctamente!");
        
      } catch (error) {
        console.error("Error al actualizar los datos en Firebase:", error);
        isUpdatingFromListener.current = true;
      } finally {
        setLoading(false);
      }
  };

  if (loading && estadisticas.length === 0) {
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