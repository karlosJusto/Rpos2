// --- Cocina.jsx (Restaurada verbosidad original, HeaderFinal integrado, layout ajustado) ---
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import ProductCard from './components/ProductCard';
import SaladTypeCard from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { dataContext } from '../Context/DataContext';
import isEqual from 'lodash/isEqual';

// Imports for integrated Header
import RelojDistinto from './components/RelojDistinto';
import PedidoRapido from '../ordenes/PedidoRapido';
import { Offcanvas, Button, Nav, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import 'dayjs/locale/es';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Extend dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

// --- Helper Function (Original from Cocina) ---
const formatDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      const d = dayjs(date);
      return d.isValid() ? d.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
  }
  return dayjs(date).format('DD/MM/YYYY');
};

const SALADS_COLLECTION_NAME = 'ensaladas';

// --- Component ---
const Cocina = () => {
  // --- States (Original from Cocina) ---
  const [cocinaProducts, setCocinaProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPedidosMap, setCurrentPedidosMap] = useState(new Map());
  const [productosStockMap, setProductosStockMap] = useState(new Map());
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [isLoadingCocina, setIsLoadingCocina] = useState(true);
  const [isLoadingProductosStock, setIsLoadingProductosStock] = useState(true);
  const [isLoadingPedidosAndProcessing, setIsLoadingPedidosAndProcessing] = useState(true);
  const [pedidosDelTurnoState, setPedidosDelTurnoState] = useState([]);

  // --- States for Integrated Header ---
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [showSumarModal, setShowSumarModal] = useState(false);
  const [numeroASumar, setNumeroASumar] = useState('');
  const [modalSelectedDate, setModalSelectedDate] = useState(dayjs(selectedDate));
  const [showDateModal, setShowDateModal] = useState(false);
  const [datosCliente, setDatosCliente] = useState({
    cliente: 'AAgenerico',
    telefono: '000000000',
    fechahora: dayjs().minute(Math.floor(dayjs().minute() / 15) * 15).second(0).millisecond(0).format('DD/MM/YYYY HH:mm'),
    observaciones: 'Pedido Rapido',
    pagado: false,
    celiaco: false,
    localidad: 'Mungia',
  });

  // --- Refs for Integrated Header ---
  const pedidoRapidoRef = useRef();

  // --- Context (Original from Cocina, plus additions for Header) ---
  const {
    libres,
    mostrarBarra,
    numeroBarra,
    setMostrarBarra,
    pedidosConOrigenUno,
    setNumeroBarra
  } = useContext(dataContext);

  // --- Effect for Periodic Tick (Original from Cocina) ---
  useEffect(() => {
    const timerId = setInterval(() => {
      // console.log("[Time Tick Update] Forcing recalculation of alerts/overdue status..."); // Original console.log
      setCurrentTimeTick(Date.now());
    }, 3000);
    return () => clearInterval(timerId);
  }, []);

  // --- Effect for fetching cocina products (Original from Cocina, with original console.logs) ---
  useEffect(() => {
    setIsLoadingCocina(true);
    const cocinaRef = collection(db, 'cocina');
    const unsubscribeCocina = onSnapshot(cocinaRef, (querySnapshot) => {
      const productos = [];
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10);
        if (!isNaN(id)) {
          const { stock, ...restOfData } = doc.data();
          productos.push({ id: id, ...restOfData });
        } else {
          console.warn(`[Cocina Fetch] ID no numérico omitido en 'cocina': ${doc.id}`); // Original console.warn
        }
      });
      productos.sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      console.log("[Cocina Fetch] Setting cocinaProducts state:", productos); // Original console.log
      setCocinaProducts(productos);
      setIsLoadingCocina(false);
    }, (error) => {
      console.error("Error fetching cocina products:", error); // Original console.error
      setIsLoadingCocina(false);
    });
    return () => unsubscribeCocina();
  }, []);

  // --- Effect for fetching productos stock (Original from Cocina, with original console.logs) ---
  useEffect(() => {
    setIsLoadingProductosStock(true);
    const productosRef = collection(db, 'productos');
    console.log("Setting up listener for 'productos' stock..."); // Original console.log
    const unsubscribeProductos = onSnapshot(productosRef, (querySnapshot) => {
      console.log("'productos' snapshot received:", querySnapshot.size, "docs for stock"); // Original console.log
      const stockMap = new Map();
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10);
        const data = doc.data();
        if (!isNaN(id) && data.stock !== undefined && typeof data.stock === 'number') {
          stockMap.set(id, data.stock);
        } else {
          console.warn(`[Productos Stock] Doc ID ${doc.id} omitido. ID no numérico o 'stock' inválido/faltante. Stock: ${data.stock}`); // Original console.warn
        }
      });
      console.log("[Productos Stock] Setting productosStockMap state:", stockMap); // Original console.log
      setProductosStockMap(stockMap);
      setIsLoadingProductosStock(false);
    }, (error) => {
      console.error("Error fetching productos stock:", error); // Original console.error
      setIsLoadingProductosStock(false);
    });
    return () => unsubscribeProductos();
  }, []);

  // --- Date/Turno Variables & Handlers (Original from Cocina) ---
  const getTurnoActual = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startTime, endTime;
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
      startTime = new Date(today.getTime()); startTime.setHours(0, 1, 0, 0);
      endTime = new Date(today.getTime()); endTime.setHours(18, 0, 0, 0);
    } else {
      startTime = new Date(today.getTime()); startTime.setHours(18, 0, 0, 1);
      endTime = new Date(today.getTime()); endTime.setHours(23, 59, 59, 999);
    }
    return { startTime, endTime };
  }, []);

  const selectedDateStr = formatDate(selectedDate);
  const todayStr = formatDate(new Date());
  const isToday = selectedDateStr === todayStr;
  const showSupervisionHeader = selectedDateStr !== todayStr;

  const handleCloseSupervision = () => { // Original from Cocina
    setSelectedDate(new Date());
    // console.log("[Cocina] Exiting supervision mode, returning to today."); // Original optional log
  };


  // --- Integrated Header Logic & Handlers ---
  const toggleOffcanvas = () => setShowOffcanvas(!showOffcanvas);
  const handleCloseSumarModal = () => { setShowSumarModal(false); setNumeroASumar(''); };
  const handleShowSumarModal = () => setShowSumarModal(true);
  const handleNumeroASumarChange = (e) => { setNumeroASumar(e.target.value); };
  const sumarNumero = (numero) => {
    if (!isNaN(numero) && setNumeroBarra) {
      setNumeroBarra((prevNumero) => (parseFloat(prevNumero) || 0) + parseFloat(numero));
    }
  };
  const handleConfirmarSuma = () => {
    const valorNumerico = parseFloat(numeroASumar);
    if (!isNaN(valorNumerico)) {
      sumarNumero(valorNumerico);
      handleCloseSumarModal();
    } else {
      alert("Por favor, introduce un número válido.");
    }
  };
  const handleShowDateModal = () => { setModalSelectedDate(dayjs(selectedDate)); setShowDateModal(true); };
  const handleCloseDateModal = () => setShowDateModal(false);
  const handleDateChangeInModal = (newDate) => { setModalSelectedDate(newDate); };
  const handleAcceptDate = () => { // This function now sets Cocina's main selectedDate
    const jsDate = dayjs(modalSelectedDate).isValid() ? dayjs(modalSelectedDate).toDate() : new Date();
    setSelectedDate(jsDate);
    console.log("[Cocina Header] Date accepted from modal:", jsDate); // Log for header date change
    handleCloseDateModal();
  };
  const muiTheme = createTheme({ palette: { primary: { main: '#f2ac02' } } });
  const obtenerHoraRedondeada = useCallback(() => {
    const now = dayjs(); const minutos = now.minute(); const siguienteBloque = Math.floor(minutos / 15) * 15;
    const nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    return nuevaHora.isBefore(now) ? nuevaHora.add(15, 'minute') : nuevaHora;
  }, []);
  useEffect(() => { setDatosCliente(prev => ({ ...prev, fechahora: obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm') })); }, [obtenerHoraRedondeada]);
  const handlePedidoRapido = (idProduct) => { if (pedidoRapidoRef.current) { pedidoRapidoRef.current.hacerPedidoRapido(idProduct); } };
  const sumarCinco = () => sumarNumero(5); const sumarCuatro = () => sumarNumero(4);
  const restarCinco = () => sumarNumero(-5); const restarCuatro = () => sumarNumero(-4);
  const sumarUno = () => sumarNumero(1); const restarUno = () => sumarNumero(-1);
  const sumaMedio = () => sumarNumero(0.5); const restaMedio = () => sumarNumero(-0.5);
  const headerDisplayDivStyle = showSupervisionHeader ? 'w-[8vw] h-[10vh] bg-[#75adab]' : 'w-[8vw] h-[10vh] bg-[#f2ac02]';

  // --- EFFECT A: Listener de Pedidos y Agregación para UI (Original from Cocina, with original console.logs) ---
  useEffect(() => {
    if (isLoadingCocina || isLoadingProductosStock) {
      console.log("[Effect A] Waiting for base data...");
      setIsLoadingPedidosAndProcessing(true);
      setProductsData([]);
      setPedidosDelTurnoState([]);
      return;
    }
    if (cocinaProducts.length === 0 && !isLoadingCocina) {
      console.log("[Effect A] No base products defined. Skipping.");
      setIsLoadingPedidosAndProcessing(false);
      setProductsData([]);
      setPedidosDelTurnoState([]);
      return;
    }

    setIsLoadingPedidosAndProcessing(true);
    const pedidosRef = collection(db, 'pedidos');
    console.log("[Effect A] Setting up listener / Re-running due to Date, Products, Stock...");

    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      console.log(`[Effect A] Snapshot received (${querySnapshot.size} docs). Filtering for date: ${selectedDateStr}`);
      const incomingPedidosMap = new Map();
      const allPedidosRaw = [];
      querySnapshot.forEach((doc) => { allPedidosRaw.push({ id: doc.id, ...doc.data() }); });

      const pedidosDelTurno = allPedidosRaw.filter((pedido) => {
        if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
        const parts = pedido.fechahora.split(' ');
        if (parts.length !== 2) return false;
        const [fechaPedido, horaPedido] = parts;
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
        if (fechaPedido !== selectedDateStr) return false;
        if (isToday) {
          const { startTime, endTime } = getTurnoActual();
          const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm', true);
          if (!orderDateTime.isValid()) return false;
          return orderDateTime.toDate() >= startTime && orderDateTime.toDate() <= endTime;
        }
        return true;
      });
      console.log(`[Effect A] ${pedidosDelTurno.length} orders found for date ${selectedDateStr} / shift.`);
      setPedidosDelTurnoState(pedidosDelTurno);

      const validProductIds = new Set(cocinaProducts.map(product => product.id));
      const aggregatedProducts = {};

      cocinaProducts.forEach((product) => {
        const stockFromProductos = productosStockMap.get(product.id);
        const finalStock = (stockFromProductos !== undefined && typeof stockFromProductos === 'number')
          ? stockFromProductos : 0;
        aggregatedProducts[product.id] = {
          name: product.nombre || `Producto ${product.id}`,
          stock: finalStock,
          pedidos: 0,
          orders: [],
          id: product.id,
        };
      });

      pedidosDelTurno.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod, index) => {
            const originalProdId = prod.id;
            let targetProdId = originalProdId;
            let quantityForHeader = prod.cantidad || 1;
            let quantityFactorForTotal = 1.0;

            if (originalProdId === 48) {
              targetProdId = 41;
              quantityFactorForTotal = 0.5;
            }

            if (typeof targetProdId !== 'number' || !validProductIds.has(targetProdId)) {
               console.warn(`[Effect A] Target product ID ${targetProdId} (for original ID ${originalProdId}) not in 'cocina'. Skipping order line.`);
               return;
            }
            if (!aggregatedProducts[targetProdId]) {
               console.error(`[Effect A] Aggregated structure missing for target ID ${targetProdId}. Skipping order line.`);
               return;
            }
            const orderLineId = `${pedido.id}-${originalProdId}-${prod.uniqueId || index}`;
            const isNew = !currentPedidosMap.has(orderLineId);
            incomingPedidosMap.set(orderLineId, true);

            const orderData = {
              idPedido: pedido.id,
              idProducto: originalProdId,
              orderLineId: orderLineId,
              producto: { ...prod, listo: prod.listo ?? false },
              hora: pedido.fechahora,
              nombre: pedido.cliente || 'Sin nombre',
              cantidad: (originalProdId === 48) ? ((prod.cantidad || 1) * 0.5) : (prod.cantidad || 1),
              descripcion: pedido.observaciones || "",
              isNew: isNew,
              needsCookingAlert: false,
              isOverdue: false,
            };
            aggregatedProducts[targetProdId].orders.push(orderData);
            aggregatedProducts[targetProdId].pedidos += (quantityForHeader * quantityFactorForTotal);
          });
        }
      });

      const finalBaseData = cocinaProducts
        .filter(product => product.id !== 48)
        .map(product => aggregatedProducts[product.id])
        .filter(Boolean);

      console.log("[Effect A] Setting BASE productsData state:", finalBaseData.length, "items");
      setProductsData(finalBaseData);
      setCurrentPedidosMap(incomingPedidosMap);
      setIsLoadingPedidosAndProcessing(false);

    }, (error) => {
      console.error("[Effect A] Error fetching/processing base pedidos:", error);
      setIsLoadingPedidosAndProcessing(false);
      setPedidosDelTurnoState([]);
    });

    return () => {
      console.log("[Effect A] Cleaning up listener.");
      unsubscribe();
    };
  }, [selectedDateStr, cocinaProducts, productosStockMap, isToday, getTurnoActual, isLoadingCocina, isLoadingProductosStock]); // Original dependencies

  // --- EFFECT B: Cálculo de mostrarBarra (Original from Cocina, with original console.logs) ---
  useEffect(() => {
    console.log("[Effect B] Recalculando mostrarBarra debido a cambio en numeroBarra o pedidosDelTurnoState."); // Original console.log

    const pollosEntregadosCalculados = pedidosDelTurnoState.reduce((totalEntregados, pedido) => {
      if (!pedido.productos || !Array.isArray(pedido.productos)) {
          return totalEntregados;
      }
      const entregadosEnPedido = pedido.productos.reduce((sumaEntregadosProducto, producto) => {
          const entregadoValor = producto.entregado || 0;
          if (producto.id === 1) {
              return sumaEntregadosProducto + entregadoValor;
          } else if (producto.id === 2) {
              return sumaEntregadosProducto + (entregadoValor * 0.5);
          }
          return sumaEntregadosProducto;
      }, 0);
      return totalEntregados + entregadosEnPedido;
    }, 0);
    console.log(`[Effect B] Pollos Entregados Calculados: ${pollosEntregadosCalculados}`); // Original console.log

    const currentNumeroBarra = parseFloat(numeroBarra) || 0;
    const nuevoMostrarBarra = currentNumeroBarra - pollosEntregadosCalculados;
    console.log(`[Effect B] Actualizando mostrarBarra: ${currentNumeroBarra} - ${pollosEntregadosCalculados} = ${nuevoMostrarBarra}`); // Original console.log
    if (setMostrarBarra && mostrarBarra !== nuevoMostrarBarra) { // Avoid re-set if value is same
        setMostrarBarra(nuevoMostrarBarra);
    }
  }, [numeroBarra, pedidosDelTurnoState, setMostrarBarra, mostrarBarra]); // Original dependencies (mostrarBarra added here is ok to prevent needless re-set from context)

  // --- EFFECT C: Time-Dependent Flags & Sorting (Original from Cocina, with original console.logs) ---
  useEffect(() => {
    if (isLoadingPedidosAndProcessing || !productsData || productsData.length === 0) { return; }

    const now = dayjs(currentTimeTick);
    let flagsOrOrderChanged = false;

    const updatedProductsData = productsData.map(product => {
        let productFlagsChanged = false;
        const updatedOrders = product.orders.map(order => {
            const orderTimeDayjs = dayjs(order.hora, 'DD/MM/YYYY HH:mm', true);
            let newNeedsCookingAlert = false;
            const nombreProdLower = order.producto?.nombre ? order.producto.nombre.toLowerCase() : '';
            const productId = order.idProducto;
            let alertTimeWindowMins = 0;

            if (nombreProdLower.includes('codillo') || nombreProdLower.includes('costilla') || productId === 48) {
                alertTimeWindowMins = 30;
            } else if (nombreProdLower.includes('chorizo') || nombreProdLower.includes('morcilla')) {
                alertTimeWindowMins = 15;
            }
            if (alertTimeWindowMins > 0 && orderTimeDayjs.isValid() && !order.producto.listo) {
                const alertStartTime = orderTimeDayjs.subtract(alertTimeWindowMins, 'minute');
                if (now.isBetween(alertStartTime, orderTimeDayjs, null, '[]')) {
                    newNeedsCookingAlert = true;
                }
            }
            const newIsOverdue = orderTimeDayjs.isValid() && now.isAfter(orderTimeDayjs) && !order.producto.listo;
            if (newNeedsCookingAlert !== order.needsCookingAlert || newIsOverdue !== order.isOverdue) {
                productFlagsChanged = true;
            }
            return { ...order, needsCookingAlert: newNeedsCookingAlert, isOverdue: newIsOverdue };
        });

        const originalOrderIds = product.orders.map(o => o.orderLineId).join(',');
        updatedOrders.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1; if (!a.isOverdue && b.isOverdue) return 1;
            if (a.needsCookingAlert && !b.needsCookingAlert) return -1; if (!a.needsCookingAlert && b.needsCookingAlert) return 1;
            const timeA = dayjs(a.hora, "DD/MM/YYYY HH:mm", true); const timeB = dayjs(b.hora, "DD/MM/YYYY HH:mm", true);
            if (timeA.isValid() && timeB.isValid()) return timeA.diff(timeB);
            if (timeA.isValid() && !timeB.isValid()) return -1; if (!timeA.isValid() && timeB.isValid()) return 1; return 0;
        });
        const newOrderIds = updatedOrders.map(o => o.orderLineId).join(',');

        if (productFlagsChanged || originalOrderIds !== newOrderIds) {
            flagsOrOrderChanged = true;
            return { ...product, orders: updatedOrders };
        } else {
            return product;
        }
    });

    if (flagsOrOrderChanged) {
        console.log("[Effect C] Flags or order changed, updating productsData state."); // Original console.log
        setProductsData(updatedProductsData);
    }
  }, [currentTimeTick, productsData, isLoadingPedidosAndProcessing]); // Original dependencies

  // --- Salad Logic (Original from Cocina, with original console.logs) ---
  const todayDocId = selectedDateStr.replace(/\//g, '-');
  useEffect(() => {
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
    console.log(`[Salads Display Effect] Subscribing to ${SALADS_COLLECTION_NAME}/${todayDocId}`); // Original console.log

    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        console.log(`[Salads Display Effect] Data received for ${todayDocId}:`, docSnapshot.data()); // Original console.log
        const data = docSnapshot.data();
        setSaladsData([data]); // Original simple update
      } else {
        console.log(`[Salads Display Effect] Document ${todayDocId} does not exist yet.`); // Original console.log
        setSaladsData([]);
      }
    }, (error) => {
        console.error(`[Salads Display Effect] Error fetching salads data for ${todayDocId}:`, error); // Original console.error
        setSaladsData([]);
    });
    return () => {
        console.log(`[Salads Display Effect] Unsubscribing from ${todayDocId}`); // Original console.log
        unsubscribe();
    };
  }, [todayDocId]); // Original dependency

  // useEffect 2 for salads (Pedidas Calc) remains commented out as per original
  /*
  useEffect(() => {
    // ... original commented out code ...
  }, [selectedDateStr, todayDocId, isToday, getTurnoActual]);
  */

  // updateSaladCount function (Original from Cocina, with original console.logs)
  const updateSaladCount = async (type, size, amount) => {
    const sizeKey = size.toLowerCase().startsWith('grande') ? 'grandes' : 'pequenas';
    const currentAmount = parseInt(amount, 10);
    if (isNaN(currentAmount)) {
        console.error(`[Update Salad Count] Invalid amount received: ${amount}`); // Original console.error
        return;
    }
    const newAmount = Math.max(0, currentAmount);
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
    const updatePath = `${type}.${sizeKey}.preparadas`;
    console.log(`[Update Salad Count] Updating ${updatePath} to ${newAmount} in ${todayDocId}`); // Original console.log
    try {
      const docSnap = await getDoc(saladsRef);
      if (docSnap.exists()) {
          await updateDoc(saladsRef, { [updatePath]: newAmount });
          console.log(`[Update Salad Count] ${updatePath} updated successfully.`); // Original console.log
      } else {
          console.warn(`[Update Salad Count] Document ${todayDocId} does not exist. Cannot update preparadas count.`); // Original console.warn
      }
    } catch (error) {
      console.error(`Error updating ${updatePath}:`, error); // Original console.error
    }
  };

  // --- Grid Calculation (Original from Cocina) ---
  const productCountForGrid = Math.min(productsData.length, 9);
  let gridClass = '';
  if (productCountForGrid <= 1) gridClass = 'grid-cols-1';
  else if (productCountForGrid === 2) gridClass = 'grid-cols-2';
  else if (productCountForGrid === 3) gridClass = 'grid-cols-3';
  else if (productCountForGrid === 4) gridClass = 'grid-cols-2 grid-rows-2';
  else if (productCountForGrid <= 6) gridClass = 'grid-cols-3 grid-rows-2';
  else gridClass = 'grid-cols-3 grid-rows-3';

  const isLoading = isLoadingCocina || isLoadingProductosStock || isLoadingPedidosAndProcessing; // Original

  return (
    <div className="h-screen flex flex-col">
      {/* --- Integrated Header Grid Layout (fixed) --- */}
      <div className="grid grid-cols-12 gap-2 w-full fixed top-0 bg-white p-2 z-20 shadow-md">
         <div className="flex w-full gap-2" >
             <div className="w-1/2 h-[10vh] bg-[#f2ac02] flex justify-center items-center rounded-xl shadow-md cursor-pointer" onClick={toggleOffcanvas}>
                <svg width="2.3vw" height="2.3vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M20 7L4 7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> <path d="M20 12L4 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> <path d="M20 17L4 17" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> </g></svg>
             </div>
             <div className="w-1/2 h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md">
                <svg fill="#FFFFFF" height="2vw" width="2vw" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve"><g id="SVGRepo_bgCarrier" strokeWidth="5"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <g> <g> <path d="M499.2,409.6H12.8c-7.074,0-12.8,5.726-12.8,12.8s5.726,12.8,12.8,12.8h486.4c7.074,0,12.8-5.726,12.8-12.8 S506.274,409.6,499.2,409.6z"/> </g> </g> <g> <g> <path d="M460.8,76.8H51.2c-14.14,0-25.6,11.46-25.6,25.6v256c0,14.14,11.46,25.6,25.6,25.6h409.6c14.14,0,25.6-11.46,25.6-25.6 v-256C486.4,88.26,474.94,76.8,460.8,76.8z M460.8,358.4H51.2v-256h409.6V358.4z"/> </g> </g> <g> <g> <path d="M353.57,164.233c-4.813-6.673-12.544-10.633-20.77-10.633H194.441l-61.688-24.678c-6.528-2.654-14.012,0.546-16.64,7.125 c-2.628,6.554,0.572,14.003,7.134,16.623l55.953,22.383V256c0,14.14,11.46,25.6,25.6,25.6h102.4 c11.017,0,20.804-7.049,24.286-17.502l25.6-76.8C359.689,179.49,358.383,170.906,353.57,164.233z M307.2,256H204.8v-76.8h128 L307.2,256z"/> </g> </g> <g> <g> <circle cx="204.8" cy="307.2" r="25.6"/> </g> </g> <g> <g> <circle cx="307.2" cy="307.2" r="25.6"/> </g> </g> </g></svg>
                <p className="text-white text-[0.90vw] text-center bg-green-700 rounded-md py-1 px-3 mt-2">{pedidosConOrigenUno ?? '...'}</p>
             </div>
          </div>
          <div className='w-[8vw] h-[10vh] bg-[#f2ac02] rounded-xl shadow-md'>
            <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={() => handlePedidoRapido(1)}> <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4">1P</button> </div>
            <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={() => handlePedidoRapido(2)}> <button type='button' className="text-white text-center text-[1.8vw] font-nunito ">1/2P</button> </div>
          </div>
          <div className='w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md'> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={restarCinco}> <p className="text-white text-center text-[1.8vw] font-nunito border-b-4">-5</p> </div> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={restarCuatro}> <h1 className="text-white text-center text-[1.8vw] font-nunito">-4</h1> </div> </div>
          <div className='w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md'> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={sumarCinco}> <p className="text-white text-center text-[1.8vw] font-nunito border-b-4">+5</p> </div> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={sumarCuatro}> <h1 className="text-white text-center text-[1.8vw] font-nunito">+4</h1> </div> </div>
          <div className={`w-[8vw] h-[10vh] ${mostrarBarra < 0 ? 'bg-[#cb4335]' : 'bg-gray-500'} flex flex-col justify-center items-center rounded-xl shadow-md cursor-pointer`} onClick={handleShowSumarModal}>
            <h1 className="text-white text-center text-[2.5vw] font-nunito">{mostrarBarra % 1 === 0 ? mostrarBarra : mostrarBarra.toFixed(1)}</h1>
            <p className="text-white text-center text-[0.85vw] font-nunito mt-[0.90vh]">En barra</p>
          </div>
          <div className='w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md'> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={sumarUno}> <p className="text-white text-center text-[1.8vw] font-nunito border-b-4">+1</p> </div> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={sumaMedio}> <h1 className="text-white text-center text-[1.8vw] font-nunito">+1/2</h1> </div> </div>
          <div className='w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md'> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={restarUno}> <p className="text-white text-center text-[1.8vw] font-nunito border-b-4">-1</p> </div> <div className="flex justify-center items-center h-1/2 cursor-pointer" onClick={restaMedio}> <h1 className="text-white text-center text-[1.8vw] font-nunito">-1/2</h1> </div> </div>
          <div className={`w-[8vw] h-[10vh] ${libres < 0 ? 'bg-[#cb4335]' : 'bg-[#f2ac02]'} flex flex-col justify-center items-center rounded-xl shadow-md`}>
            <h1 className="text-white text-center text-[2.5vw] font-nunito">{libres ?? '-'}</h1>
            <p className="text-white text-center text-[0.85vw] font-nunito mt-[0.90vh]">Libres</p>
          </div>
          <div className='w-[8vw] h-[10vh] bg-gray-400 opacity-50 flex flex-col justify-center items-center rounded-xl shadow-md'> <h1 className="text-white text-center text-[2vw] font-nunito"></h1> <h1 className="text-white text-center text-[2w] font-nunito"></h1> </div>
          <div className='w-[8vw] h-[10vh] bg-gray-400 opacity-50 flex flex-col justify-center items-center rounded-xl shadow-md'> <h1 className="text-white text-center text-[2vw] font-nunito"></h1> <h1 className="text-white text-center text-[2w] font-nunito"></h1> </div>
          <div className='w-[8vw] h-[10vh] bg-gray-400 opacity-50 flex flex-col justify-center items-center rounded-xl shadow-md'> <h1 className="text-white text-center text-[2vw] font-nunito"></h1> <h1 className="text-white text-center text-[2w] font-nunito"></h1> </div>
          <div className={`${headerDisplayDivStyle} flex flex-col justify-center items-center rounded-xl shadow-md cursor-pointer`} onClick={handleShowDateModal}>
            <RelojDistinto fecha={selectedDate} />
          </div>
      </div>

      {/* --- Scrollable Content Area --- */}
      <div className="flex-grow overflow-auto pt-[calc(10vh+1rem)] flex flex-col">

        {showSupervisionHeader && (
          <div className="text-[#75adab] bg-gray-700 px-4 py-2 flex justify-between items-center text-sm mb-4 mx-auto max-w-3xl rounded shrink-0" >
            <span className='font-nunito text-center flex-grow font-bold'>MODO SUPERVISIÓN DE COCINA</span>
            <button onClick={handleCloseSupervision} className="text-[#75adab] hover:text-yellow-700 font-bold text-lg leading-none" aria-label="Volver al día actual" title="Volver al día actual">&times;</button>
          </div>
        )}

        {/* Loading Indicator (Original from Cocina) */}
        {isLoading && (
          <div className="text-center p-10 flex-grow">
            Cargando...
          </div>
        )}

        {/* Content Area (Original from Cocina - structure for cards and salad section preserved) */}
        {!isLoading && (
          <div className="flex flex-col flex-grow min-h-0"> {/* Wrapper to help nested flex-grow */}
            {/* Product Grid (Original from Cocina) */}
            {productsData.length > 0 ? (
              <div className="p-6 flex-grow overflow-hidden mt-0">
                <div className={`grid gap-6 ${gridClass} h-full`}>
                  {productsData.slice(0, 9).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-10 text-gray-500 flex-grow">
                No hay productos o pedidos para mostrar en este turno/fecha.
              </div>
            )}

            {/* Salad Section (Original from Cocina) */}
            {saladsData.length > 0 && saladsData[0] && (
              <div className="p-6 bg-white -mt-5 shrink-0">
                <div className="flex flex-wrap md:flex-nowrap">
                  {saladsData[0].ensaladas && (
                    <div className="w-full md:w-1/2 p-2">
                      <SaladTypeCard type="ensaladas" data={saladsData[0].ensaladas} updateSaladCount={updateSaladCount} />
                    </div>
                  )}
                  {saladsData[0].ensaladillas && (
                    <div className="w-full md:w-1/2 p-2">
                      <SaladTypeCard type="ensaladillas" data={saladsData[0].ensaladillas} updateSaladCount={updateSaladCount} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div> {/* End Scrollable Content Area */}

      {/* --- Modals & Offcanvas (Integrated from HeaderFinal) --- */}
      <Offcanvas show={showOffcanvas} onHide={toggleOffcanvas} placement="start" style={{ width: '120px', top: '123px', background: '#f2ac02', borderTopRightRadius: '30px', borderBottomRightRadius: '30px', zIndex: 1050 }}>
        <Offcanvas.Header closeButton> <Offcanvas.Title></Offcanvas.Title> </Offcanvas.Header>
        <Offcanvas.Body><Nav><ul className="ms-2 flex flex-col justify-between text-center items-center gap-7 bg-[#f2ac02]">
              <Link className="p-3 mt-2 hover:bg-gray-100 hover:rounded-2xl" to={"/layout/comida"}> <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M15 18H9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g></svg> </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl' to={"/ordenes"}> <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M10.5 14L17 14" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 14H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 10.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 17.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 10.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 17.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="#757575" strokeWidth="1.5"/> <path d="M21 16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V13.0002M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V12.0002M8 4.00195C5.82497 4.01406 4.64706 4.11051 3.87868 4.87889C3.11032 5.64725 3.01385 6.82511 3.00174 9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g></svg> </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl' to={"/freidora"}> <svg fill="#757575" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="40px" height="40px" viewBox="0 0 91.689 91.689" xmlSpace="preserve"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <g> <path d="M74.41,42.085l-6.922,3.783l0.58-6.131l1.436,0.376l16.424-5.548l-3.037-10.497l-13.729,4.637l-14.853-3.892l-14.513,2.276 l-13.521-2.528l-10.109,8.94l6.299,8.324L22.2,41.833l-9.982,3.899l-7.474-4.445L0,50.855l11.6,6.9l12.813-5.004l3.576-0.113 l-3.738,8.75l11.969,6.232L48.73,61.9l14.635-1.299l13.471-7.364l14.443,1.183l0.41-10.919L74.41,42.085z M27.438,29.346 l12.301,2.301l14.371-2.255l15.19,3.98l10.857-3.667l0.553,1.908l-11.347,3.834l-15.342-4.02l-14.309,2.245l-11.758-2.199 l-4.762,4.211l-1.172-1.549L27.438,29.346z M29.121,36.258l10.533,1.971l5.236-0.821l-8.355,3.971l-13.697,0.435L29.121,36.258z M23.506,48.284l-11.654,4.552l-6.215-3.695L6.5,47.402l5.463,3.249l11.143-4.351l14.477-0.461l14.324-6.809l11.86,1.652 l-0.186,1.978l-11.352-1.58l-14.184,6.741L23.506,48.284z M39.096,52.284l13.867-6.592l11.834,1.647l-4.608,2.52l-14.285,1.268 l-9.746,4.456l-5.801-3.021L39.096,52.284z M87.266,49.611l-11.424-0.936l-13.776,7.532l-14.492,1.285l-11.379,5.204l-6.414-3.338 l0.764-1.786l5.639,2.937l10.877-4.976l14.428-1.278l13.916-7.606l11.938,0.979L87.266,49.611z"/> </g> </g></svg> </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl' to={"/cocina"}> <svg fill="#757575" height="40px" width="40px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" stroke="#757575" strokeWidth="6"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M85.432,411.629H40.162c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C93.516,415.247,89.896,411.629,85.432,411.629z"/> <path d="M471.838,411.629h-45.269c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C479.922,415.247,476.303,411.629,471.838,411.629z"/> <path d="M490.981,115.637h-21.435h-5.392c-4.466,0-8.084,3.619-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h5.392h21.435 c2.674,0,4.851,2.176,4.851,4.851v205.151H264.084V131.805h83.659h89.466c4.466,0,8.084-3.619,8.084-8.084 c0-4.466-3.618-8.084-8.084-8.084h-89.466H256H21.019C9.429,115.637,0,125.066,0,136.656v213.236v21.492 c0,11.59,9.429,21.019,21.019,21.019H256h234.981c11.59,0,21.019-9.429,21.019-21.019v-21.492V136.656 C512,125.066,502.571,115.637,490.981,115.637z M247.916,341.807h-27.365c-4.466,0-8.084,3.619-8.084,8.084 s3.618,8.084,8.084,8.084h27.365v18.258H21.019c-2.674,0.001-4.851-2.175-4.851-4.849v-13.408h177.795 c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H16.168V136.656c0-2.674,2.176-4.851,4.851-4.851h226.897 V341.807z M495.832,371.384c0,2.674-2.176,4.851-4.851,4.851H264.084v-18.258h231.747V371.384z"/> <path d="M286.181,209.934v53.787c0,4.466,3.619,8.084,8.084,8.084c4.466,0,8.084-3.618,8.084-8.084v-53.787 c0-4.466-3.618-8.084-8.084-8.084C289.8,201.85,286.181,205.468,286.181,209.934z"/> <path d="M217.735,271.805c4.466,0,8.084-3.618,8.084-8.084v-53.787c0-4.466-3.619-8.084-8.084-8.084s-8.084,3.619-8.084,8.084 v53.787C209.65,268.187,213.269,271.805,217.735,271.805z"/> <path d="M8.084,100.371h495.832c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H8.084 C3.619,84.203,0,87.821,0,92.287C0,96.753,3.619,100.371,8.084,100.371z"/> <path d="M43.32,200.086c2.068,0,4.137-0.789,5.716-2.368l29.048-29.049c3.157-3.157,3.157-8.276-0.001-11.432 c-3.156-3.156-8.275-3.157-11.432,0.001l-29.048,29.049c-3.157,3.157-3.157,8.276,0.001,11.432 C39.182,199.297,41.251,200.086,43.32,200.086z"/> <path d="M64.557,225.374c1.579,1.578,3.649,2.367,5.717,2.367s4.138-0.789,5.717-2.367l52.958-52.958 c3.157-3.158,3.157-8.276,0-11.433c-3.158-3.156-8.276-3.156-11.434,0l-52.958,52.958C61.4,217.099,61.4,222.217,64.557,225.374z "/> <path d="M46.664,231.834l-2.877,2.877c-3.157,3.158-3.157,8.276,0,11.433c1.579,1.578,3.649,2.367,5.717,2.367 c2.068,0,4.138-0.789,5.717-2.367l2.877-2.877c3.157-3.158,3.157-8.276,0-11.433C54.94,228.678,49.822,228.678,46.664,231.834z"/> </g> </g> </g> </g></svg> </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl' to={"/buscadorPedidos"}> <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M14 4C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V13M10 4C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10 16H6" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <circle cx="18" cy="17" r="3" stroke="#757575" strokeWidth="1.5"/> <path d="M20.5 19.5L21.5 20.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M2 10L7 10M22 10L11 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g></svg> </Link>
              <Link className='p-3 hover:bg-gray-100 hover:rounded-2xl' to={"/stock"}> <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M7.50626 15.2647C7.61657 15.6639 8.02965 15.8982 8.4289 15.7879C8.82816 15.6776 9.06241 15.2645 8.9521 14.8652L7.50626 15.2647ZM6.07692 7.27442L6.79984 7.0747V7.0747L6.07692 7.27442ZM4.7037 5.91995L4.50319 6.64265L4.7037 5.91995ZM3.20051 4.72457C2.80138 4.61383 2.38804 4.84762 2.2773 5.24675C2.16656 5.64589 2.40035 6.05923 2.79949 6.16997L3.20051 4.72457ZM20.1886 15.7254C20.5895 15.6213 20.8301 15.2118 20.7259 14.8109C20.6217 14.41 20.2123 14.1695 19.8114 14.2737L20.1886 15.7254ZM10.1978 17.5588C10.5074 18.6795 9.82778 19.8618 8.62389 20.1747L9.00118 21.6265C10.9782 21.1127 12.1863 19.1239 11.6436 17.1594L10.1978 17.5588ZM8.62389 20.1747C7.41216 20.4896 6.19622 19.7863 5.88401 18.6562L4.43817 19.0556C4.97829 21.0107 7.03196 22.1383 9.00118 21.6265L8.62389 20.1747ZM5.88401 18.6562C5.57441 17.5355 6.254 16.3532 7.4579 16.0403L7.08061 14.5885C5.10356 15.1023 3.89544 17.0911 4.43817 19.0556L5.88401 18.6562ZM7.4579 16.0403C8.66962 15.7254 9.88556 16.4287 10.1978 17.5588L11.6436 17.1594C11.1035 15.2043 9.04982 14.0768 7.08061 14.5885L7.4579 16.0403ZM8.9521 14.8652L6.79984 7.0747L5.354 7.47414L7.50626 15.2647L8.9521 14.8652ZM4.90421 5.19725L3.20051 4.72457L2.79949 6.16997L4.50319 6.64265L4.90421 5.19725ZM6.79984 7.0747C6.54671 6.15847 5.8211 5.45164 4.90421 5.19725L4.50319 6.64265C4.92878 6.76073 5.24573 7.08223 5.354 7.47414L6.79984 7.0747ZM11.1093 18.085L20.1886 15.7254L19.8114 14.2737L10.732 16.6332L11.1093 18.085Z" fill="#757575"/><path d="M19.1647 6.2358C18.6797 4.48023 18.4372 3.60244 17.7242 3.20319C17.0113 2.80394 16.1062 3.03915 14.2962 3.50955L12.3763 4.00849C10.5662 4.47889 9.66119 4.71409 9.24954 5.40562C8.8379 6.09714 9.0804 6.97492 9.56541 8.73049L10.0798 10.5926C10.5648 12.3481 10.8073 13.2259 11.5203 13.6252C12.2333 14.0244 13.1384 13.7892 14.9484 13.3188L16.8683 12.8199C18.6784 12.3495 19.5834 12.1143 19.995 11.4227C20.2212 11.0429 20.2499 10.6069 20.1495 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/></g></svg> </Link>
              <Link className='p-3 mb-2 hover:bg-gray-100 hover:rounded-2xl' to={"/login"}> <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g></svg> </Link>
            </ul></Nav>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showDateModal} onHide={handleCloseDateModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body><ThemeProvider theme={muiTheme}><LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es"><DemoContainer components={['StaticDatePicker']}><DemoItem><StaticDatePicker displayStaticWrapperAs="desktop" value={modalSelectedDate} onChange={handleDateChangeInModal} sx={{ '& .MuiPickersDay-root': { fontSize: '1.5rem' }, '& .MuiPickersCalendarHeader-root': { fontSize: '1.5rem' }, '& .MuiPickersDay-selected': { backgroundColor: 'blue' }, '& .MuiPickersDay-dayWithMargin': { margin: '2px' } }}/></DemoItem></DemoContainer></LocalizationProvider></ThemeProvider></Modal.Body>
        <Modal.Footer className='no-border'><Button variant="secondary" className="shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700" onClick={handleCloseDateModal}>Cancelar</Button><Button variant="primary" className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-600 hover:border-yellow-600" onClick={handleAcceptDate}>Aceptar</Button></Modal.Footer>
      </Modal>

      <Modal show={showSumarModal} onHide={handleCloseSumarModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="bg-white p-4"><h1 className="text-center font-nunito text-2xl text-gray-700 mb-4">Sumar en barra</h1><Form.Group controlId="numeroParaSumar"><Form.Label className="block text-center text-gray-300 font-nunito mb-4">Introduce la cantidad a sumar (admite negativos y decimal .5):</Form.Label><div className="flex justify-center "><input type="number" value={numeroASumar} onChange={(e) => { let val = e.target.value; if (val === "" || val === "-" || /^-?\d{1,2}(\.(5)?)?$/.test(val) || /^-?\d{0,2}\.$/.test(val) ) { if (val.endsWith("..")) val = val.slice(0,-1); if ((val.match(/\./g) || []).length > 1) val = val.slice(0, val.lastIndexOf('.')); if (val.split('.')[1]?.length > 1 && val.split('.')[1] !== '5') val = val.split('.')[0] + '.' + val.split('.')[1][0];  if (val.length > 5 && val !== "-") val = val.slice(0,5); setNumeroASumar(val); } }} autoFocus className="text-center w-[40%] text-3xl font-nunito text-gray-700 bg-transparent border-b-2 border-yellow-400 focus:outline-none focus:border-yellow-500 transition duration-300" placeholder="0" step="0.5"/></div></Form.Group></Modal.Body>
        <Modal.Footer className="flex justify-end gap-2" style={{ borderTop: 'none' }}><Button variant="secondary" onClick={handleCloseSumarModal} className=" shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700">Cancelar</Button><Button variant="primary" onClick={handleConfirmarSuma} className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-600 hover:border-yellow-600">Actualizar</Button></Modal.Footer>
      </Modal>

      <PedidoRapido ref={pedidoRapidoRef} datosCliente={datosCliente} />
    </div>
  );
};

export default Cocina;