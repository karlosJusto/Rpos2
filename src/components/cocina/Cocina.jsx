// --- Cocina.jsx ---
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import ProductCard from './components/ProductCard';
import SaladTypeCard from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { dataContext } from '../Context/DataContext';
import isEqual from 'lodash/isEqual';

// Asegúrate que la ruta a TestHeader sea correcta desde Cocina.jsx
import TestHeader from '../ordenes/TestHeader';

import 'dayjs/locale/es';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const formatDate = (dateInput) => {
  // Si dateInput es null (para "hoy" desde el contexto), o undefined, usar la fecha actual.
  // Si dateInput ya es un objeto Date o un string parseable por dayjs, se usará.
  const dateToFormat = dateInput || new Date();
  const d = dayjs(dateToFormat);
  return d.isValid() ? d.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
};

const SALADS_COLLECTION_NAME = 'ensaladas';

const Cocina = () => {
  const [cocinaProducts, setCocinaProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  const [productosStockMap, setProductosStockMap] = useState(new Map());
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [isLoadingCocina, setIsLoadingCocina] = useState(true);
  const [isLoadingProductosStock, setIsLoadingProductosStock] = useState(true);
  const [isLoadingPedidosAndProcessing, setIsLoadingPedidosAndProcessing] = useState(true);
  const [pedidosDelTurnoState, setPedidosDelTurnoState] = useState([]);

  // ELIMINAMOS el estado local [selectedDate, setSelectedDate]
  // const [selectedDate, setSelectedDate] = useState(new Date());

  const audioRef = useRef(null);
  const previousPedidosDelTurnoIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // Usamos dateToPass y setDateToPass del DataContext
  const {
    libres, // Se mantiene si se usa en Cocina, aunque TestHeader también lo calcula
    mostrarBarra, // Se mantiene si se usa
    numeroBarra, // Se mantiene si se usa
    setMostrarBarra,
    pedidosConOrigenUno, // Se mantiene si se usa
    setNumeroBarra,
    dateToPass, // <--- Fecha global del contexto
    setDateToPass  // <--- Función para actualizar la fecha global del contexto
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
    const now = dayjs().tz('Europe/Madrid');
    const today = now.startOf('day');
    let startTime, endTime;
    const horaLimiteTardeInicio = today.hour(18).minute(0).second(0).millisecond(1);

    if (now.isBefore(horaLimiteTardeInicio)) {
      startTime = today.hour(0).minute(1).second(0).millisecond(0);
      endTime = today.hour(18).minute(0).second(0).millisecond(0);
    } else {
      startTime = horaLimiteTardeInicio;
      endTime = today.hour(23).minute(59).second(59).millisecond(999);
    }
    return { startTime, endTime };
  }, []);

  // selectedDateStr, isToday y showSupervisionHeader ahora dependen de dateToPass (del contexto)
  const selectedDateStr = formatDate(dateToPass); // dateToPass es null para hoy, formatDate lo manejará
  const isToday = !dateToPass; // Si dateToPass es null, es hoy
  const showSupervisionHeader = !!dateToPass; // Mostrar si dateToPass tiene un valor (no es null)


  const handleCloseSupervision = () => {
    // setSelectedDate(new Date()); // Ya no se usa el estado local
    setDateToPass(null); // Actualiza el contexto para volver a "hoy"
    console.log("[Cocina] Exiting supervision mode, returning to today via context.");
  };

  useEffect(() => {
    // If 'cocina' data (cocinaProducts) is still loading,
    // we must wait and clear dependent states.
    if (isLoadingCocina) {
      console.log("[Effect A] Waiting for COCINA base data (cocinaProducts)...");
      setIsLoadingPedidosAndProcessing(true); // This effect's processing part is also "loading" or waiting
      setProductsData([]);
      setPedidosDelTurnoState([]);
      return; // Exit early
    }

    // If 'cocina' data has finished loading, but there are no cocinaProducts.
    // !isLoadingCocina is true here because the above block would have caught it.
    if (cocinaProducts.length === 0) {
      console.log("[Effect A] No base cocinaProducts defined after loading. Skipping further processing.");
      setIsLoadingPedidosAndProcessing(false); // No pedidos/aggregation processing will occur.
      setProductsData([]);
      setPedidosDelTurnoState([]);
      return; // Exit early
    }

    // If we've reached this point:
    // 1. `cocinaProducts` are loaded and `cocinaProducts.length > 0`.
    // 2. `isLoadingCocina` is false.
    // This effect will now proceed to set up the 'pedidos' listener and aggregate data.
    // This main processing part has its own loading state.
    console.log(`[Effect A] cocinaProducts available. Setting up listener / Re-running due to Date (from context: ${selectedDateStr}), Products, Stock...`);
    setIsLoadingPedidosAndProcessing(true);

    // Construct the query to fetch pedidos only for the selectedDateStr
    // This uses a common Firestore trick for "starts with" string queries.
    const pedidosQuery = query(
      collection(db, 'pedidos'),
      where("fechahora", ">=", selectedDateStr),
      where("fechahora", "<", selectedDateStr + "\uf8ff") // \uf8ff is a very high Unicode character
    );

    console.log(`[Effect A] Subscribing to 'pedidos' with query for date: ${selectedDateStr}`);

    const unsubscribe = onSnapshot(pedidosQuery, (querySnapshot) => {
      console.log(`[Effect A] Snapshot received (${querySnapshot.size} docs). Filtering for date: ${selectedDateStr}`);
      const allPedidosRaw = [];

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

      const pedidosDelTurno = allPedidosRaw.filter((pedido) => {
        if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
        const parts = pedido.fechahora.split(' ');
        if (parts.length !== 2) return false;
        const [fechaPedido, horaPedido] = parts;
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
        
        // This client-side check is now largely redundant due to the Firestore query,
        // but kept as a safeguard or if strict matching is needed beyond "starts with".
        // if (fechaPedido !== selectedDateStr) return false; // Can be removed if confident in Firestore query

        if (isToday) {
          const { startTime, endTime } = getTurnoActual();
          const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid',true);
          if (!orderDateTime.isValid()) return false;
          return orderDateTime.isBetween(startTime, endTime, null, '[]');
        }
        return true;
      });
      console.log(`[Effect A] ${pedidosDelTurno.length} orders found for date ${selectedDateStr} / shift.`);
      setPedidosDelTurnoState(pedidosDelTurno);

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
            let quantityForHeader = Number(prod.cantidad) || 0;
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
            const orderTimeDayjs = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid',true); // Parsear una vez

            const orderData = {
              idPedido: pedido.id,
              idProducto: originalProdId,
              orderLineId: orderLineId,
              producto: { ...prod, listo: prod.listo ?? false, nuevoCocina: prod.nuevoCocina ?? 0 },
              hora: pedido.fechahora,
              orderTimeDayjs: orderTimeDayjs, // Almacenar el objeto Dayjs parseado
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
  }, [selectedDateStr, cocinaProducts, productosStockMap, isToday, getTurnoActual, isLoadingCocina, playNotificationSound]);

  // Función para resetear los contadores de ensaladas para el turno de tarde
  const resetSaladCountsForAfternoonShift = useCallback(async (docId) => {
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, docId);
    console.log(`[Salad Reset] Attempting to reset salad counts for afternoon shift for doc: ${docId}`);
    try {
      const docSnap = await getDoc(saladsRef);
      if (docSnap.exists()) {
        const dataToUpdate = {
          'ensaladas.grandes.preparadas': 0,
          'ensaladas.grandes.pedidas': 0,
          'ensaladas.pequenas.preparadas': 0,
          'ensaladas.pequenas.pedidas': 0,
          'ensaladillas.grandes.preparadas': 0,
          'ensaladillas.grandes.pedidas': 0,
          'ensaladillas.pequenas.preparadas': 0,
          'ensaladillas.pequenas.pedidas': 0,
          afternoonResetDone: true, // Marcar que el reseteo se ha hecho
        };
        await updateDoc(saladsRef, dataToUpdate);
        console.log(`[Salad Reset] Salad counts and 'pedidas' reset successfully for ${docId}. afternoonResetDone set to true.`);
      } else {
        console.warn(`[Salad Reset] Document ${docId} does not exist. Cannot reset counts. Consider creating it with defaults if this is unexpected.`);
        // Opcionalmente, podríamos crear el documento aquí con setDoc y { merge: true } si es el comportamiento deseado.
        // Por ahora, solo advertimos.
      }
    } catch (error) {
      console.error(`[Salad Reset] Error resetting salad counts for ${docId}:`, error);
    }
  }, []);


  useEffect(() => {
    console.log("[Cocina - Effect B] mostrarBarra (del DataContext) valor actual:", mostrarBarra);
  }, [mostrarBarra]);

  // Mover la declaración de todayDocId aquí, antes de que se use en el siguiente useEffect
  const todayDocId = formatDate(dateToPass).replace(/\//g, '-'); // Usa dateToPass del contexto

  useEffect(() => {
    if (isLoadingPedidosAndProcessing || !productsData || productsData.length === 0) { return; }
    const now = dayjs(currentTimeTick).tz('Europe/Madrid'); // Asegurar timezone
    let flagsOrOrderChanged = false;
    const updatedProductsData = productsData.map(product => {
        let productFlagsChanged = false;
        const updatedOrders = product.orders.map(order => {
            // Usar el objeto order.orderTimeDayjs pre-parseado
            const orderTime = order.orderTimeDayjs; // Ya es un objeto dayjs
            let newNeedsCookingAlert = false;
            const nombreProdLower = order.producto?.nombre ? order.producto.nombre.toLowerCase() : '';
            const productId = order.idProducto;
            let alertTimeWindowMins = 0;
            if (nombreProdLower.includes('codillo') || nombreProdLower.includes('costilla') || productId === 48) {
                alertTimeWindowMins = 30;
            } else if (nombreProdLower.includes('chorizo') || nombreProdLower.includes('morcilla')) {
                alertTimeWindowMins = 15;
            }
            if (alertTimeWindowMins > 0 && orderTime.isValid() && !order.producto.listo) {
                const alertStartTime = orderTime.subtract(alertTimeWindowMins, 'minute');
                if (now.isBetween(alertStartTime, orderTime, null, '[]')) {
                    newNeedsCookingAlert = true;
                }
            }
            const newIsOverdue = orderTime.isValid() && now.isAfter(orderTime) && !order.producto.listo;
            if (newNeedsCookingAlert !== order.needsCookingAlert || newIsOverdue !== order.isOverdue) {
                productFlagsChanged = true;
            }
            return { ...order, needsCookingAlert: newNeedsCookingAlert, isOverdue: newIsOverdue };
        });
        const originalOrderIds = product.orders.map(o => o.orderLineId).join(',');
        updatedOrders.sort((a, b) => {
            const timeA = a.orderTimeDayjs; // Usar objetos Dayjs pre-parseados
            const timeB = b.orderTimeDayjs; // Usar objetos Dayjs pre-parseados
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
        // console.log("[Effect C] Flags or order changed, updating productsData state."); // Comentado para reducir logs
        setProductsData(updatedProductsData);
    }

    // Lógica para resetear ensaladas al inicio del turno de tarde (18:00)
    if (isToday) { // Solo resetear para el día actual
      const HORA_RESETEO_TARDE = 18;
      // todayDocId ya está disponible y se calcula basado en dateToPass (que será null para isToday)

      if (now.hour() >= HORA_RESETEO_TARDE) {
        const currentSaladDocData = saladsData && saladsData.length > 0 ? saladsData[0] : null;

        if (currentSaladDocData && !currentSaladDocData.afternoonResetDone) {
          console.log(`[Cocina - Salad Reset Check] Hora (${now.format('HH:mm')}) >= ${HORA_RESETEO_TARDE}:00 y afternoonResetDone es false o no existe para ${todayDocId}. Iniciando reseteo.`);
          resetSaladCountsForAfternoonShift(todayDocId);
        } else if (currentSaladDocData && currentSaladDocData.afternoonResetDone) {
          // console.log(`[Cocina - Salad Reset Check] Reseteo de tarde para ${todayDocId} ya realizado.`);
        } else if (!currentSaladDocData && now.hour() >= HORA_RESETEO_TARDE) {
          // Esto puede ocurrir si el documento de ensaladas aún no se ha creado para el día.
          // La función resetSaladCountsForAfternoonShift intentará actualizarlo.
          // Si el documento no existe, la función registrará una advertencia.
          console.log(`[Cocina - Salad Reset Check] Documento de ensaladas para ${todayDocId} no encontrado, pero es hora de resetear (${now.format('HH:mm')}). Intentando reset.`);
          resetSaladCountsForAfternoonShift(todayDocId);
        }
      }
    }

  }, [currentTimeTick, productsData, isLoadingPedidosAndProcessing, isToday, todayDocId, saladsData, resetSaladCountsForAfternoonShift]);

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

  const updateSaladCount = useCallback(async (type, size, amount) => {
    // todayDocId se deriva de dateToPass, así que dateToPass es una dependencia.
    // Para asegurar que usamos el valor más actual de dateToPass dentro del callback,
    // recalculamos docId aquí o lo pasamos como dependencia si fuera un estado separado.
    const docId = formatDate(dateToPass).replace(/\//g, '-');

    const sizeKey = size.toLowerCase().startsWith('grande') ? 'grandes' : 'pequenas';
    const currentAmount = parseInt(amount, 10);
    if (isNaN(currentAmount)) {
        console.error(`[Update Salad Count] Invalid amount received: ${amount}`);
        return;
    }
    const newAmount = Math.max(0, currentAmount);
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, docId);
    const updatePath = `${type}.${sizeKey}.preparadas`;
    console.log(`[Update Salad Count] Updating ${updatePath} to ${newAmount} in ${docId}`);
    try {
      const docSnap = await getDoc(saladsRef);
      if (docSnap.exists()) {
          await updateDoc(saladsRef, { [updatePath]: newAmount });
          console.log(`[Update Salad Count] ${updatePath} updated successfully.`);
      } else {
          console.warn(`[Update Salad Count] Document ${docId} does not exist. Cannot update preparadas count.`);
      }
    } catch (error) {
      console.error(`Error updating ${updatePath}:`, error);
    }
  }, [dateToPass]); // dateToPass es la dependencia ya que todayDocId se deriva de él.

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

      <TestHeader /> {/* TestHeader ya usa la fecha del contexto */}

      <div className="flex-grow overflow-auto pt-[12vh] flex flex-col">

        {/* Banner de Modo Supervisión, ahora usa `showSupervisionHeader` y `selectedDateStr` derivados del contexto */}
        {showSupervisionHeader && (
        <div className="text-[#75adab] bg-gray-700 px-4 py-2 flex justify-between items-center text-sm  w-full  shrink-0">
            <span className='font-nunito text-center flex-grow font-bold'>MODO SUPERVISIÓN DE COCINA ({selectedDateStr})</span>
            <button
              onClick={handleCloseSupervision} // Ahora llama a setDateToPass(null)
              className="text-[#75adab] hover:text-yellow-700 font-bold text-lg leading-none"
              aria-label="Volver al día actual"
              title="Volver al día actual"
            >
                &times;
            </button>
          </div>
        )}

        {/* Muestra el cargador principal solo si los productos base de 'cocina' aún no se han cargado
            O si después de cargar, no hay productos definidos y no estamos en medio de una carga de pedidos. */}
        {(isLoadingCocina || (!isLoadingCocina && cocinaProducts.length === 0 && !isLoadingPedidosAndProcessing)) && (
          <div className="text-center p-10 flex-grow">
            Cargando datos de cocina...
          </div>
        )}

        {/* Muestra las tarjetas de producto y ensaladas si los productos de 'cocina' están cargados.
            Este bloque se renderizará incluso si isLoadingPedidosAndProcessing es true,
            permitiendo que las tarjetas se actualicen suavemente. */}
        {!isLoadingCocina && cocinaProducts.length > 0 && (
          <div className="flex flex-col flex-grow min-h-0">
            {/* Muestra el área de la cuadrícula si hay datos de productos o si se están cargando */}
            {(productsData.length > 0 || isLoadingPedidosAndProcessing) ? (
              <div className="p-6 flex-grow overflow-hidden mt-0">
                <div className={`grid gap-6 ${gridClass} h-full`}>
                  {productsData.slice(0, 9).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : (
              // Este caso: !isLoadingPedidosAndProcessing Y productsData.length === 0
              // (y sabemos que cocinaProducts.length > 0 por la condición externa)
              // Significa que el procesamiento terminó, pero no resultó en datos de productos mostrables para la vista actual.
              <div className="text-center p-10 text-gray-500 flex-grow">
                No hay productos con pedidos para mostrar en este turno/fecha ({selectedDateStr}).
              </div>
            )}

            {saladsData.length > 0 && saladsData[0] && (
              <div className="p-6 bg-white mt-2 shrink-0">
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