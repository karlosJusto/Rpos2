import React, { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase';
import { collection, doc, getDoc, getDocs, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import Table from 'react-bootstrap/Table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.locale('es');

const MIN_WEEK_OFFSET = -1;
const MAX_WEEK_OFFSET = 1;

const PolloDetallo = () => {
  const [estadisticas, setEstadisticas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const isMountedRef = useRef(true);

  const [rawFirestoreData, setRawFirestoreData] = useState({});
  const [rawSalesData, setRawSalesData] = useState({});
  const [pendingOrders, setPendingOrders] = useState(0);

  const buildWeekDays = useCallback((offset) => {
    const targetDate = dayjs().add(offset, 'week');
    const startOfView = targetDate.startOf('isoWeek');
    const endOfView = targetDate.endOf('isoWeek');
    const daysToGenerate = [];
    let currentDay = startOfView;

    while (currentDay.isBefore(endOfView) || currentDay.isSame(endOfView, 'day')) {
      daysToGenerate.push(currentDay.format('DD-MM-YYYY'));
      currentDay = currentDay.add(1, 'day');
    }

    return daysToGenerate;
  }, []);

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

  const loadThreeWeekWindow = useCallback(async () => {
    const previousWeekDays = buildWeekDays(MIN_WEEK_OFFSET);
    const currentWeekDays = buildWeekDays(0);
    const nextWeekDays = buildWeekDays(MAX_WEEK_OFFSET);
    const firstDay = previousWeekDays[0];
    const anchorDay = dayjs(firstDay, 'DD-MM-YYYY').subtract(1, 'day').format('DD-MM-YYYY');
    const allDays = [...new Set([anchorDay, ...previousWeekDays, ...currentWeekDays, ...nextWeekDays])];

    const [estadisticasDocs, ventasDocs] = await Promise.all([
      Promise.all(allDays.map((dia) => getDoc(doc(db, 'estadisticas_diarias', dia)))),
      Promise.all(allDays.map((dia) => getDoc(doc(db, 'estadisticas_diarias2', dia)))),
    ]);

    const statsByDay = {};
    const salesByDay = {};

    allDays.forEach((dia, index) => {
      const estadisticaDoc = estadisticasDocs[index];
      const ventaDoc = ventasDocs[index];

      statsByDay[dia] = estadisticaDoc.exists() ? estadisticaDoc.data() : null;
      salesByDay[dia] = ventaDoc.exists() ? (ventaDoc.data().vd || 0) : 0;
    });

    return { statsByDay, salesByDay };
  }, [buildWeekDays]);

  const processDataForView = useCallback((rawData, ventasData, offset) => {
    const daysToGenerate = buildWeekDays(offset);
    const startOfView = dayjs(daysToGenerate[0], 'DD-MM-YYYY');
    const dayBeforeStart = startOfView.subtract(1, 'day').format('DD-MM-YYYY');
    const prevDoc = rawData[dayBeforeStart];
    let stockDeArranque = prevDoc ? (prevDoc.stock || 0) : 0;

    if (offset > 0) {
      const previousWeekDays = buildWeekDays(offset - 1);
      const previousWeekStart = dayjs(previousWeekDays[0], 'DD-MM-YYYY');
      const previousWeekAnchorDay = previousWeekStart.subtract(1, 'day').format('DD-MM-YYYY');
      const previousWeekAnchorDoc = rawData[previousWeekAnchorDay];
      const previousWeekInitialStock = previousWeekAnchorDoc ? (previousWeekAnchorDoc.stock || 0) : 0;

      const previousWeekData = previousWeekDays.map((diaStr) => {
        const existingData = rawData[diaStr];
        const dateObj = dayjs(diaStr, 'DD-MM-YYYY');
        const diasemana = dateObj.format('dddd');

        if (existingData) {
          return {
            dia: diaStr,
            ...existingData,
            diasemana,
            vd: ventasData[diaStr] || 0,
          };
        }

        return {
          dia: diaStr,
          diasemana,
          stock_anterior: 0,
          entran: 0,
          baja: 0,
          devueltos: 0,
          stock: 0,
          vd: ventasData[diaStr] || 0,
        };
      });

      const previousWeekRecalculated = recalcularCadenaDeStock(previousWeekData, previousWeekInitialStock);
      if (previousWeekRecalculated.length > 0) {
        stockDeArranque = previousWeekRecalculated[previousWeekRecalculated.length - 1].stock;
      }
    }

    const datosParaMostrar = daysToGenerate.map(diaStr => {
      const existingData = rawData[diaStr];
      const dateObj = dayjs(diaStr, 'DD-MM-YYYY');
      const diasemana = dateObj.format('dddd');

      if (existingData) {
        return { dia: diaStr, ...existingData, diasemana };
      } else {
        return {
          dia: diaStr,
          diasemana,
          stock_anterior: 0,
          entran: 0,
          baja: 0,
          devueltos: 0,
          stock: 0,
          vd: 0
        };
      }
    });

    const datosConVentas = datosParaMostrar.map((item) => ({
      ...item,
      vd: ventasData[item.dia] || 0,
    }));

    const datosRecalculados = recalcularCadenaDeStock(datosConVentas, stockDeArranque);
    setEstadisticas(datosRecalculados);
  }, [buildWeekDays, recalcularCadenaDeStock]);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchWindowData = async () => {
      setLoading(true);
      try {
        const { statsByDay, salesByDay } = await loadThreeWeekWindow();
        if (!isMountedRef.current) return;

        setRawFirestoreData(statsByDay);
        setRawSalesData(salesByDay);
      } catch (error) {
        console.error("Error al obtener datos:", error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchWindowData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadThreeWeekWindow]);

  useEffect(() => {
    if (weekOffset !== 0) {
      setPendingOrders(0);
      return;
    }

    const fetchPendingOrders = async () => {
      try {
        const pedidosRef = collection(db, "pedidos");
        const pedidosQuery = query(pedidosRef, orderBy("NumeroPedido", "desc"), limit(1500));
        const snapshot = await getDocs(pedidosQuery);
        let totalPollo = 0;
        const now = dayjs();
        const endOfView = now.endOf('isoWeek');
        const filterStart = now.add(1, 'day').startOf('day');

        snapshot.forEach((pedidoDoc) => {
          const data = pedidoDoc.data();
          if (!data.fechahora) return;

          const [datePart] = data.fechahora.split(' ');
          if (!datePart) return;
          const orderDate = dayjs(datePart, 'DD/MM/YYYY');

          if (orderDate.isValid() && orderDate.isBetween(filterStart, endOfView, 'day', '[]')) {
            if (data.productos && Array.isArray(data.productos)) {
              data.productos.forEach((prod) => {
                const cant = Number(prod.cantidad) || 0;
                const lowerName = (prod.nombre || prod.alias || '').toLowerCase();

                let qtyToAdd = 0;
                if (prod.id === 1 || lowerName.includes('menú pollo entero')) {
                  qtyToAdd = cant;
                } else if ([2, 39, 40].includes(prod.id) || lowerName.includes('menú pollo') || lowerName.includes('medio pollo')) {
                  qtyToAdd = (cant * 0.5);
                }

                if (qtyToAdd > 0) {
                  totalPollo += qtyToAdd;
                }
              });
            }
          }
        });

        if (isMountedRef.current) {
          setPendingOrders(totalPollo);
        }
      } catch (error) {
        console.error("Error al obtener encargos pendientes:", error);
        if (isMountedRef.current) {
          setPendingOrders(0);
        }
      }
    };

    fetchPendingOrders();
  }, [weekOffset]);

  useEffect(() => {
    if (Object.keys(rawFirestoreData).length === 0) {
      return;
    }

    processDataForView(rawFirestoreData, rawSalesData, weekOffset);
    if (isMountedRef.current) {
      setLoading(false);
    }
  }, [rawFirestoreData, rawSalesData, weekOffset, processDataForView]);


  const handleInputChange = (e, dia, campo) => {
    const value = parseFloat(e.target.value) || 0;

    const nuevasEstadisticas = estadisticas.map(item =>
      item.dia === dia ? { ...item, [campo]: value } : item
    );

    const stockInicialRecalculo = estadisticas.length > 0 ? estadisticas[0].stock_anterior : 0;
    const datosRecalculados = recalcularCadenaDeStock(nuevasEstadisticas, stockInicialRecalculo);

    setEstadisticas(datosRecalculados);
  };

  const handleActualizarManual = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let stockFinalDelPeriodo = 0;

      estadisticas.forEach(item => {
        const docRef = doc(db, 'estadisticas_diarias', item.dia);
        // Actualizamos datos y nos aseguramos de que el día de la semana sea el correcto
        batch.set(docRef, {
          stock_anterior: item.stock_anterior,
          stock: item.stock,
          entran: item.entran || 0,
          baja: item.baja || 0,
          devueltos: item.devueltos || 0,
          diasemana: item.diasemana || dayjs(item.dia, 'DD-MM-YYYY').format('dddd')
        }, { merge: true });
        stockFinalDelPeriodo = item.stock;
      });

      const docRefProd = doc(db, 'productos', '1');
      batch.update(docRefProd, { stock: stockFinalDelPeriodo });

      await batch.commit();
      setRawFirestoreData((prev) => {
        const updatedData = { ...prev };
        estadisticas.forEach((item) => {
          updatedData[item.dia] = {
            ...(updatedData[item.dia] || {}),
            stock_anterior: item.stock_anterior,
            stock: item.stock,
            entran: item.entran || 0,
            baja: item.baja || 0,
            devueltos: item.devueltos || 0,
            diasemana: item.diasemana || dayjs(item.dia, 'DD-MM-YYYY').format('dddd')
          };
        });
        return updatedData;
      });

      console.log("¡Datos actualizados en Firestore correctamente!");

    } catch (error) {
      console.error("Error al actualizar los datos en Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeWeek = (direction) => {
    setWeekOffset((prev) => Math.max(MIN_WEEK_OFFSET, Math.min(MAX_WEEK_OFFSET, prev + direction)));
  };

  // Calculations for Summary/Footer
  const todayStr = dayjs().format('DD-MM-YYYY');

  let stockActual = 0;
  if (weekOffset === 0) {
    const todayItem = estadisticas.find(i => i.dia === todayStr);
    stockActual = todayItem ? todayItem.stock : (estadisticas.length > 0 ? estadisticas[estadisticas.length - 1].stock : 0);
  } else {
    stockActual = estadisticas.length > 0 ? estadisticas[0].stock_anterior : 0;
  }

  const stockDomingo = estadisticas.length > 0 ? estadisticas[estadisticas.length - 1].stock : 0;
  const sobran = stockDomingo;

  if (loading && estadisticas.length === 0) {
    return <p className="text-center font-nunito text-lg mt-10">Cargando...</p>;
  }

  const canGoToPreviousWeek = weekOffset > MIN_WEEK_OFFSET;
  const canGoToNextWeek = weekOffset < MAX_WEEK_OFFSET;

  return (
    <div className="container my-2">
      {/* Header Compacto */}
      <div className="flex justify-between items-center px-4 mb-2">
        <div
          className={`flex items-center transition-colors select-none group ${canGoToPreviousWeek ? 'cursor-pointer text-yellow-600 hover:text-yellow-800' : 'cursor-not-allowed text-gray-300'}`}
          onClick={() => canGoToPreviousWeek && changeWeek(-1)}
        >
          <div className={`p-1.5 rounded-full transition-colors ${canGoToPreviousWeek ? 'bg-yellow-100 group-hover:bg-yellow-200' : 'bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className={`ml-1 font-bold font-nunito text-md ${canGoToPreviousWeek ? 'group-hover:underline decoration-yellow-500 underline-offset-4' : ''}`}>Anterior</span>
        </div>

        <div className="font-nunito font-bold text-gray-700 text-lg tracking-wide bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
          {estadisticas.length > 0 ? (
            <span className="capitalize">
              {/* Simplified Date Range Title */}
              {dayjs(estadisticas[0].dia, 'DD-MM-YYYY').format('D MMM')} - {dayjs(estadisticas[estadisticas.length - 1].dia, 'DD-MM-YYYY').format('D MMM YYYY')}
            </span>
          ) : 'Calendario'}
        </div>

        <div
          className={`flex items-center transition-colors select-none group ${canGoToNextWeek ? 'cursor-pointer text-yellow-600 hover:text-yellow-800' : 'cursor-not-allowed text-gray-300'}`}
          onClick={() => canGoToNextWeek && changeWeek(1)}
        >
          <span className={`mr-1 font-bold font-nunito text-md ${canGoToNextWeek ? 'group-hover:underline decoration-yellow-500 underline-offset-4' : ''}`}>Siguiente</span>
          <div className={`p-1.5 rounded-full transition-colors ${canGoToNextWeek ? 'bg-yellow-100 group-hover:bg-yellow-200' : 'bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table Container - Compact & Scrollable only if needed but likely fits now */}
      <div className="shadow-lg rounded-t-xl bg-white border border-gray-100 overflow-hidden">
        <Table striped bordered hover size="sm" className="font-nunito min-w-full mb-0">
          <thead className="bg-yellow-50">
            <tr className='text-center text-gray-700 uppercase text-xs tracking-wider'>
              <th className="py-2 border-b border-yellow-200 w-32">Día</th>
              <th className="py-2 border-b border-yellow-200">Quedan</th>
              <th className="py-2 border-b border-yellow-200">Entran</th>
              <th className="py-2 border-b border-yellow-200">Total</th>
              <th className="py-2 border-b border-yellow-200">Salen</th>
              <th className="py-2 border-b border-yellow-200">Baja</th>
              <th className="py-2 border-b border-yellow-200">Devueltos</th>
              <th className="py-2 border-b border-yellow-200">Stock</th>
            </tr>
          </thead>
          <tbody className='text-center text-sm'>
            {estadisticas.map((item, index) => {
              const stockActualizado = item.stock_anterior + (item.entran || 0);
              const rowDate = dayjs(item.dia, 'DD-MM-YYYY');
              const today = dayjs().startOf('day');
              const isHighlight = item.dia === dayjs().format('DD-MM-YYYY');
              const isFutureOrderDay = rowDate.isAfter(today, 'day');
              const highlightCellClass = isHighlight ? 'bg-amber-100/80 text-slate-900' : '';
              const highlightInputClass = isHighlight ? 'bg-white border-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.18)]' : 'bg-white';

              // Rule: Only allow editing 'baja' and 'devueltos' for the last 3 days
              const daysDiff = today.diff(rowDate, 'day');
              const isRestrictedLocked = daysDiff > 3;

              return (
                <tr key={item.dia} className={`transition-colors h-10 ${isHighlight ? 'bg-amber-50 shadow-[inset_6px_0_0_0_rgba(217,119,6,1),inset_0_2px_0_0_rgba(252,211,77,0.9),inset_0_-2px_0_0_rgba(252,211,77,0.9)]' : 'hover:bg-gray-50'}`}>
                  <td className={`capitalize font-medium py-1 px-3 border-r border-gray-100 align-middle whitespace-nowrap ${isHighlight ? 'font-extrabold text-slate-950 bg-amber-100/90' : 'text-gray-800'}`}>
                    {/* Format: "Lunes 3" - Cleaner and less "alargado" */}
                    {rowDate.format('dddd D')}
                  </td>
                  <td className={`w-24 font-bold align-middle border-r border-gray-100 ${isHighlight ? highlightCellClass : 'text-gray-600 bg-gray-50/50'}`}>
                    {item.stock_anterior.toFixed(2)}
                  </td>
                  <td className={`text-center w-24 align-middle border-r border-gray-100 ${highlightCellClass}`}>
                    <input
                      type="number"
                      value={item.entran === 0 ? '' : item.entran || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'entran')}
                      className={`form-control w-16 mx-auto text-center border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 rounded-md shadow-sm h-7 text-sm p-0 ${highlightInputClass}`}
                      min="0"

                    />
                  </td>
                  <td className={`w-24 font-bold align-middle border-r border-gray-100 ${isHighlight ? highlightCellClass : 'text-gray-700 bg-gray-50/50'}`}>
                    {stockActualizado.toFixed(2)}
                  </td>
                  <td className={`w-24 font-bold align-middle border-r border-gray-100 ${isFutureOrderDay ? 'text-yellow-500 bg-yellow-50' : 'text-red-600'} ${isHighlight ? 'bg-amber-100/80' : ''}`}>
                    {item.vd}
                  </td>
                  <td className={`w-24 align-middle border-r border-gray-100 ${highlightCellClass}`}>
                    <input
                      type="number"
                      value={item.baja === 0 ? '' : item.baja || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'baja')}
                      className={`form-control w-16 mx-auto text-center border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 rounded-md shadow-sm h-7 text-sm p-0 ${isRestrictedLocked ? 'bg-gray-100 text-gray-400' : highlightInputClass}`}
                      min="0"
                      disabled={isRestrictedLocked}
                    />
                  </td>
                  <td className={`w-24 align-middle border-r border-gray-100 ${highlightCellClass}`}>
                    <input
                      type="number"
                      value={item.devueltos === 0 ? '' : item.devueltos || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'devueltos')}
                      className={`form-control w-16 mx-auto text-center border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 rounded-md shadow-sm h-7 text-sm p-0 ${isRestrictedLocked ? 'bg-gray-100 text-gray-400' : highlightInputClass}`}
                      min="0"
                      disabled={isRestrictedLocked}
                    />
                  </td>
                  <td className={`w-24 font-extrabold align-middle ${isHighlight ? 'bg-amber-100/80' : ''} ${item.stock < 100 ? 'text-red-600' : 'text-green-700'}`}>
                    {item.stock.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* Summary Footer - Only visible for the CURRENT week (weekOffset === 0) */}
      {weekOffset === 0 && estadisticas.length > 0 && (
        <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-lg mb-2">
          <div className="flex flex-row divide-x divide-gray-100">
            {/* Stock Actual */}
            <div className="flex-1 p-2 flex flex-col items-center justify-center bg-gray-50/50">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                {weekOffset === 0 ? 'Stock Hoy' : 'Inicial'}
              </span>
              <span className="text-xl font-bold text-gray-600 font-nunito">
                {stockActual.toFixed(2)}
              </span>
            </div>

            {/* Encargos (Moved to Middle) */}
            <div className="flex-1 p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Encargos</span>
              <span className="text-xl font-bold text-yellow-500 font-nunito">{pendingOrders.toFixed(2)}</span>
            </div>

            {/* Stock Domingo (Final Result - previously 'Sobran') */}
            <div className={`flex-1 p-2 flex flex-col items-center justify-center ${sobran < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sobran < 0 ? 'text-red-800' : 'text-green-800'}`}>
                Sobran
              </span>
              <span className={`text-2xl font-extrabold font-nunito ${sobran < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {sobran.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className='flex text-center justify-center items-center mt-4'>
        <button
          className="w-48 bg-gradient-to-r from-yellow-500 to-yellow-400 text-white py-2 rounded-xl hover:from-yellow-600 hover:to-yellow-500 transition-all duration-300 ease-in-out font-bold text-lg shadow-md hover:shadow-lg focus:outline-none ring-2 ring-yellow-500/20 active:scale-95"
          onClick={handleActualizarManual}
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

export default PolloDetallo;
