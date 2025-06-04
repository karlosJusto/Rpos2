// --- Cocina.jsx ---
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
// Asegúrate que estas rutas son correctas para tu proyecto:
import ProductCard from './components/ProductCard'; 
import SaladTypeCard from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  onSnapshot,
  // setDoc, // No se usa directamente aquí para estadísticas en Cocina
  updateDoc,
  getDoc
} from 'firebase/firestore';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { dataContext } from '../Context/DataContext'; // Se mantiene como en tu original
import isEqual from 'lodash/isEqual';

// Importar el nuevo TestHeader
import TestHeader from '../ordenes/TestHeader'; // Ajusta la ruta si TestHeader.js no está en el mismo directorio

// Los siguientes imports eran de la cabecera original de Cocina y ahora son manejados por TestHeader o no son necesarios aquí.
// import RelojDistinto from './components/RelojDistinto';
// import PedidoRapido from '../ordenes/PedidoRapido';
// import { Offcanvas, Button, Nav, Modal, Form } from 'react-bootstrap';
// import { Link } from 'react-router-dom';
// import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
// import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
// import { createTheme, ThemeProvider } from '@mui/material/styles';
import 'dayjs/locale/es';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';


dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');


const formatDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      const d = dayjs(date);
      return d.isValid() ? d.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
  }
  return dayjs(date).format('DD/MM/YYYY');
};

const SALADS_COLLECTION_NAME = 'ensaladas';

