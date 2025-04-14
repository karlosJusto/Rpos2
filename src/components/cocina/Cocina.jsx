// --- Cocina.jsx (Completo - Stock Productos + Lógica Original Ensaladas + Refresco Alertas) ---
import React, { useEffect, useState, useRef, useCallback } from 'react';
import HeaderFinal from './components/HeaderFinal'; // Ajusta la ruta si es necesario
import ProductCard from './components/ProductCard';  // Ajusta la ruta si es necesario
import SaladTypeCard from './components/SaladTypeCard'; // Ajusta la ruta si es necesario
import { db } from '../firebase/firebase'; // Ajusta la ruta a tu config de firebase
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

// Extend dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// Función para formatear la fecha en "dd/mm/yyyy" (con ceros a la izquierda)
const formatDate = (date) => {
  // Maneja casos donde 'date' no es un objeto Date válido
  if (!date || !(date instanceof Date) || isNaN(date)) {
      // Intenta parsear con dayjs, si falla, usa la fecha actual
      const d = dayjs(date);
      return d.isValid() ? d.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
  }
  // Si es una Date válida, formatea directamente
  return dayjs(date).format('DD/MM/YYYY');
};

// Constante para el nombre de la colección de ensaladas (según tu lógica original)
const SALADS_COLLECTION_NAME = 'ensaladas';

