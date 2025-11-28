import React, { useState, useEffect, useRef, useContext } from 'react';
import { dataContext } from '../Context/DataContext';
import { db } from '../firebase/firebase';
import {
  doc, getDoc, updateDoc, setDoc, collection, onSnapshot, query, where,
  serverTimestamp
} from 'firebase/firestore';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es';

import PedidoRapido from './PedidoRapido';
import RelojDistinto from './RelojDistinto';

import { Offcanvas, Button, Nav, Modal, InputGroup, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');

const COLLECTION_ESTADISTICAS = 'estadisticas_diarias2';
const COLLECTION_PEDIDOS = 'pedidos';

// Se añade la nueva prop 'mostrarElementosDeOrdenes'
const TestHeader = ({ mostrarElementosDeOrdenes }) => {
  const [numeroEnBarra, setNumeroEnBarra] = useState(0);
  const [numeroLibres, setNumeroLibres] = useState(0);
  const [ventasManana, setVentasManana] = useState(0);
  const [ventasTarde, setVentasTarde] = useState(0);
  const [ventasDia, setVentasDia] = useState(0);
  const [onlineOrdersCount, setOnlineOrdersCount] = useState(0);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [isListenerUpdating, setIsListenerUpdating] = useState(false);
  const [error, setError] = useState(null);

  const { dateToPass, setDateToPass } = useContext(dataContext);

  const fechaParaPedidoRapidoDocId = (dateToPass ? dayjs(dateToPass) : dayjs()).format('DD-MM-YYYY');
  const pedidoRapidoRef = useRef(null);
  const datosClienteParaPedidoHeader = {
    cliente: 'AAgenerico',
    observaciones: 'Pedido Rapido ',
  };

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDateModal, setSelectedDateModal] = useState(dayjs());

  const [showOffcanvasMenu, setShowOffcanvasMenu] = useState(false);
  const toggleOffcanvasMenu = () => setShowOffcanvasMenu((prev) => !prev);

  // --- Estados para el modal de suma ---
  const [showSumarModal, setShowSumarModal] = useState(false);
  const [numeroASumar, setNumeroASumar] = useState(''); // Guardará el valor del input

  // --- Funciones para el modal de suma ---
  const handleCloseSumarModal = () => {
    setShowSumarModal(false);
    setNumeroASumar(''); // Limpiar input al cerrar
  };
  const handleShowSumarModal = () => setShowSumarModal(true); // <-- Esta función abre el modal

  // Función para manejar el cambio en el input del modal de suma
  const handleNumeroASumarChange = (e) => {
    setNumeroASumar(e.target.value);
  };

  // Función que se ejecuta al confirmar en el modal de suma
  const handleConfirmarSuma = () => {
    const valorNumerico = parseFloat(numeroASumar);
    if (!isNaN(valorNumerico)) {
      modificarBarraYLibresParalelo(valorNumerico); // Usar la función correcta para actualizar Firestore
      handleCloseSumarModal();    // Cierra el modal
    } else {
      alert("Por favor, introduce un número válido."); // O alguna otra validación
    }
  };
  // --- Fin de Estados y Funciones para el modal de suma ---


    const theme = createTheme({
      palette: {
        primary: {
          main: '#f2ac02',
        },
      },
    });



  const esHoy = !dateToPass;
  const currentSalesRef = useRef({ vm: 0, vt: 0, vd: 0, totalPollosEntregados: 0 });
  const isMountedRef = useRef(false);

  const divStyleCalendarButton = esHoy
    ? 'w-[8vw] h-[10vh] bg-[#f2ac02]'
    : 'w-[8vw] h-[10vh] bg-[#75adab]';

  const muiTheme = createTheme({
    palette: { primary: { main: '#f2ac02' } },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let pedidosUnsubscribe = () => {};
    let statsUnsubscribe = () => {};

    console.log("TestHeader: useEffect for dateToPass (from context) triggered. New date:", dateToPass ? dayjs(dateToPass).format("DD/MM/YYYY") : "Today");
    setIsPageLoading(true);
    setIsListenerUpdating(false);
    setError(null);
    setNumeroEnBarra(0);
    setNumeroLibres(0);
    setVentasManana(0);
    setVentasTarde(0);
    setVentasDia(0);
    setOnlineOrdersCount(0);
    currentSalesRef.current = { vm: 0, vt: 0, vd: 0, totalPollosEntregados: 0 };

    const diaObjetivo = (dateToPass ? dayjs(dateToPass) : dayjs()).tz('Europe/Madrid');
    const dynamicDocIdEstadisticas = diaObjetivo.format('DD-MM-YYYY');
    const docRefEstadisticas = doc(db, COLLECTION_ESTADISTICAS, dynamicDocIdEstadisticas);

    // Determina si el día que se está visualizando es realmente el día actual.
    // Esto es diferente de `esHoy`, que solo indica si se ha seleccionado una fecha específica o no.
    const isViewingToday = diaObjetivo.isSame(dayjs().tz('Europe/Madrid'), 'day');

    // Apply fecha_filtro to the pedidos query
    const pedidosCollectionRef = collection(db, COLLECTION_PEDIDOS);
    const pedidosQuery = query(pedidosCollectionRef, where("fecha_filtro", "==", dynamicDocIdEstadisticas));
    pedidosUnsubscribe = onSnapshot(pedidosQuery,
      (pedidosSnapshot) => {
        if (!isMountedRef.current) return;
        setIsListenerUpdating(true);
        let acumuladoVM_dia = 0, acumuladoVT_dia = 0, acumuladoPollosEntregados_dia = 0;
        let currentOnlineOrders = 0;
        pedidosSnapshot.forEach(pedidoDoc => {
          const pedidoData = pedidoDoc.data();
          if (pedidoData.fechahora && Array.isArray(pedidoData.productos) && pedidoData.productos.length > 0) {
            const fechaPedido = dayjs(pedidoData.fechahora, "DD/MM/YYYY HH:mm", 'es', true).tz('Europe/Madrid', true);
            if (fechaPedido.isValid() && fechaPedido.isSame(diaObjetivo, 'day')) {
              let pollosEquivalentesVM_VT_estePedido = 0;
              let pollosEquivalentesEntregados_estePedido = 0;

              // Determinar si todos los productos de este pedido están entregados (cantidad === entregado)
              const allProductsInOrderDelivered = pedidoData.productos.every(
                (producto) => Number(producto.cantidad) === Number(producto.entregado)
              );

              pedidoData.productos.forEach((producto) => {
                const cantidadTotal = Number(producto.cantidad) || 0;
                const cantidadEntregada = Number(producto.entregado) || 0;
                let valorEquivalentePolloPorUnidad = 0;
                if (producto.id === 1) valorEquivalentePolloPorUnidad = 1;
                else if ([2, 39, 40].includes(producto.id)) valorEquivalentePolloPorUnidad = 0.5;
                pollosEquivalentesVM_VT_estePedido += cantidadTotal * valorEquivalentePolloPorUnidad;
                pollosEquivalentesEntregados_estePedido += cantidadEntregada * valorEquivalentePolloPorUnidad;
              });
              if (fechaPedido.hour() < 18) acumuladoVM_dia += pollosEquivalentesVM_VT_estePedido;
              else acumuladoVT_dia += pollosEquivalentesVM_VT_estePedido;
              acumuladoPollosEntregados_dia += pollosEquivalentesEntregados_estePedido;

              // Contar pedidos online (origen 1) que NO están completamente entregados
              if (pedidoData.origen === 1 && !allProductsInOrderDelivered) {
                currentOnlineOrders++;
              }
            }
          }
        });
        const acumuladoVD_dia = acumuladoVM_dia + acumuladoVT_dia;
        currentSalesRef.current = { vm: acumuladoVM_dia, vt: acumuladoVT_dia, vd: acumuladoVD_dia, totalPollosEntregados: acumuladoPollosEntregados_dia };
        if (isMountedRef.current) {
          setVentasManana(acumuladoVM_dia);
          setVentasTarde(acumuladoVT_dia);
          setVentasDia(acumuladoVD_dia);
          setOnlineOrdersCount(currentOnlineOrders);
          setDoc(docRefEstadisticas, {
              vm: acumuladoVM_dia, vt: acumuladoVT_dia, vd: acumuladoVD_dia,
              lastSalesCalcTimestamp: serverTimestamp()
          }, { merge: true })
          .catch(e => console.error(`TestHeader: Error updating sales in stats:`, e))
          .finally(() => { if(isMountedRef.current) setIsListenerUpdating(false); });
        } else {
          if(isMountedRef.current) setIsListenerUpdating(false);
        }
      },
      (error) => {
        console.error(`TestHeader: Pedidos LISTENER ERROR:`, error);
        if (isMountedRef.current) {
          setError(`Error escuchando pedidos: ${error.message}`);
          setIsListenerUpdating(false);
          if (isPageLoading) setIsPageLoading(false);
        }
      }
    );

    statsUnsubscribe = onSnapshot(docRefEstadisticas,
      (statsSnap) => {
        if (!isMountedRef.current) return;
        let enbarra_base_from_db = 0, libres_base_from_db = 0;
        if (statsSnap.exists()) {
          const statsData = statsSnap.data();
          enbarra_base_from_db = statsData.enbarra_base ?? 0;
          libres_base_from_db = statsData.libres_base ?? 0;
        }
        const salesToUse = currentSalesRef.current;
        let pollosLibresCalculados;

        const baseLibres = libres_base_from_db || 0;
        const ventasMananaActuales = salesToUse.vm || 0;
        const ventasDiaActuales = salesToUse.vd || 0;
        const pollosEntregadosActuales = salesToUse.totalPollosEntregados || 0;

        if (isViewingToday) {
          // Si estamos viendo el día actual, aplicar lógica horaria para "Libres"
          const now = dayjs().tz('Europe/Madrid');
          if (now.hour() < 18) {
            // Por la mañana, "Libres" solo descuenta las ventas de la mañana (vm)
            pollosLibresCalculados = baseLibres - ventasMananaActuales;
          } else {
            // Por la tarde, "Libres" descuenta todas las ventas del día (vd)
            pollosLibresCalculados = baseLibres - ventasDiaActuales;
          }
        } else {
          // Si estamos viendo un día pasado o futuro, "Libres" descuenta todas las ventas del día (vd)
          pollosLibresCalculados = baseLibres - ventasDiaActuales;
        }

        if (isMountedRef.current) {
          setNumeroEnBarra((enbarra_base_from_db || 0) - pollosEntregadosActuales);
          setNumeroLibres(pollosLibresCalculados);
        
          // --- NUEVO: Calcular y guardar libresManana y libresTarde para la app móvil ---
          const libresMananaParaDB = baseLibres - ventasMananaActuales;
          const libresTardeParaDB = baseLibres - ventasDiaActuales; // Se calcula siempre con el total del día
        
          // Usamos el mismo docRefEstadisticas que ya tienes definido en el useEffect
          setDoc(docRefEstadisticas, {
              libresManana: libresMananaParaDB,
              libresTarde: libresTardeParaDB,
          }, { merge: true })
          .catch(e => console.error("TestHeader: Error guardando libresManana/Tarde:", e));
          // --- FIN DEL CÓDIGO NUEVO ---
        
          if (isPageLoading) setIsPageLoading(false);
          if (isListenerUpdating && !isPageLoading) setIsListenerUpdating(false);
        }
      },
      (error) => {
        console.error(`TestHeader: Stats LISTENER ERROR:`, error);
        if (isMountedRef.current) {
          setError(`Error escuchando estadísticas: ${error.message}`);
          if (isPageLoading) setIsPageLoading(false);
          if (isListenerUpdating) setIsListenerUpdating(false);
        }
      }
    );

    return () => {
      if (typeof pedidosUnsubscribe === 'function') pedidosUnsubscribe();
      if (typeof statsUnsubscribe === 'function') statsUnsubscribe();
    };
  }, [dateToPass]); // No es necesario setDateToPass como dependencia aquí

  const modificarBarraYLibresParalelo = async (cantidadModificar) => {
    if (isActionInProgress || isListenerUpdating) return;
    if (!esHoy || isPageLoading) return;
    setIsActionInProgress(true);
    const diaOperacion = (dateToPass ? dayjs(dateToPass) : dayjs()).tz('Europe/Madrid');
    const docIdOperacion = diaOperacion.format('DD-MM-YYYY');
    const docRefEstadisticasOperacion = doc(db, COLLECTION_ESTADISTICAS, docIdOperacion);
    try {
      const docSnap = await getDoc(docRefEstadisticasOperacion);
      let currentEnBarraBase = 0, currentLibresBase = 0;
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentEnBarraBase = data.enbarra_base ?? 0;
        currentLibresBase = data.libres_base ?? 0;
      }
      const nuevoEnBarraBase = currentEnBarraBase + cantidadModificar;
      const nuevoLibresBase = currentLibresBase + cantidadModificar;
      await setDoc(docRefEstadisticasOperacion, {
        enbarra_base: nuevoEnBarraBase,
        libres_base: nuevoLibresBase
      }, { merge: true });
    } catch (e) {
      setError(`TestHeader: Error al guardar cambios paralelos. ${e.message}`);
    } finally {
      if (isMountedRef.current) setIsActionInProgress(false);
    }
  };

  const handlePedidoRapidoClick = async (idProductoOriginal) => {
    if (isActionInProgress || isListenerUpdating) return;
    if (!esHoy || isPageLoading || !pedidoRapidoRef.current) return;
    setIsActionInProgress(true);
    try {
      await pedidoRapidoRef.current.hacerPedidoRapido(idProductoOriginal);
    } catch (error) {
      setError(`TestHeader: Fallo al procesar pedido rápido. ${error.message}`);
    } finally {
      if (isMountedRef.current) setIsActionInProgress(false);
    }
  };

  const sumarCinco = () => modificarBarraYLibresParalelo(5);
  const sumarCuatro = () => modificarBarraYLibresParalelo(4);
  const restarCinco = () => modificarBarraYLibresParalelo(-5);
  const restarCuatro = () => modificarBarraYLibresParalelo(-4);
  const sumarUno = () => modificarBarraYLibresParalelo(1);
  const restarUno = () => modificarBarraYLibresParalelo(-1);
  const sumaMedio = () => modificarBarraYLibresParalelo(0.5);
  const restaMedio = () => modificarBarraYLibresParalelo(-0.5);

  const triggerPedidoRapido1P = () => handlePedidoRapidoClick(1);
  const triggerPedidoRapidoMedioP = () => handlePedidoRapidoClick(2);

  const handleShowCalendarModal = () => {
    setSelectedDateModal(dateToPass ? dayjs(dateToPass) : dayjs());
    setShowCalendarModal(true);
  };
  const handleCloseCalendarModal = () => setShowCalendarModal(false);
  const handleDateChangeModal = (newDate) => setSelectedDateModal(newDate);

 const handleAcceptDateModal = () => {
    const newSelectedDayjs = selectedDateModal || dayjs();
    // Siempre establecer un objeto Date. Para volver al modo "hoy por defecto" (dateToPass = null), se usa el botón "X" (handleGoToToday).
    const newDateToPassValue = newSelectedDayjs.toDate(); 

    const currentTargetDayFormatted = dateToPass ? dayjs(dateToPass).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    const newTargetDayFormatted = newDateToPassValue ? dayjs(newDateToPassValue).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    if (dateToPass === null || currentTargetDayFormatted !== newTargetDayFormatted) { // Actualizar si dateToPass era null o si la fecha realmente cambió
        setDateToPass(newDateToPassValue);
    }
    handleCloseCalendarModal();
  };

  const handleGoToToday = () => {
    if (dateToPass !== null) {
        setDateToPass(null);
    }
  };

  const buttonsEffectivelyDisabled = !esHoy;

  const clickableDivStyleClasses = (isButtonEsHoy = esHoy) => {
      if (!isButtonEsHoy) return "opacity-50 cursor-not-allowed";
      return "cursor-pointer";
  };

  if (error) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-red-600 text-2xl">Error en TestHeader</h1>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => { setError(null); setDateToPass(dateToPass ? dayjs(dateToPass).toDate() : null); }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <PedidoRapido
        ref={pedidoRapidoRef}
        datosCliente={datosClienteParaPedidoHeader}
        fechaFiltroDocumento={fechaParaPedidoRapidoDocId} // Pass the date string for fecha_filtro
      />
      <div className="w-full relative">
        {/* Barra principal (amarilla) - Siempre visible */}
        <div className={`grid grid-cols-12 gap-2 w-full fixed top-0 bg-white p-2 z-20 h-[12vh] items-center`}>
          {/* ... contenido de la barra amarilla (botones, contadores, calendario, etc.) ... */}
          <div className="flex w-full gap-2 col-span-2 sm:col-span-1">
            <div
                className={`w-1/2 h-[10vh] bg-[#f2ac02] flex justify-center items-center rounded-xl shadow-md ${clickableDivStyleClasses()}`}
                onClick={esHoy ? toggleOffcanvasMenu : undefined}
            >
              <svg width="2.3vw" height="2.3vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 7L4 7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 12L4 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 17L4 17" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div className="w-1/2 h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md">
              <svg fill="#FFFFFF" height="2vw" width="2vw" viewBox="0 0 512 512"><path d="M499.2,409.6H12.8c-7.074,0-12.8,5.726-12.8,12.8s5.726,12.8,12.8,12.8h486.4c7.074,0,12.8-5.726,12.8-12.8 S506.274,409.6,499.2,409.6z"/><path d="M460.8,76.8H51.2c-14.14,0-25.6,11.46-25.6,25.6v256c0,14.14,11.46,25.6,25.6,25.6h409.6c14.14,0,25.6-11.46,25.6-25.6 v-256C486.4,88.26,474.94,76.8,460.8,76.8z M460.8,358.4H51.2v-256h409.6V358.4z"/><path d="M353.57,164.233c-4.813-6.673-12.544-10.633-20.77-10.633H194.441l-61.688-24.678c-6.528-2.654-14.012,0.546-16.64,7.125 c-2.628,6.554,0.572,14.003,7.134,16.623l55.953,22.383V256c0,14.14,11.46,25.6,25.6,25.6h102.4 c11.017,0,20.804-7.049,24.286-17.502l25.6-76.8C359.689,179.49,358.383,170.906,353.57,164.233z M307.2,256H204.8v-76.8h128 L307.2,256z"/><circle cx="204.8" cy="307.2" r="25.6"/><circle cx="307.2" cy="307.2" r="25.6"/></svg>
              <p className="text-white text-[0.90vw] text-center bg-green-700 rounded-md py-1 px-3 mt-2">
                {onlineOrdersCount}
              </p>
            </div>
          </div>

          <div className={`w-[8vw] h-[10vh] bg-[#f2ac02] rounded-xl shadow-md col-span-1 ${clickableDivStyleClasses()}`}>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? triggerPedidoRapido1P : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4 border-white" disabled={buttonsEffectivelyDisabled}>1P</button>
            </div>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? triggerPedidoRapidoMedioP : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito" disabled={buttonsEffectivelyDisabled}>1/2P</button>
            </div>
          </div>

          <div className={`w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md col-span-1 ${clickableDivStyleClasses()}`}>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? restarCinco : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4 border-gray-500" disabled={buttonsEffectivelyDisabled}>-5</button>
            </div>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? restarCuatro : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito" disabled={buttonsEffectivelyDisabled}>-4</button>
            </div>
          </div>
          <div className={`w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md col-span-1 ${clickableDivStyleClasses()}`}>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? sumarCinco : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4 border-gray-500" disabled={buttonsEffectivelyDisabled}>+5</button>
            </div>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? sumarCuatro : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito" disabled={buttonsEffectivelyDisabled}>+4</button>
            </div>
          </div>

           <div className={`w-[8vw] h-[10vh] ${numeroEnBarra < 0 ? 'bg-[#cb4335]' : 'bg-gray-500'} flex flex-col justify-center items-center rounded-xl shadow-md col-span-1 cursor-pointer`} onClick={handleShowSumarModal}  >
            <h1 className="text-white text-center text-[2.5vw] font-nunito">
              {(numeroEnBarra % 1 === 0 ? numeroEnBarra : numeroEnBarra.toFixed(1))}
            </h1>
            <p className="text-white text-center text-[0.85vw] font-nunito mt-[0.90vh] ">En barra</p>
          </div>

          <div className={`w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md col-span-1 ${clickableDivStyleClasses()}`}>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? sumarUno : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4 border-gray-500" disabled={buttonsEffectivelyDisabled}>+1</button>
            </div>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? sumaMedio : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito" disabled={buttonsEffectivelyDisabled}>+1/2</button>
            </div>
          </div>
          <div className={`w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md col-span-1 ${clickableDivStyleClasses()}`}>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? restarUno : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4 border-gray-500" disabled={buttonsEffectivelyDisabled}>-1</button>
            </div>
            <div className={`flex justify-center items-center h-1/2 ${clickableDivStyleClasses()}`} onClick={esHoy ? restaMedio : undefined}>
              <button type='button' className="text-white text-center text-[1.8vw] font-nunito" disabled={buttonsEffectivelyDisabled}>-1/2</button>
            </div>
          </div>

          <div className={`w-[8vw] h-[10vh] ${numeroLibres < 0 ? 'bg-[#cb4335]' : 'bg-[#f2ac02]'} flex flex-col justify-center items-center rounded-xl shadow-md col-span-1`}>
            <h1 className="text-white text-center text-[2.5vw] font-nunito">
              {(numeroLibres % 1 === 0 ? numeroLibres : numeroLibres.toFixed(1))}
            </h1>
            <p className="text-white text-center text-[0.85vw] font-nunito mt-[0.90vh]">Libres</p>
          </div>

          <div className='w-[8vw] h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md col-span-1'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
              {(ventasManana % 1 === 0 ? ventasManana : ventasManana.toFixed(1))}
            </h1>
            <h1 className="text-white text-center text-[1vw] font-nunito">VM</h1>
          </div>
          <div className='w-[8vw] h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md col-span-1'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
              {(ventasTarde % 1 === 0 ? ventasTarde : ventasTarde.toFixed(1))}
            </h1>
            <h1 className="text-white text-center text-[1vw] font-nunito">VT</h1>
          </div>
          <div className='w-[8vw] h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md col-span-1'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
              {(ventasDia % 1 === 0 ? ventasDia : ventasDia.toFixed(1))}
            </h1>
            <h1 className="text-white text-center text-[1vw] font-nunito">VD</h1>
          </div>

          <div
            className={`${divStyleCalendarButton} flex flex-col justify-center items-center rounded-xl shadow-md col-span-1 cursor-pointer`} // Asegurar que siempre tenga cursor-pointer
             onClick={handleShowCalendarModal} // Siempre permitir abrir el modal
          >
            <RelojDistinto
              fecha={dateToPass ? dayjs(dateToPass).toDate() : new Date()}
              isToday={esHoy}
            />
          </div>
        </div>

        {/* Barra secundaria (gris) - Condicionalmente visible */}
        {mostrarElementosDeOrdenes && (
          <div className={`w-full bg-gray-700 p-1 fixed flex z-10 top-[12vh] h-[6vh] items-center`}>
            <div className="flex justify-start items-center">
              <div className="ms-3 p-1">
                <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M15 10.5C15 12.9853 12.9853 15 10.5 15C8.01472 15 6 12.9853 6 10.5C6 8.01472 8.01472 6 10.5 6C12.9853 6 15 8.01472 15 10.5ZM14.1793 15.2399C13.1632 16.0297 11.8865 16.5 10.5 16.5C7.18629 16.5 4.5 13.8137 4.5 10.5C4.5 7.18629 7.18629 4.5 10.5 4.5C13.8137 4.5 16.5 7.18629 16.5 10.5C16.5 11.8865 16.0297 13.1632 15.2399 14.1792L20.0304 18.9697L18.9697 20.0303L14.1793 15.2399Z" fill="#e5e7e9"/></svg>
              </div>
              <div className="ms-1 w-auto bg-white rounded-md">
                <input type="text" className="w-full h-full bg-transparent border-none outline-none px-2 text-center pl-8 min-w-[120px]" placeholder="buscar..." disabled={buttonsEffectivelyDisabled}/>
              </div>
            </div>
            <div className="flex justify-center w-full items-center">
              <div className="text-white text-[1.5vh]">
                {dateToPass ? (
                  <div className="font-nunito text-xl flex items-center text-[#75adab] font-bold">
                    MODO SUPERVISIÓN ({dayjs(dateToPass).format("DD/MM/YYYY")})
                    <button
                      onClick={handleGoToToday}
                      className="ms-2 text-xl leading-none hover:text-yellow-400"
                      aria-label="Volver al día actual"
                      style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                      disabled={false}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="font-nunito text-xl flex space-x-1 text-gray-400">
                    <span>Prox 45 min</span><span>|</span><span className="font-nunito text-gray-400">Pollo:</span><span className="text-white font-nunito font-extrabold">0.0</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal show={showCalendarModal} onHide={handleCloseCalendarModal} size="md" backdrop="static" keyboard={false} centered>
           <Modal.Body >
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DemoContainer components={['StaticDatePicker']}>
                <DemoItem>
                  <StaticDatePicker displayStaticWrapperAs="desktop" value={selectedDateModal} defaultValue={dayjs('DD/MM/YYYY')} onChange={handleDateChangeModal} sx={{ '& .MuiPickersDay-root': { fontSize: '1.5rem' }, '& .MuiPickersCalendarHeader-root': { fontSize: '1.5rem' }, '& .MuiPickersDay-selected': { backgroundColor: 'blue' }, '& .MuiPickersDay-dayWithMargin': { margin: '2px' } }}/>
                </DemoItem>
              </DemoContainer>
            </LocalizationProvider>
          </ThemeProvider>
        </Modal.Body>
        <Modal.Footer className='no-border'>
          <Button variant="secondary" className="shadow-md bg-white border-red-500 hover:bg-red-600 hover:border-red-900 p-2 font-nunito text-red-500 hover:text-red-900" onClick={handleCloseCalendarModal}>Cancelar</Button>
          <Button variant="primary" className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-900 hover:border-yellow-900" onClick={handleAcceptDateModal}>Aceptar</Button>
        </Modal.Footer>
      </Modal>
    

      <Offcanvas
        show={showOffcanvasMenu}
        onHide={toggleOffcanvasMenu}
        placement="start"
        style={{
            width: '120px',
            top: '12vh',
            height: 'calc(100vh - 12vh)',
            background: '#f2ac02',
            borderTopRightRadius: '30px',
            borderBottomRightRadius: '30px',
            zIndex: 1045
        }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            <ul className="list-unstyled ms-2 flex flex-col justify-start text-center items-center gap-6">
              {/* Links del Offcanvas */}
              <Link className="p-3  hover:bg-gray-100 hover:rounded-2xl block" to={"/layout/comida"} onClick={toggleOffcanvasMenu}>
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575"><path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M15 18H9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </svg>
              </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl block' to={"/ordenes"} onClick={() => { toggleOffcanvasMenu(); if(window.location.pathname === "/ordenes") window.location.reload();}}>
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 14L17 14" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 14H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 10.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 17.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 10.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 17.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="#757575" strokeWidth="1.5"/> <path d="M21 16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V13.0002M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V12.0002M8 4.00195C5.82497 4.01406 4.64706 4.11051 3.87868 4.87889C3.11032 5.64725 3.01385 6.82511 3.00174 9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </svg>
              </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl block' to={"/freidora"} onClick={toggleOffcanvasMenu}>
                 <svg fill="#757575" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="40px" height="40px" viewBox="0 0 91.689 91.689" xmlSpace="preserve"><path d="M74.41,42.085l-6.922,3.783l0.58-6.131l1.436,0.376l16.424-5.548l-3.037-10.497l-13.729,4.637l-14.853-3.892l-14.513,2.276 l-13.521-2.528l-10.109,8.94l6.299,8.324L22.2,41.833l-9.982,3.899l-7.474-4.445L0,50.855l11.6,6.9l12.813-5.004l3.576-0.113 l-3.738,8.75l11.969,6.232L48.73,61.9l14.635-1.299l13.471-7.364l14.443,1.183l0.41-10.919L74.41,42.085z M27.438,29.346 l12.301,2.301l14.371-2.255l15.19,3.98l10.857-3.667l0.553,1.908l-11.347,3.834l-15.342-4.02l-14.309,2.245l-11.758-2.199 l-4.762,4.211l-1.172-1.549L27.438,29.346z M29.121,36.258l10.533,1.971l5.236-0.821l-8.355,3.971l-13.697,0.435L29.121,36.258z M23.506,48.284l-11.654,4.552l-6.215-3.695L6.5,47.402l5.463,3.249l11.143-4.351l14.477-0.461l14.324-6.809l11.86,1.652 l-0.186,1.978l-11.352-1.58l-14.184,6.741L23.506,48.284z M39.096,52.284l13.867-6.592l11.834,1.647l-4.608,2.52l-14.285,1.268 l-9.746,4.456l-5.801-3.021L39.096,52.284z M87.266,49.611l-11.424-0.936l-13.776,7.532l-14.492,1.285l-11.379,5.204l-6.414-3.338 l0.764-1.786l5.639,2.937l10.877-4.976l14.428-1.278l13.916-7.606l11.938,0.979L87.266,49.611z"/> </svg>
              </Link>
            <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl block' to={"/cocina"} onClick={toggleOffcanvasMenu}>
                 <svg fill="#757575" height="40px" width="40px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" stroke="#757575" strokeWidth="6"><path d="M85.432,411.629H40.162c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C93.516,415.247,89.896,411.629,85.432,411.629z"/> <path d="M471.838,411.629h-45.269c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C479.922,415.247,476.303,411.629,471.838,411.629z"/> <path d="M490.981,115.637h-21.435h-5.392c-4.466,0-8.084,3.619-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h5.392h21.435 c2.674,0,4.851,2.176,4.851,4.851v205.151H264.084V131.805h83.659h89.466c4.466,0,8.084-3.619-8.084,8.084 c0-4.466-3.618-8.084-8.084-8.084h-89.466H256H21.019C9.429,115.637,0,125.066,0,136.656v213.236v21.492 c0,11.59,9.429,21.019,21.019,21.019H256h234.981c11.59,0,21.019-9.429,21.019-21.019v-21.492V136.656 C512,125.066,502.571,115.637,490.981,115.637z M247.916,341.807h-27.365c-4.466,0-8.084,3.619-8.084,8.084 s3.618,8.084,8.084,8.084h27.365v18.258H21.019c-2.674,0.001-4.851-2.175-4.851-4.849v-13.408h177.795 c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H16.168V136.656c0-2.674,2.176-4.851,4.851-4.851h226.897 V341.807z M495.832,371.384c0,2.674-2.176,4.851-4.851,4.851H264.084v-18.258h231.747V371.384z"/> <path d="M286.181,209.934v53.787c0,4.466,3.619,8.084,8.084,8.084c4.466,0,8.084-3.618,8.084-8.084v-53.787 c0-4.466-3.618-8.084-8.084-8.084C289.8,201.85,286.181,205.468,286.181,209.934z"/> <path d="M217.735,271.805c4.466,0,8.084-3.618,8.084-8.084v-53.787c0-4.466-3.619-8.084-8.084-8.084s-8.084,3.619-8.084,8.084 v53.787C209.65,268.187,213.269,271.805,217.735,271.805z"/> <path d="M8.084,100.371h495.832c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H8.084 C3.619,84.203,0,87.821,0,92.287C0,96.753,3.619,100.371,8.084,100.371z"/> <path d="M43.32,200.086c2.068,0,4.137-0.789,5.716-2.368l29.048-29.049c3.157-3.157,3.157-8.276-0.001-11.432 c-3.156-3.156-8.275-3.157-11.432,0.001l-29.048,29.049c-3.157,3.157-3.157,8.276,0.001,11.432 C39.182,199.297,41.251,200.086,43.32,200.086z"/> <path d="M64.557,225.374c1.579,1.578,3.649,2.367,5.717,2.367s4.138-0.789,5.717-2.367l52.958-52.958 c3.157-3.158,3.157-8.276,0-11.433c-3.158-3.156-8.276-3.156-11.434,0l-52.958,52.958C61.4,217.099,61.4,222.217,64.557,225.374z "/> <path d="M46.664,231.834l-2.877,2.877c-3.157,3.158-3.157,8.276,0,11.433c1.579,1.578,3.649,2.367,5.717,2.367 c2.068,0,4.138-0.789,5.717-2.367l2.877-2.877c3.157-3.158,3.157-8.276,0-11.433C54.94,228.678,49.822,228.678,46.664,231.834z"/> </svg>
              </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl block' to={"/buscadorPedidos"} onClick={toggleOffcanvasMenu}>
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V13M10 4C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10 16H6" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <circle cx="18" cy="17" r="3" stroke="#757575" strokeWidth="1.5"/> <path d="M20.5 19.5L21.5 20.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M2 10L7 10M22 10L11 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </svg>
              </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl block' to={"/stock"} onClick={toggleOffcanvasMenu}>
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.50626 15.2647C7.61657 15.6639 8.02965 15.8982 8.4289 15.7879C8.82816 15.6776 9.06241 15.2645 8.9521 14.8652L7.50626 15.2647ZM6.07692 7.27442L6.79984 7.0747V7.0747L6.07692 7.27442ZM4.7037 5.91995L4.50319 6.64265L4.7037 5.91995ZM3.20051 4.72457C2.80138 4.61383 2.38804 4.84762 2.2773 5.24675C2.16656 5.64589 2.40035 6.05923 2.79949 6.16997L3.20051 4.72457ZM20.1886 15.7254C20.5895 15.6213 20.8301 15.2118 20.7259 14.8109C20.6217 14.41 20.2123 14.1695 19.8114 14.2737L20.1886 15.7254ZM10.1978 17.5588C10.5074 18.6795 9.82778 19.8618 8.62389 20.1747L9.00118 21.6265C10.9782 21.1127 12.1863 19.1239 11.6436 17.1594L10.1978 17.5588ZM8.62389 20.1747C7.41216 20.4896 6.19622 19.7863 5.88401 18.6562L4.43817 19.0556C4.97829 21.0107 7.03196 22.1383 9.00118 21.6265L8.62389 20.1747ZM5.88401 18.6562C5.57441 17.5355 6.254 16.3532 7.4579 16.0403L7.08061 14.5885C5.10356 15.1023 3.89544 17.0911 4.43817 19.0556L5.88401 18.6562ZM7.4579 16.0403C8.66962 15.7254 9.88556 16.4287 10.1978 17.5588L11.6436 17.1594C11.1035 15.2043 9.04982 14.0768 7.08061 14.5885L7.4579 16.0403ZM8.9521 14.8652L6.79984 7.0747L5.354 7.47414L7.50626 15.2647L8.9521 14.8652ZM4.90421 5.19725L3.20051 4.72457L2.79949 6.16997L4.50319 6.64265L4.90421 5.19725ZM6.79984 7.0747C6.54671 6.15847 5.8211 5.45164 4.90421 5.19725L4.50319 6.64265C4.92878 6.76073 5.24573 7.08223 5.354 7.47414L6.79984 7.0747ZM11.1093 18.085L20.1886 15.7254L19.8114 14.2737L10.732 16.6332L11.1093 18.085Z" fill="#757575"/><path d="M19.1647 6.2358C18.6797 4.48023 18.4372 3.60244 17.7242 3.20319C17.0113 2.80394 16.1062 3.03915 14.2962 3.50955L12.3763 4.00849C10.5662 4.47889 9.66119 4.71409 9.24954 5.40562C8.8379 6.09714 9.0804 6.97492 9.56541 8.73049L10.0798 10.5926C10.5648 12.3481 10.8073 13.2259 11.5203 13.6252C12.2333 14.0244 13.1384 13.7892 14.9484 13.3188L16.8683 12.8199C18.6784 12.3495 19.5834 12.1143 19.995 11.4227C20.2212 11.0429 20.2499 10.6069 20.1495 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
              <Link className='p-3 mb-2 hover:bg-gray-100 hover:rounded-2xl block' to={"/login"} onClick={toggleOffcanvasMenu}>
                <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </svg>
              </Link>
            </ul>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

       <Modal show={showSumarModal} onHide={handleCloseSumarModal} size="md" backdrop="static" keyboard={false} centered>
       <Modal.Body className="bg-white  p-4">
         <h1 className="text-center font-nunito text-2xl text-gray-700 mb-4">Sumar en barra</h1>
         <Form.Group controlId="numeroParaSumar">
           <Form.Label className="block text-center text-gray-300 font-nunito mb-4">
             Introduce la cantidad a sumar (admite negativos):
           </Form.Label>
           <div className="flex justify-center ">
                      <input
             type="number"
             value={numeroASumar}
             onChange={handleNumeroASumarChange}
             autoFocus
             className="text-center w-[40%] text-3xl font-nunito text-gray-700 bg-transparent border-b-2 border-yellow-400 focus:outline-none focus:border-yellow-500 transition duration-300"
             placeholder="0"
             />
           </div>
         </Form.Group>
       </Modal.Body>
       <Modal.Footer className="flex justify-end gap-2" style={{ borderTop: 'none' }}>
               <Button
               variant="secondary"
               onClick={handleCloseSumarModal}
               className=" shadow-md bg-white border-red-500 hover:bg-red-600 hover:border-red-900 p-2 font-nunito text-red-500 hover:text-red-900">
               Cancelar
             </Button>
         <Button
           variant="primary"
           onClick={handleConfirmarSuma}
           className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-900 hover:border-yellow-900">
           Actualizar
         </Button>
       </Modal.Footer>
     </Modal>
    </>
  );
}

// Añadir un defaultProp para mostrarElementosDeOrdenes por si no se pasa
TestHeader.defaultProps = {
  mostrarElementosDeOrdenes: false, // O true, según lo que consideres más común
};

export default TestHeader;