const Cocina = () => {
  // --- Estados Originales de Cocina.jsx ---
  const [cocinaProducts, setCocinaProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  // currentPedidosMap no se usa, si sigue sin usarse, considerar eliminar.
  // const [currentPedidosMap, setCurrentPedidosMap] = useState(new Map()); 
  const [productosStockMap, setProductosStockMap] = useState(new Map());
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [isLoadingCocina, setIsLoadingCocina] = useState(true);
  const [isLoadingProductosStock, setIsLoadingProductosStock] = useState(true);
  const [isLoadingPedidosAndProcessing, setIsLoadingPedidosAndProcessing] = useState(true);
  // pedidosDelTurnoState solo se setea pero no parece usarse para renderizar. Si no se usa, considerar eliminar.
  const [pedidosDelTurnoState, setPedidosDelTurnoState] = useState([]);

  // selectedDate se mantiene para la lógica del cuerpo de Cocina
  const [selectedDate, setSelectedDate] = useState(new Date()); 

  const audioRef = useRef(null);
  const previousPedidosDelTurnoIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // Contexto: Se mantiene como en tu original. TestHeader es autónomo.
  const {
    libres,
    mostrarBarra,
    numeroBarra,
    setMostrarBarra, // Si TestHeader es el display, esto podría no ser necesario aquí
    pedidosConOrigenUno,
    setNumeroBarra // TestHeader maneja su propia base. Esto afectaría 'estadisticas_diarias' si el context lo hace
  } = useContext(dataContext);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => console.warn("Error playing notification sound:", error));
    }
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 3000);
    return () => clearInterval(timerId);
  }, []);

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
          console.warn(`[Cocina Fetch] ID no numérico omitido en 'cocina': ${doc.id}`); 
        }
      });
      productos.sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      console.log("[Cocina Fetch] Setting cocinaProducts state:", productos); 
      setCocinaProducts(productos);
      setIsLoadingCocina(false);
    }, (error) => {
      console.error("Error fetching cocina products:", error); 
      setIsLoadingCocina(false);
    });
    return () => unsubscribeCocina();
  }, []);

  useEffect(() => {
    setIsLoadingProductosStock(true);
    const productosRef = collection(db, 'productos');
    console.log("Setting up listener for 'productos' stock..."); 
    const unsubscribeProductos = onSnapshot(productosRef, (querySnapshot) => {
      console.log("'productos' snapshot received:", querySnapshot.size, "docs for stock"); 
      const stockMap = new Map();
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10);
        const data = doc.data();
        if (!isNaN(id) && data.stock !== undefined && typeof data.stock === 'number') {
          stockMap.set(id, data.stock);
        } else {
          console.warn(`[Productos Stock] Doc ID ${doc.id} omitido. ID no numérico o 'stock' inválido/faltante. Stock: ${data.stock}`); 
        }
      });
      console.log("[Productos Stock] Setting productosStockMap state:", stockMap); 
      setProductosStockMap(stockMap);
      setIsLoadingProductosStock(false);
    }, (error) => {
      console.error("Error fetching productos stock:", error); 
      setIsLoadingProductosStock(false);
    });
    return () => unsubscribeProductos();
  }, []);
  
  const getTurnoActual = useCallback(() => {
    const now = dayjs().tz('Europe/Madrid'); // Usando dayjs para consistencia
    const today = now.startOf('day');
    let startTime, endTime;
    // Lógica de turnos: Mañana hasta 18:00:00, Tarde desde 18:00:01
    const horaLimiteTardeInicio = today.hour(18).minute(0).second(0).millisecond(1); 

    if (now.isBefore(horaLimiteTardeInicio)) { // Turno de mañana
      startTime = today.hour(0).minute(1).second(0).millisecond(0); // Desde 00:01:00
      endTime = today.hour(18).minute(0).second(0).millisecond(0);   // Hasta 18:00:00
    } else { // Turno de tarde
      startTime = horaLimiteTardeInicio;                             // Desde 18:00:01
      endTime = today.hour(23).minute(59).second(59).millisecond(999);// Hasta 23:59:59
    }
    return { startTime, endTime };
  }, []);

  const selectedDateStr = formatDate(selectedDate);
  const todayStr = formatDate(new Date());
  const isToday = selectedDateStr === todayStr;
  const showSupervisionHeader = selectedDateStr !== todayStr; // Para el banner de MODO SUPERVISIÓN en el cuerpo

  const handleCloseSupervision = () => { 
    setSelectedDate(new Date());
    // console.log("[Cocina] Exiting supervision mode, returning to today."); 
  };

  // --- EFFECT A: Listener de Pedidos y Agregación para UI (Restaurado a tu lógica original de fetch y filtrado) ---
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
    const pedidosRef = collection(db, 'pedidos'); // Fetch de todos los pedidos
    console.log("[Effect A] Setting up listener / Re-running due to Date, Products, Stock...");

    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      console.log(`[Effect A] Snapshot received (${querySnapshot.size} docs). Filtering for date: ${selectedDateStr}`);
      const allPedidosRaw = [];
      // const updatePromises = []; // No se usa en tu lógica original

      querySnapshot.forEach((pedidoDocSnapshot) => {
        const pedidoData = { id: pedidoDocSnapshot.id, ...pedidoDocSnapshot.data() };
        let needsFirestoreUpdate = false;
        let processedProductos = pedidoData.productos;

        if (pedidoData.productos && Array.isArray(pedidoData.productos)) {
          processedProductos = pedidoData.productos.map(p => {
            if (isToday && p.nuevoCocina === undefined && p.listo !== true) {
              console.log(`[Effect A - HOY] Producto (ID: ${p.id}, Nombre: ${p.nombre || 'N/A'}) en pedido ${pedidoDocSnapshot.id} no está listo y nuevoCocina es undefined. Inicializando nuevoCocina a 0.`);
              needsFirestoreUpdate = true;
              return { ...p, nuevoCocina: 0 }; 
            } else if (p.nuevoCocina === undefined && p.listo !== true && !isToday) {
              console.log(`[Effect A - NO HOY] Producto (ID: ${p.id}, Nombre: ${p.nombre || 'N/A'}) en pedido ${pedidoDocSnapshot.id} no está listo y nuevoCocina es undefined. NO se inicializa nuevoCocina porque no es el día actual.`);
            } else if (p.nuevoCocina === undefined && p.listo === true) {
              console.log(`[Effect A] Producto (ID: ${p.id}, Nombre: ${p.nombre || 'N/A'}) en pedido ${pedidoDocSnapshot.id} YA ESTÁ LISTO. No se inicializa nuevoCocina.`);
            }
            return p;
          });
        } else {
          processedProductos = []; 
          console.warn(`[Effect A] Pedido ${pedidoData.id} has missing or invalid 'productos' array.`);
        }

        if (needsFirestoreUpdate) {
          const pedidoRef = doc(db, 'pedidos', pedidoDocSnapshot.id);
          updateDoc(pedidoRef, { productos: processedProductos })
            .then(() => {
              console.log(`[Effect A] ÉXITO: Firestore actualizado para nuevoCocina en pedido ${pedidoDocSnapshot.id} (SOLO SI isToday era true).`);
            })
            .catch(err => console.error(`[Effect A] Error initializing nuevoCocina for ${pedidoDocSnapshot.id}`, err));
        }
        allPedidosRaw.push({ ...pedidoData, productos: processedProductos });
      });
      
      // Filtrado tal como lo tenías: primero por fecha string, luego por turno si es hoy
      const pedidosDelTurno = allPedidosRaw.filter((pedido) => {
        if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
        const parts = pedido.fechahora.split(' ');
        if (parts.length !== 2) return false;
        const [fechaPedido, horaPedido] = parts;
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
        
        if (fechaPedido !== selectedDateStr) return false; // Filtro por fecha seleccionada
        
        if (isToday) { // Si es hoy, aplicar filtro de turno
          const { startTime, endTime } = getTurnoActual();
          const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid',true);
          if (!orderDateTime.isValid()) return false;
          return orderDateTime.isBetween(startTime, endTime, null, '[]');
        }
        return true; // Si no es hoy, pero la fecha coincide, incluirlo
      });
      console.log(`[Effect A] ${pedidosDelTurno.length} orders found for date ${selectedDateStr} / shift.`);
      setPedidosDelTurnoState(pedidosDelTurno); // Seteas este estado, aunque no parezca usarse directamente para renderizar luego

      // --- Logic for New Order Sound Alert (mantenida de tu original) ---
      if (isToday) {
        const currentTurnoPedidoIds = new Set(pedidosDelTurno.map(p => p.id));
        let newOrderForProductCardFound = false;

        if (initialLoadDoneRef.current) { 
          for (const pedido of pedidosDelTurno) {
            if (!previousPedidosDelTurnoIdsRef.current.has(pedido.id)) {
              if (pedido.productos && Array.isArray(pedido.productos)) {
                const hasRelevantProduct = pedido.productos.some(prod => {
                  const targetProdId = prod.id === 48 ? 41 : prod.id; 
                  return cocinaProducts.some(cp => cp.id === targetProdId && cp.id !== 48);
                });
                if (hasRelevantProduct) {
                  newOrderForProductCardFound = true;
                  break;
                }
              }
            }
          }
        }

        if (newOrderForProductCardFound) {
          console.log("[Effect A] New order with ProductCard items detected. Playing sound.");
          playNotificationSound();
        }

        previousPedidosDelTurnoIdsRef.current = currentTurnoPedidoIds;
        if (!initialLoadDoneRef.current && (querySnapshot.size > 0 || pedidosDelTurno.length > 0)) {
            initialLoadDoneRef.current = true;
        }
      } else { 
        previousPedidosDelTurnoIdsRef.current = new Set();
        initialLoadDoneRef.current = false;
      }
      // --- End of Sound Alert Logic ---

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
            let quantityForHeader = Number(prod.cantidad) || 0; // Asegurar que es número
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

            const orderData = {
              idPedido: pedido.id,
              idProducto: originalProdId,
              orderLineId: orderLineId,
              producto: { ...prod, listo: prod.listo ?? false, nuevoCocina: prod.nuevoCocina ?? 0 }, 
              hora: pedido.fechahora,
              nombre: pedido.cliente || 'Sin nombre',
              cantidad: (originalProdId === 48) ? (quantityForHeader * 0.5) : quantityForHeader,
              descripcion: pedido.observaciones || "",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, cocinaProducts, productosStockMap, isToday, getTurnoActual, isLoadingCocina, isLoadingProductosStock, playNotificationSound]); // playNotificationSound añadido a deps

  useEffect(() => {
    console.log("[Cocina - Effect B] mostrarBarra (del DataContext) valor actual:", mostrarBarra); // Este log se mantiene como estaba
  }, [mostrarBarra]);

  useEffect(() => {
    if (isLoadingPedidosAndProcessing || !productsData || productsData.length === 0) { return; }

    const now = dayjs(currentTimeTick);
    let flagsOrOrderChanged = false;

    const updatedProductsData = productsData.map(product => {
        let productFlagsChanged = false;
        const updatedOrders = product.orders.map(order => {
            const orderTimeDayjs = dayjs(order.hora, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid',true);
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
            const timeA = dayjs(a.hora, "DD/MM/YYYY HH:mm", 'es', true).tz('Europe/Madrid',true);
            const timeB = dayjs(b.hora, "DD/MM/YYYY HH:mm", 'es', true).tz('Europe/Madrid',true);

            if (timeA.isValid() && timeB.isValid()) {
                const timeDiff = timeA.diff(timeB);
                if (timeDiff !== 0) return timeDiff; 
            } else {
                if (timeA.isValid() && !timeB.isValid()) return -1;
                if (!timeA.isValid() && timeB.isValid()) return 1;
            }
            if (a.isOverdue && !b.isOverdue) return -1; if (!a.isOverdue && b.isOverdue) return 1;
            if (a.needsCookingAlert && !b.needsCookingAlert) return -1; if (!a.needsCookingAlert && b.needsCookingAlert) return 1;
            return 0; 
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
        console.log("[Effect C] Flags or order changed, updating productsData state."); 
        setProductsData(updatedProductsData);
    }
  }, [currentTimeTick, productsData, isLoadingPedidosAndProcessing]); 

  const todayDocId = selectedDateStr.replace(/\//g, '-'); // Usar selectedDateStr que es de Cocina
  useEffect(() => {
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
    console.log(`[Salads Display Effect] Subscribing to ${SALADS_COLLECTION_NAME}/${todayDocId}`); 

    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        console.log(`[Salads Display Effect] Data received for ${todayDocId}:`, docSnapshot.data()); 
        const data = docSnapshot.data();
        setSaladsData([data]); 
      } else {
        console.log(`[Salads Display Effect] Document ${todayDocId} does not exist yet.`); 
        setSaladsData([]);
      }
    }, (error) => {
        console.error(`[Salads Display Effect] Error fetching salads data for ${todayDocId}:`, error); 
        setSaladsData([]);
    });
    return () => {
        console.log(`[Salads Display Effect] Unsubscribing from ${todayDocId}`); 
        unsubscribe();
    };
  }, [todayDocId]); 

  const updateSaladCount = async (type, size, amount) => {
    const sizeKey = size.toLowerCase().startsWith('grande') ? 'grandes' : 'pequenas';
    const currentAmount = parseInt(amount, 10);
    if (isNaN(currentAmount)) {
        console.error(`[Update Salad Count] Invalid amount received: ${amount}`); 
        return;
    }
    const newAmount = Math.max(0, currentAmount);
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
    const updatePath = `${type}.${sizeKey}.preparadas`;
    console.log(`[Update Salad Count] Updating ${updatePath} to ${newAmount} in ${todayDocId}`); 
    try {
      const docSnap = await getDoc(saladsRef);
      if (docSnap.exists()) {
          await updateDoc(saladsRef, { [updatePath]: newAmount });
          console.log(`[Update Salad Count] ${updatePath} updated successfully.`); 
      } else {
          console.warn(`[Update Salad Count] Document ${todayDocId} does not exist. Cannot update preparadas count.`); 
      }
    } catch (error) {
      console.error(`Error updating ${updatePath}:`, error); 
    }
  };

  const productCountForGrid = Math.min(productsData.length, 9);
  let gridClass = '';
  if (productCountForGrid <= 1) gridClass = 'grid-cols-1';
  else if (productCountForGrid === 2) gridClass = 'grid-cols-2';
  else if (productCountForGrid === 3) gridClass = 'grid-cols-3';
  else if (productCountForGrid === 4) gridClass = 'grid-cols-2 grid-rows-2';
  else if (productCountForGrid <= 6) gridClass = 'grid-cols-3 grid-rows-2';
  else gridClass = 'grid-cols-3 grid-rows-3';

  const isLoadingOverall = isLoadingCocina || isLoadingProductosStock || isLoadingPedidosAndProcessing;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      
      <TestHeader /> {/* <--- NUEVO HEADER INTEGRADO AQUÍ ---> */}
      
      <div className="flex-grow overflow-auto pt-[12vh] flex flex-col">

        {/* Banner de Modo Supervisión (original de Cocina) */}
        {showSupervisionHeader && (
          <div className="text-[#75adab] bg-gray-700 px-4 py-2 flex justify-between items-center text-sm mb-4 mx-auto max-w-3xl rounded shrink-0" >
            <span className='font-nunito text-center flex-grow font-bold'>MODO SUPERVISIÓN DE COCINA ({selectedDateStr})</span>
            <button 
              onClick={handleCloseSupervision} 
              className="text-[#75adab] hover:text-yellow-700 font-bold text-lg leading-none" 
              aria-label="Volver al día actual" 
              title="Volver al día actual"
            >
                &times;
            </button>
          </div>
        )}

        {isLoadingOverall && (
          <div className="text-center p-10 flex-grow">
            Cargando datos de cocina...
          </div>
        )}

        {!isLoadingOverall && (
          <div className="flex flex-col flex-grow min-h-0">
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
                No hay productos o pedidos para mostrar en este turno/fecha ({selectedDateStr}).
              </div>
            )}

            {saladsData.length > 0 && saladsData[0] && (
              <div className="p-6 bg-white mt-2 shrink-0"> {/* Ajustado -mt-5 a mt-2 por si acaso */}
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
      </div>
      
      <audio ref={audioRef} src="/musica/level-up.mp3" preload="auto" />
    </div>
  );
};

export default Cocina;