const Cocina = () => {
  // --- Estados ---
  const [cocinaProducts, setCocinaProducts] = useState([]); // Productos base de 'cocina' (sin stock)
  const [productsData, setProductsData] = useState([]); // Datos para ProductCards (con stock de 'productos')
  const [saladsData, setSaladsData] = useState([]); // Estado para datos de ensaladas (estructura original)
  const [selectedDate, setSelectedDate] = useState(new Date()); // Fecha seleccionada por el usuario
  const [currentPedidosMap, setCurrentPedidosMap] = useState(new Map()); // Para detectar pedidos 'nuevos'
  const [productosStockMap, setProductosStockMap] = useState(new Map()); // Mapa [ID -> Stock] desde 'productos'
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now()); // Para forzar re-cálculo periódico
  // --- Loading States ---
  const [isLoadingCocina, setIsLoadingCocina] = useState(true); // Carga de productos base
  const [isLoadingProductosStock, setIsLoadingProductosStock] = useState(true); // Carga de stock
  const [isLoadingPedidosAndProcessing, setIsLoadingPedidosAndProcessing] = useState(true); // Carga y procesamiento de pedidos
  // const [isLoadingSalads, setIsLoadingSalads] = useState(true); // Opcional: si la carga de ensaladas es crítica


  // --- Efecto para Refresco Periódico (Alertas) ---
  useEffect(() => {
      // Intervalo para actualizar el 'tick' de tiempo cada 30 segundos
      const timerId = setInterval(() => {
          console.log("[Time Tick Update] Forcing recalculation of alerts/overdue status...");
          setCurrentTimeTick(Date.now());
      }, 30000); // 30 segundos

      // Limpiar intervalo al desmontar el componente
      return () => clearInterval(timerId);
  }, []); // Ejecutar solo una vez


  // 1. Suscripción a "cocina" (Obtiene qué productos mostrar: ID, nombre, orden...)
  useEffect(() => {
    setIsLoadingCocina(true);
    const cocinaRef = collection(db, 'cocina');
    const unsubscribeCocina = onSnapshot(cocinaRef, (querySnapshot) => {
      const productos = [];
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10);
        if (!isNaN(id)) {
            // Excluir 'stock' si existiera en 'cocina', ya que lo leeremos de 'productos'
            const { stock, ...restOfData } = doc.data();
            productos.push({ id: id, ...restOfData });
        } else {
             console.warn(`[Cocina Fetch] ID no numérico omitido en 'cocina': ${doc.id}`);
        }
      });
      // Ordenar según el campo 'orden' o por 'id' si no existe 'orden'
      productos.sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      console.log("[Cocina Fetch] Setting cocinaProducts state:", productos);
      setCocinaProducts(productos);
      setIsLoadingCocina(false);
    }, (error) => {
        console.error("Error fetching cocina products:", error);
        setIsLoadingCocina(false);
    });
    // Limpieza del listener
    return () => unsubscribeCocina();
  }, []); // Se ejecuta solo al montar


  // 2. Suscripción a "productos" (Obtiene el STOCK real)
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
            // Validar ID numérico y existencia/tipo del campo 'stock'
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
    // Limpieza del listener
    return () => unsubscribeProductos();
  }, []); // Se ejecuta solo al montar


  // --- Funciones Auxiliares y Variables de Fecha/Turno ---
  // Función para determinar el turno actual (Mañana/Tarde)
  const getTurnoActual = useCallback(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let startTime, endTime;
      // Turno de mañana: hasta las 18:00 inclusive
      if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
          startTime = new Date(today.getTime()); startTime.setHours(0, 1, 0, 0); // Desde 00:01
          endTime = new Date(today.getTime()); endTime.setHours(18, 0, 0, 0);   // Hasta 18:00:00.000
      }
      // Turno de tarde: desde las 18:01
      else {
          startTime = new Date(today.getTime()); startTime.setHours(18, 0, 0, 1); // Desde 18:00:00.001 (o 18:01:00:000 si prefieres)
          endTime = new Date(today.getTime()); endTime.setHours(23, 59, 59, 999); // Hasta fin del día
      }
      return { startTime, endTime };
  }, []); // useCallback para evitar re-creaciones innecesarias

  // Manejador para cambio de fecha en un posible input date picker
  const handleDateChange = (e) => {
      const newDate = dayjs(e.target.value, 'YYYY-MM-DD').toDate();
      setSelectedDate(newDate);
  };

  // Variables de fecha y turno formateadas
  const selectedDateStr = formatDate(selectedDate); // Formato DD/MM/YYYY
  const todayStr = formatDate(new Date());
  const isToday = selectedDateStr === todayStr; // Booleano, ¿estamos viendo hoy?

  // Texto para mostrar el turno o la fecha
  let turnoText = '';
    if (isToday) {
        const now = new Date();
        turnoText = (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0))
        ? 'Turno de mañana' : 'Turno de tarde';
    } else {
        turnoText = `Pedidos del ${selectedDateStr}`;
    }


  // 3. --- Agrupación y Procesamiento de Pedidos ---
  // Este efecto se re-ejecuta cuando cambian los datos base O cuando cambia `currentTimeTick`
  useEffect(() => {
    // Guard Clauses: Esperar datos esenciales
    if (isLoadingCocina || isLoadingProductosStock) {
        console.log("[Pedidos Processing] Waiting for base data (cocina list and stock map)...");
        setIsLoadingPedidosAndProcessing(true);
        setProductsData([]); // Limpiar datos mientras se espera
        return;
    }
    if (cocinaProducts.length === 0 && !isLoadingCocina) { // Si ya terminó de cargar y no hay productos
        console.log("[Pedidos Processing] No base products defined in 'cocina'. Skipping processing.");
        setIsLoadingPedidosAndProcessing(false); // Termina la carga (no hay nada que procesar)
        setProductsData([]); // Asegurar que está vacío
        return;
    }

    // Indicar inicio de procesamiento
    setIsLoadingPedidosAndProcessing(true);
    const pedidosRef = collection(db, 'pedidos');
    console.log("[Pedidos Processing] Setting up listener / Re-running due to dependencies...");

    // Listener para la colección de pedidos
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      console.log(`[Pedidos Processing] Snapshot received (${querySnapshot.size} docs) or time tick triggered.`);
      const incomingPedidosMap = new Map(); // Para detectar 'nuevos' en esta ejecución
      const allPedidosRaw = [];
      querySnapshot.forEach((doc) => { allPedidosRaw.push({ id: doc.id, ...doc.data() }); });

      // Filtrar pedidos por fecha y turno (lógica original)
      const pedidosDelTurno = allPedidosRaw.filter((pedido) => {
        if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
        const parts = pedido.fechahora.split(' ');
        if (parts.length !== 2) return false;
        const [fechaPedido, horaPedido] = parts;
        // Validar formato DD/MM/YYYY HH:MM
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
        // Filtrar por fecha seleccionada
        if (fechaPedido !== selectedDateStr) return false;
        // Si es hoy, filtrar además por turno (mañana/tarde)
        if (isToday) {
            const { startTime, endTime } = getTurnoActual();
            const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm');
            if (!orderDateTime.isValid()) return false; // Ignorar si la fecha/hora del pedido es inválida
            // Comprobar si la hora del pedido está dentro del rango del turno actual
            return orderDateTime.toDate() >= startTime && orderDateTime.toDate() <= endTime;
        }
        // Si no es hoy, incluir todos los pedidos de esa fecha (no filtrar por turno)
        return true;
      });
      console.log(`[Pedidos Processing] ${pedidosDelTurno.length} orders found for the current date/shift.`);

       // Preparar estructura para agregar productos
       const validProductIds = new Set(cocinaProducts.map(product => product.id));
       const aggregatedProducts = {};
       // Usar el estado currentTimeTick para obtener la hora 'actual' para los cálculos
       const now = dayjs(currentTimeTick);
       console.log(`[Pedidos Processing] Calculating alerts/overdue with 'now' = ${now.format('YYYY-MM-DD HH:mm:ss')}`);

       // Inicializar estructura de agregación con stock de 'productos'
       cocinaProducts.forEach((product) => {
           // Obtener stock del mapa poblado desde la colección 'productos'
           const stockFromProductos = productosStockMap.get(product.id);
           // Usar 0 como fallback si no se encuentra o no es número válido
           const finalStock = (stockFromProductos !== undefined && typeof stockFromProductos === 'number')
                               ? stockFromProductos
                               : 0;

           aggregatedProducts[product.id] = {
               name: product.nombre || `Producto ${product.id}`, // Nombre de 'cocina'
               stock: finalStock, // Stock de 'productos'
               pedidos: 0, // Contador de cantidad total pedida
               orders: [], // Array para líneas de pedido individuales
               id: product.id, // ID del producto
            };
        });

      // === Bucle Principal de Procesamiento de Pedidos ===
      pedidosDelTurno.forEach((pedido) => {
        // Verificar que el pedido tiene productos y es un array
        if (pedido.productos && Array.isArray(pedido.productos)) {
          // Parsear la hora del pedido una vez
          const orderTimeDayjs = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm', true); // 'true' para parseo estricto

          // Procesar cada línea de producto dentro del pedido
          pedido.productos.forEach((prod, index) => {
            // Validar ID del producto y si está en la lista de 'cocina' activa
            if (prod.id === undefined || typeof prod.id !== 'number' || !validProductIds.has(prod.id)) {
                // console.warn(`Producto ID ${prod.id} en pedido ${pedido.id} inválido o no está en 'cocina'.`);
                return; // Saltar este producto
            }
            // Verificar que existe la entrada en aggregatedProducts (seguridad)
            if (!aggregatedProducts[prod.id]) {
                console.error(`[Pedidos Processing] Aggregated product structure missing for ID ${prod.id}, Order ${pedido.id}. Skipping product.`);
                return; // Saltar este producto
            }

            // Generar ID único para la línea de pedido (pedido + producto + índice/uniqueId)
            const orderLineId = `${pedido.id}-${prod.id}-${prod.uniqueId || index}`;
            // Determinar si es 'nuevo' comparando con el mapa de la ejecución anterior
            const isNew = !currentPedidosMap.has(orderLineId);
            // Añadir al mapa de la ejecución actual para la próxima comparación
            incomingPedidosMap.set(orderLineId, true);

            // --- Calcular Alerta de Cocción ---
            let needsCookingAlert = false;
            const nombreProdLower = prod.nombre ? prod.nombre.toLowerCase() : '';
            let alertTimeWindowMins = 0;
            // Definir tiempos de alerta por nombre de producto (ajustar según necesidad)
            if (nombreProdLower.includes('codillo') || nombreProdLower.includes('costilla')) alertTimeWindowMins = 30;
            else if (nombreProdLower.includes('chorizo') || nombreProdLower.includes('morcilla')) alertTimeWindowMins = 15;
            // Calcular solo si hay tiempo de alerta, la hora del pedido es válida y no está listo
            if (alertTimeWindowMins > 0 && orderTimeDayjs.isValid() && !prod.listo) {
                const alertStartTime = orderTimeDayjs.subtract(alertTimeWindowMins, 'minute');
                // Comprobar si 'now' (del tick) está entre el inicio de alerta y la hora del pedido (inclusivo)
                const isBetweenAlertWindow = now.isBetween(alertStartTime, orderTimeDayjs, null, '[]'); // '[]' incluye límites
                if (isBetweenAlertWindow) {
                    needsCookingAlert = true;
                }
            }
            // --- Fin Cálculo Alerta ---

            // --- Calcular Estado Retrasado ---
            // Un pedido está retrasado si la hora actual ('now' del tick) es posterior a la hora del pedido y no está listo
            const isOverdue = orderTimeDayjs.isValid() && now.isAfter(orderTimeDayjs) && !prod.listo;
            // --- Fin Cálculo Retrasado ---

            // Crear objeto con todos los datos de la línea de pedido para la tarjeta
             const orderData = {
               idPedido: pedido.id,
               idProducto: prod.id,
               orderLineId: orderLineId,
               producto: { ...prod }, // Guardar datos originales del producto del pedido
               hora: pedido.fechahora, // Hora del pedido completo
               nombre: pedido.cliente || 'Sin nombre', // Nombre del cliente
               cantidad: prod.cantidad || 1, // Cantidad del producto específico
               descripcion: prod.observaciones || "", // Observaciones/descripción
               isNew: isNew, // Flag si es nuevo en esta vista
               needsCookingAlert: needsCookingAlert, // Flag de alerta de cocción
               isOverdue: isOverdue, // Flag si está retrasado
             };

             // Añadir la línea procesada al array 'orders' del producto correspondiente
             aggregatedProducts[prod.id].orders.push(orderData);
             // Sumar la cantidad al total de 'pedidos' para ese producto
             aggregatedProducts[prod.id].pedidos += (prod.cantidad || 1);

          }); // Fin forEach producto en pedido
        } // Fin if pedido.productos
      }); // Fin forEach pedido en turno
      // === Fin Bucle Principal ===


       // Ordenar las líneas de pedido DENTRO de cada producto agregado
       Object.keys(aggregatedProducts).forEach(productId => {
           // Asegurarse de que el producto y su array 'orders' existen
           if (aggregatedProducts[productId] && Array.isArray(aggregatedProducts[productId].orders)) {
               aggregatedProducts[productId].orders.sort((a, b) => {
                    // Prioridad 1: Retrasado (isOverdue) va primero
                    if (a.isOverdue && !b.isOverdue) return -1;
                    if (!a.isOverdue && b.isOverdue) return 1;
                    // Prioridad 2: Alerta de Cocción (needsCookingAlert) va después de retrasado
                    if (a.needsCookingAlert && !b.needsCookingAlert) return -1;
                    if (!a.needsCookingAlert && b.needsCookingAlert) return 1;
                    // Prioridad 3: Ordenar por hora del pedido (timeA vs timeB)
                    const timeA = dayjs(a.hora, "DD/MM/YYYY HH:mm", true);
                    const timeB = dayjs(b.hora, "DD/MM/YYYY HH:mm", true);
                    // Manejar horas inválidas poniéndolas al final o al principio
                    if (timeA.isValid() && timeB.isValid()) return timeA.diff(timeB); // Orden cronológico
                    if (timeA.isValid() && !timeB.isValid()) return -1; // Válidas primero
                    if (!timeA.isValid() && timeB.isValid()) return 1; // Válidas primero
                    return 0; // Mantener orden relativo si ambas son inválidas o iguales
               });
           } else {
              console.warn(`Intento de ordenar 'orders' fallido para productId ${productId}. Objeto o propiedad 'orders' inválida.`, aggregatedProducts[productId]);
           }
       });

       // Crear el array final de datos para renderizar las ProductCards
       // Mapea sobre los productos base de 'cocina' para mantener el orden definido
       const finalProductsData = cocinaProducts
            .map(product => aggregatedProducts[product.id]) // Obtiene el objeto agregado correspondiente
            .filter(Boolean); // Elimina cualquier 'undefined' si algún producto de cocina no tuvo pedidos

       console.log("[Pedidos Processing] Final data for ProductCards:", finalProductsData.length, "items");
       // Actualizar el estado que usan las ProductCards
       setProductsData(finalProductsData);
       // Actualizar el mapa de pedidos vistos para la detección de 'nuevos' en la próxima ejecución
       setCurrentPedidosMap(incomingPedidosMap);
       // Indicar que el procesamiento ha terminado
       setIsLoadingPedidosAndProcessing(false);

    }, (error) => {
        // Manejo de errores del listener de pedidos
        console.error("Error fetching/processing pedidos:", error);
        setIsLoadingPedidosAndProcessing(false);
    });

    // Función de limpieza para el listener de pedidos
    return () => {
      console.log("[Pedidos Processing] Cleaning up listener.");
      unsubscribe();
    };
  // Dependencias del efecto: Se re-ejecuta si cambia la fecha, los productos base, el stock,
  // el turno (isToday), las funciones de cálculo de turno, los flags de carga iniciales, O el tick de tiempo.
  }, [selectedDateStr, cocinaProducts, productosStockMap, isToday, getTurnoActual, isLoadingCocina, isLoadingProductosStock, currentTimeTick]);
  // --- FIN useEffect Pedidos ---


  // --- Lógica para ensaladas/ensaladillas (TU CÓDIGO ORIGINAL RESTAURADO) ---
  const todayDocId = selectedDateStr.replace(/\//g, '-'); // Formato DD-MM-YYYY

  // useEffect 1: Suscripción / Creación doc ensaladas del día (Original)
  useEffect(() => {
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            // Guardar datos existentes en el estado
            setSaladsData([docSnapshot.data()]);
        } else {
            // Crear estructura inicial si el documento no existe
            const initialData = {
                name: `Ensaladas y Ensaladillas del ${selectedDateStr}`,
                ensaladas: { grandes: { preparadas: 0, pedidas: 0 }, pequenas: { preparadas: 0, pedidas: 0 } },
                ensaladillas: { grandes: { preparadas: 0, pedidas: 0 }, pequenas: { preparadas: 0, pedidas: 0 } },
            };
            // Crear el documento en Firestore y luego actualizar el estado local
            setDoc(saladsRef, initialData, { merge: true })
                .then(() => setSaladsData([initialData]))
                .catch(err => console.error("Error creating initial salad doc:", err));
        }
    }, (error) => console.error("Error fetching salads data:", error));
    // Limpieza del listener de ensaladas
    return () => unsubscribe();
   }, [todayDocId, selectedDateStr]); // Dependencias originales


   // useEffect 2: Actualización 'pedidas' ensaladas (Original - Recalcula desde pedidos)
   useEffect(() => {
      const pedidosRef = collection(db, 'pedidos');
      const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
          const allPedidosRaw = [];
          querySnapshot.forEach((doc) => allPedidosRaw.push({ id: doc.id, ...doc.data() }));

          // Re-filtrar pedidos (igual que en efecto principal)
          const pedidosDelTurnoOfiltered = allPedidosRaw.filter((pedido) => {
                if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
                const parts = pedido.fechahora.split(' ');
                if (parts.length !== 2) return false;
                const [fechaPedido, horaPedido] = parts;
                if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
                if (fechaPedido !== selectedDateStr) return false;
                if (isToday) {
                    const { startTime, endTime } = getTurnoActual();
                    const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm');
                    if (!orderDateTime.isValid()) return false;
                    return orderDateTime.toDate() >= startTime && orderDateTime.toDate() <= endTime;
                }
                return true;
           });

          // Recalcular contadores de ensaladas/ensaladillas pedidas (lógica original)
          let ensaladasPedidasGr = 0, ensaladasPedidasPeq = 0;
          let ensaladillasPedidasGr = 0, ensaladillasPedidasPeq = 0;

          pedidosDelTurnoOfiltered.forEach((pedido) => {
              if (pedido.productos && Array.isArray(pedido.productos)) {
                  pedido.productos.forEach((prod) => {
                      const cantidad = prod.cantidad || 1;
                      const sizeIdentifier = (prod.size || prod.nombre || '').toLowerCase();
                      const esPequena = sizeIdentifier.includes('peque');
                      // IDs hardcodeados (original)
                      if (prod.id === 12) { // Asume ID 12 = Ensalada
                          if (esPequena) ensaladasPedidasPeq += cantidad; else ensaladasPedidasGr += cantidad;
                      } else if (prod.id === 13) { // Asume ID 13 = Ensaladilla
                          if (esPequena) ensaladillasPedidasPeq += cantidad; else ensaladillasPedidasGr += cantidad;
                      }
                  });
              }
          });

          // Actualizar documento en Firestore SI los contadores calculados difieren de los almacenados
          const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
          getDoc(saladsRef).then((docSnapshot) => {
              if (docSnapshot.exists()) {
                  const currentData = docSnapshot.data();
                  // Acceder usando la estructura original ('grandes', 'pequenas')
                  const currentEnsGr = currentData.ensaladas?.grandes?.pedidas ?? 0;
                  const currentEnsPeq = currentData.ensaladas?.pequenas?.pedidas ?? 0;
                  const currentEnsadGr = currentData.ensaladillas?.grandes?.pedidas ?? 0;
                  const currentEnsadPeq = currentData.ensaladillas?.pequenas?.pedidas ?? 0;

                  // Comprobar si algún contador cambió
                  if (currentEnsGr !== ensaladasPedidasGr || currentEnsPeq !== ensaladasPedidasPeq ||
                      currentEnsadGr !== ensaladillasPedidasGr || currentEnsadPeq !== ensaladillasPedidasPeq)
                  {
                      console.log("[Salads Pedidas Calc Effect] Counts changed. Updating Firestore...");
                      // Actualizar solo los campos 'pedidas'
                      updateDoc(saladsRef, {
                          "ensaladas.grandes.pedidas": ensaladasPedidasGr,
                          "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
                          "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
                          "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
                      }).catch(err => console.error("Error updating salad pedidas:", err));
                  }
              }
          }).catch(err => console.error("Error reading current salad doc for update check:", err));

      }, (error) => console.error("Error fetching pedidos for salad count:", error));

      // Limpieza del listener de pedidos para este efecto
      return () => unsubscribe();
   }, [selectedDateStr, todayDocId, isToday, getTurnoActual]); // Dependencias originales


   // Función para actualizar 'preparadas' en Firestore (Original)
   const updateSaladCount = async (type, size, amount) => {
        // Determinar la clave correcta ('grandes' o 'pequenas')
        const sizeKey = size.toLowerCase().startsWith('grande') ? 'grandes' : 'pequenas';
        // La lógica original parece esperar el *nuevo valor total*, no un incremento.
        // Asegurarse que 'amount' es un número >= 0.
        const newAmount = Math.max(0, parseInt(amount, 10) || 0);
        const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
        // Path dinámico para el campo 'preparadas'
        const updatePath = `${type}.${sizeKey}.preparadas`;
        console.log(`[Update Salad Count] Updating ${updatePath} to ${newAmount}`);
        try {
            // Actualizar solo el campo 'preparadas' específico
            await updateDoc(saladsRef, { [updatePath]: newAmount });
        } catch (error) {
            console.error(`Error updating ${updatePath}:`, error);
        }
   };


  // --- Configuración de la Grilla de Productos (Original) ---
  // Determina cuántas columnas/filas usar basado en el número de productos a mostrar
  const productCountForGrid = Math.min(productsData.length, 9); // Máximo 9 tarjetas
  let gridClass = '';
  if (productCountForGrid <= 1) gridClass = 'grid-cols-1';
  else if (productCountForGrid === 2) gridClass = 'grid-cols-2';
  else if (productCountForGrid === 3) gridClass = 'grid-cols-3';
  else if (productCountForGrid === 4) gridClass = 'grid-cols-2 grid-rows-2'; // 2x2
  else if (productCountForGrid <= 6) gridClass = 'grid-cols-3 grid-rows-2'; // 3x2
  else gridClass = 'grid-cols-3 grid-rows-3'; // 3x3 para 7, 8 o 9

  // --- Estado General de Carga para el UI ---
  // Está cargando si alguna de las cargas iniciales o el procesamiento están activos
  const isLoading = isLoadingCocina || isLoadingProductosStock || isLoadingPedidosAndProcessing;


  // --- Renderizado JSX (Original, pero recibe datos actualizados) ---
  return (
    <div className="h-screen flex flex-col">
      {/* Cabecera */}
      <HeaderFinal title="Cocina" subtitle={turnoText}/>

      {/* Indicador de Carga General */}
      {isLoading && (
        <div className="text-center p-10 flex-grow">Cargando...</div>
      )}

      {/* Contenido Principal (Solo si no está cargando) */}
      {!isLoading && (
        <>
          {/* Grid de Productos Principales */}
          {productsData.length > 0 ? (
              <div className="p-6 flex-grow overflow-hidden mt-[2.5vh] ">
                  <div className={`grid gap-6 ${gridClass} h-full`}>
                  {productsData.slice(0, 9).map((product) => (
                      // Renderiza ProductCard con datos actualizados (stock, alertas...)
                      <ProductCard key={product.id} product={product} />
                  ))}
                  </div>
              </div>
          ) : (
            // Mensaje si no hay productos/pedidos después de cargar
             <div className="text-center p-10 text-gray-500 flex-grow">
                 No hay productos o pedidos para mostrar en este turno/fecha.
             </div>
          )}

          {/* Sección de Ensaladas */}
          {/* Comprobar si hay datos en saladsData */}
          {saladsData.length > 0 && (
              <div className="p-6 bg-white -mt-5"> {/* Clases originales */}
                  <div className="flex flex-wrap md:flex-nowrap"> {/* Clases originales + flex-wrap */}
                      {/* Renderizar Tarjeta de Ensaladas si existen datos */}
                      {saladsData[0].ensaladas && (
                          <div className="w-full md:w-1/2 p-2"> {/* Clases originales + responsive */}
                              {/* Pasa la estructura de datos original que incluye 'preparadas' */}
                              <SaladTypeCard
                                  type="ensaladas"
                                  data={saladsData[0].ensaladas} // Objeto con .grandes y .pequenas
                                  updateSaladCount={updateSaladCount} // Función para actualizar 'preparadas'
                              />
                          </div>
                      )}
                      {/* Renderizar Tarjeta de Ensaladillas si existen datos */}
                      {saladsData[0].ensaladillas && (
                          <div className="w-full md:w-1/2 p-2"> {/* Clases originales + responsive */}
                              {/* Pasa la estructura de datos original */}
                              <SaladTypeCard
                                  type="ensaladillas"
                                  data={saladsData[0].ensaladillas} // Objeto con .grandes y .pequenas
                                  updateSaladCount={updateSaladCount}
                              />
                          </div>
                       )}
                  </div>
              </div>
          )}
          {/* Opcional: Mensaje si no hay datos de ensaladas después de cargar */}
          {/* {!isLoading && saladsData.length === 0 && (<div className="text-center text-sm text-gray-400 pb-4">No hay datos de ensaladas para este día.</div>)} */}
        </>
      )}
    </div>
  );
};

export default Cocina;