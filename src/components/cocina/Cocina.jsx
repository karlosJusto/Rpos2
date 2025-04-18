// --- Cocina.jsx (Completo, sin omisiones, con corrección de bucle) ---
import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import HeaderFinal from './components/HeaderFinal';
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
import isEqual from 'lodash/isEqual'; // Import lodash.isEqual for deep comparison (optional)

// Extend dayjs plugins
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// --- Helper Function ---
const formatDate = (date) => {
  // Ensure input is a valid Date object before formatting
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      // Try parsing with dayjs if it's not a valid Date
      const d = dayjs(date);
      return d.isValid() ? d.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'); // Fallback to today
  }
  return dayjs(date).format('DD/MM/YYYY');
};

const SALADS_COLLECTION_NAME = 'ensaladas';

// --- Component ---
const Cocina = () => {
  // --- States ---
  const [cocinaProducts, setCocinaProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today
  const [currentPedidosMap, setCurrentPedidosMap] = useState(new Map());
  const [productosStockMap, setProductosStockMap] = useState(new Map());
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [isLoadingCocina, setIsLoadingCocina] = useState(true);
  const [isLoadingProductosStock, setIsLoadingProductosStock] = useState(true);
  const [isLoadingPedidosAndProcessing, setIsLoadingPedidosAndProcessing] = useState(true);

  // *** NUEVO ESTADO para guardar los pedidos filtrados ***
  const [pedidosDelTurnoState, setPedidosDelTurnoState] = useState([]);

  // *** Obtener numeroBarra y setMostrarBarra del contexto ***
  const { libres, mostrarBarra, numeroBarra, setMostrarBarra } = useContext(dataContext);

  // --- Effect for Periodic Tick ---
  useEffect(() => {
    const timerId = setInterval(() => {
      // console.log("[Time Tick Update] Forcing recalculation of alerts/overdue status...");
      setCurrentTimeTick(Date.now());
    }, 3000); // 3 seconds
    // Cleanup interval on component unmount
    return () => clearInterval(timerId);
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- Effect for fetching cocina products ---
  useEffect(() => {
    setIsLoadingCocina(true); // Set loading state
    const cocinaRef = collection(db, 'cocina'); // Reference to the 'cocina' collection
    // Subscribe to snapshot changes in the collection
    const unsubscribeCocina = onSnapshot(cocinaRef, (querySnapshot) => {
      const productos = []; // Array to hold fetched products
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10); // Parse document ID to integer
        if (!isNaN(id)) { // Check if ID is a valid number
          const { stock, ...restOfData } = doc.data(); // Exclude stock field if present
          productos.push({ id: id, ...restOfData }); // Add product data with ID
        } else {
          // Log a warning if the document ID is not numeric
          console.warn(`[Cocina Fetch] ID no numérico omitido en 'cocina': ${doc.id}`);
        }
      });
      // Sort products based on 'orden' field, fallback to 'id'
      productos.sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      console.log("[Cocina Fetch] Setting cocinaProducts state:", productos);
      setCocinaProducts(productos); // Update state with fetched products
      setIsLoadingCocina(false); // Set loading state to false
    }, (error) => {
      // Handle errors during fetch
      console.error("Error fetching cocina products:", error);
      setIsLoadingCocina(false); // Ensure loading state is reset on error
    });
    // Cleanup function: Unsubscribe from the listener when the component unmounts or dependencies change
    return () => unsubscribeCocina();
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- Effect for fetching productos stock ---
  useEffect(() => {
    setIsLoadingProductosStock(true); // Set loading state
    const productosRef = collection(db, 'productos'); // Reference to the 'productos' collection
    console.log("Setting up listener for 'productos' stock...");
    // Subscribe to snapshot changes in the collection
    const unsubscribeProductos = onSnapshot(productosRef, (querySnapshot) => {
      console.log("'productos' snapshot received:", querySnapshot.size, "docs for stock");
      const stockMap = new Map(); // Map to store product ID -> stock
      querySnapshot.forEach((doc) => {
        const id = parseInt(doc.id, 10); // Parse document ID
        const data = doc.data();
        // Check if ID is numeric and 'stock' field is a valid number
        if (!isNaN(id) && data.stock !== undefined && typeof data.stock === 'number') {
          stockMap.set(id, data.stock); // Add to map
        } else {
          // Log warning for invalid documents
          console.warn(`[Productos Stock] Doc ID ${doc.id} omitido. ID no numérico o 'stock' inválido/faltante. Stock: ${data.stock}`);
        }
      });
      console.log("[Productos Stock] Setting productosStockMap state:", stockMap);
      setProductosStockMap(stockMap); // Update state with the stock map
      setIsLoadingProductosStock(false); // Set loading state to false
    }, (error) => {
      // Handle errors during fetch
      console.error("Error fetching productos stock:", error);
      setIsLoadingProductosStock(false); // Ensure loading state is reset on error
    });
    // Cleanup function: Unsubscribe from the listener
    return () => unsubscribeProductos();
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- Date/Turno Variables & Handlers ---
  // Function to determine the current shift (morning/afternoon) start and end times
  const getTurnoActual = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startTime, endTime;
    // Turno Mañana: 00:01 hasta 18:00 inclusive
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
      startTime = new Date(today.getTime()); startTime.setHours(0, 1, 0, 0); // 00:01:00.000
      endTime = new Date(today.getTime()); endTime.setHours(18, 0, 0, 0);   // 18:00:00.000
    }
    // Turno Tarde: 18:00:00.001 hasta 23:59:59.999
    else {
      startTime = new Date(today.getTime()); startTime.setHours(18, 0, 0, 1);   // 18:00:00.001
      endTime = new Date(today.getTime()); endTime.setHours(23, 59, 59, 999); // 23:59:59.999
    }
    return { startTime, endTime };
  }, []); // useCallback ensures the function reference is stable unless dependencies change (none here)

  // Callback function passed to HeaderFinal to handle date selection from the modal
  const handleDateSelectionAccept = (newDateFromModal) => {
    // Convert the date from the modal (likely dayjs object or string) to a JS Date object
    const jsDate = dayjs(newDateFromModal).isValid() ? dayjs(newDateFromModal).toDate() : new Date(); // Fallback to current date if invalid
    setSelectedDate(jsDate); // Update the main selectedDate state
    console.log("[Cocina] Date accepted from modal:", jsDate);
  };

  // Derive formatted date string and today flag based on the selectedDate state
  const selectedDateStr = formatDate(selectedDate);
  const todayStr = formatDate(new Date());
  const isToday = selectedDateStr === todayStr;

  // Determine the text to display for the current shift or selected date
  let turnoText = '';
  if (isToday) {
    const now = new Date();
    turnoText = (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0))
      ? 'Turno de mañana' : 'Turno de tarde';
  } else {
    turnoText = `Pedidos del ${selectedDateStr}`; // Display selected date if not today
  }

  // --- EFFECT A: Listener de Pedidos y Agregación para UI ---
  // This effect fetches and filters orders based on date/shift and prepares data for ProductCards.
  useEffect(() => {
    // Wait for essential data (cocina products and stock) to load
    if (isLoadingCocina || isLoadingProductosStock) {
      console.log("[Effect A] Waiting for base data...");
      setIsLoadingPedidosAndProcessing(true); // Keep loading indicator active
      setProductsData([]); // Clear product card data
      setPedidosDelTurnoState([]); // Clear filtered orders state
      return; // Exit effect early
    }
    // If cocina products are loaded but the list is empty, stop processing
    if (cocinaProducts.length === 0 && !isLoadingCocina) {
      console.log("[Effect A] No base products defined. Skipping.");
      setIsLoadingPedidosAndProcessing(false); // Stop loading indicator
      setProductsData([]); // Ensure product card data is empty
      setPedidosDelTurnoState([]); // Ensure filtered orders state is empty
      return; // Exit effect early
    }

    setIsLoadingPedidosAndProcessing(true); // Set loading state for pedido processing
    const pedidosRef = collection(db, 'pedidos'); // Reference to 'pedidos' collection
    console.log("[Effect A] Setting up listener / Re-running due to Date, Products, Stock...");

    // Subscribe to snapshot changes in the 'pedidos' collection
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      console.log(`[Effect A] Snapshot received (${querySnapshot.size} docs). Filtering for date: ${selectedDateStr}`);
      const incomingPedidosMap = new Map(); // To track order lines in the current snapshot for 'isNew' flag
      const allPedidosRaw = []; // Array to hold all fetched orders
      querySnapshot.forEach((doc) => { allPedidosRaw.push({ id: doc.id, ...doc.data() }); });

      // Filter the raw orders based on the selected date and current shift (if today)
      const pedidosDelTurno = allPedidosRaw.filter((pedido) => {
        // Basic validation
        if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
        const parts = pedido.fechahora.split(' ');
        if (parts.length !== 2) return false;
        const [fechaPedido, horaPedido] = parts;
        // Format validation
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPedido) || !/^\d{2}:\d{2}$/.test(horaPedido)) return false;
        // Date filter
        if (fechaPedido !== selectedDateStr) return false;
        // Shift filter (only if viewing today)
        if (isToday) {
          const { startTime, endTime } = getTurnoActual();
          const orderDateTime = dayjs(`${fechaPedido} ${horaPedido}`, 'DD/MM/YYYY HH:mm', true); // Strict parsing
          if (!orderDateTime.isValid()) return false; // Skip invalid dates
          return orderDateTime.toDate() >= startTime && orderDateTime.toDate() <= endTime; // Compare Date objects
        }
        return true; // Include if not today (show all for the selected date)
      });
      console.log(`[Effect A] ${pedidosDelTurno.length} orders found for date ${selectedDateStr} / shift.`);

      // *** GUARDAR los pedidos filtrados en el estado local ***
      setPedidosDelTurnoState(pedidosDelTurno); // Update the state used by Effect B

      // --- Procesamiento de pedidos para ProductCard ---
      const validProductIds = new Set(cocinaProducts.map(product => product.id)); // Set for efficient ID lookup
      const aggregatedProducts = {}; // Object to aggregate data by product ID

      // Initialize the structure for all products defined in 'cocina'
      cocinaProducts.forEach((product) => {
        const stockFromProductos = productosStockMap.get(product.id); // Get stock from the map
        const finalStock = (stockFromProductos !== undefined && typeof stockFromProductos === 'number')
          ? stockFromProductos : 0; // Default stock to 0 if not found or invalid
        aggregatedProducts[product.id] = {
          name: product.nombre || `Producto ${product.id}`, // Product name or fallback
          stock: finalStock, // Calculated stock
          pedidos: 0, // Total quantity ordered (will be summed up)
          orders: [], // Array to hold individual order line details
          id: product.id, // Product ID
        };
      });

      // Process each filtered order to populate the aggregatedProducts structure
      pedidosDelTurno.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod, index) => {
            // Validate product ID
            if (prod.id === undefined || typeof prod.id !== 'number' || !validProductIds.has(prod.id)) {
              return; // Skip invalid or non-cocina products
            }
            // Ensure structure exists (should always exist)
            if (!aggregatedProducts[prod.id]) {
               console.error(`[Effect A] Aggregated structure missing for ID ${prod.id}, Order ${pedido.id}. Skipping.`);
               return;
            }
            // Create a unique ID for this order line
            const orderLineId = `${pedido.id}-${prod.id}-${prod.uniqueId || index}`;
            // Determine if this line is new compared to the previous snapshot
            const isNew = !currentPedidosMap.has(orderLineId);
            incomingPedidosMap.set(orderLineId, true); // Mark this line as present in the current snapshot

            // Create data object for the order line
            const orderData = {
              idPedido: pedido.id,
              idProducto: prod.id,
              orderLineId: orderLineId,
              producto: { ...prod }, // Copy product details from order
              hora: pedido.fechahora,
              nombre: pedido.cliente || 'Sin nombre',
              cantidad: prod.cantidad || 1,
              descripcion: prod.observaciones || "",
              isNew: isNew, // Flag for UI highlighting
              needsCookingAlert: false, // Initial state, calculated in Effect C
              isOverdue: false, // Initial state, calculated in Effect C
            };
            // Add order line to the product's list
            aggregatedProducts[prod.id].orders.push(orderData);
            // Add quantity to the product's total ordered count
            aggregatedProducts[prod.id].pedidos += (prod.cantidad || 1);
          });
        }
      });

      // Create the final array for ProductCards, maintaining the order from cocinaProducts
      const finalBaseData = cocinaProducts
        .map(product => aggregatedProducts[product.id]) // Map to aggregated data
        .filter(Boolean); // Remove any potential undefined entries

      console.log("[Effect A] Setting BASE productsData state:", finalBaseData.length, "items");
      setProductsData(finalBaseData); // Update state for ProductCards
      setCurrentPedidosMap(incomingPedidosMap); // Store the map of current order lines for next comparison
      setIsLoadingPedidosAndProcessing(false); // Mark processing as complete

    }, (error) => {
      // Handle errors during snapshot listening
      console.error("[Effect A] Error fetching/processing base pedidos:", error);
      setIsLoadingPedidosAndProcessing(false); // Reset loading state
      setPedidosDelTurnoState([]); // Clear filtered orders state on error
    });

    // Cleanup function: Unsubscribe from the listener when dependencies change or component unmounts
    return () => {
      console.log("[Effect A] Cleaning up listener.");
      unsubscribe();
    };
    // *** DEPENDENCIES: Effect re-runs if these change ***
  }, [
      selectedDateStr, // Changes when selectedDate changes
      cocinaProducts, // Changes when cocina products are fetched/updated
      productosStockMap, // Changes when stock levels are updated
      isToday, // Changes when selectedDate crosses midnight
      getTurnoActual, // Stable reference due to useCallback
      isLoadingCocina, // Changes when cocina product loading finishes
      isLoadingProductosStock // Changes when stock loading finishes
      // Removed: numeroBarra, setMostrarBarra
  ]);
  // --- FIN EFFECT A ---

  // --- EFFECT B: Cálculo de mostrarBarra ---
  // This effect calculates 'mostrarBarra' based on 'numeroBarra' and the filtered orders.
  useEffect(() => {
    console.log("[Effect B] Recalculando mostrarBarra debido a cambio en numeroBarra o pedidosDelTurnoState.");

    // Calculate 'pollosEntregados' using the filtered orders stored in local state
    const pollosEntregadosCalculados = pedidosDelTurnoState.reduce((totalEntregados, pedido) => {
      if (!pedido.productos || !Array.isArray(pedido.productos)) {
          return totalEntregados; // Skip if no products array
      }
      // Sum 'entregado' values for chicken products (ID 1 and 2)
      const entregadosEnPedido = pedido.productos.reduce((sumaEntregadosProducto, producto) => {
          const entregadoValor = producto.entregado || 0; // Default to 0 if undefined/null
          if (producto.id === 1) { // Pollo entero
              return sumaEntregadosProducto + entregadoValor;
          } else if (producto.id === 2) { // Medio pollo
              return sumaEntregadosProducto + (entregadoValor * 0.5);
          }
          return sumaEntregadosProducto; // Not chicken, don't add
      }, 0);
      return totalEntregados + entregadosEnPedido; // Add sum for this pedido to total
    }, 0); // Initial total is 0
    console.log(`[Effect B] Pollos Entregados Calculados: ${pollosEntregadosCalculados}`);

    // Update 'mostrarBarra' in the global context
    const currentNumeroBarra = numeroBarra || 0; // Ensure numeroBarra is treated as a number
    const nuevoMostrarBarra = currentNumeroBarra - pollosEntregadosCalculados;
    console.log(`[Effect B] Actualizando mostrarBarra: ${currentNumeroBarra} - ${pollosEntregadosCalculados} = ${nuevoMostrarBarra}`);
    setMostrarBarra(nuevoMostrarBarra); // Call context update function

  // *** DEPENDENCIES: Effect re-runs if numeroBarra or the filtered orders change ***
  }, [numeroBarra, pedidosDelTurnoState, setMostrarBarra]);
  // --- FIN EFFECT B ---


  // --- EFFECT C: Time-Dependent Flags & Sorting ---
  // This effect runs periodically (based on currentTimeTick) to update time-sensitive flags (alert, overdue) and re-sort orders.
  useEffect(() => {
    // Don't run if data is still loading or product data is empty
    if (isLoadingPedidosAndProcessing || !productsData || productsData.length === 0) { return; }

    const now = dayjs(currentTimeTick); // Get current time from the tick state
    let flagsOrOrderChanged = false; // Flag to check if any update is needed

    // Iterate over products to update their orders
    const updatedProductsData = productsData.map(product => {
        let productFlagsChanged = false; // Track changes within this product

        // Iterate over orders within the product
        const updatedOrders = product.orders.map(order => {
            const orderTimeDayjs = dayjs(order.hora, 'DD/MM/YYYY HH:mm', true); // Parse order time strictly

            // --- Recalculate needsCookingAlert ---
            let newNeedsCookingAlert = false;
            const nombreProdLower = order.producto?.nombre ? order.producto.nombre.toLowerCase() : '';
            let alertTimeWindowMins = 0;
            // Define alert windows based on product name
            if (nombreProdLower.includes('codillo') || nombreProdLower.includes('costilla')) alertTimeWindowMins = 30;
            else if (nombreProdLower.includes('chorizo') || nombreProdLower.includes('morcilla')) alertTimeWindowMins = 15;
            // Check if alert should be active
            if (alertTimeWindowMins > 0 && orderTimeDayjs.isValid() && !order.producto.listo) {
                const alertStartTime = orderTimeDayjs.subtract(alertTimeWindowMins, 'minute');
                if (now.isBetween(alertStartTime, orderTimeDayjs, null, '[]')) { // '[]' includes boundaries
                    newNeedsCookingAlert = true;
                }
            }

            // --- Recalculate isOverdue ---
            const newIsOverdue = orderTimeDayjs.isValid() && now.isAfter(orderTimeDayjs) && !order.producto.listo;

            // Check if flags changed for this specific order line
            if (newNeedsCookingAlert !== order.needsCookingAlert || newIsOverdue !== order.isOverdue) {
                productFlagsChanged = true; // Mark change within the product
            }

            // Return new order object with updated flags
            return { ...order, needsCookingAlert: newNeedsCookingAlert, isOverdue: newIsOverdue };
        });

        // --- Re-sort orders based on potentially updated flags ---
        const originalOrderIds = product.orders.map(o => o.orderLineId).join(','); // Store original order
        // Sort: Overdue > Needs Alert > Time
        updatedOrders.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.needsCookingAlert && !b.needsCookingAlert) return -1;
            if (!a.needsCookingAlert && b.needsCookingAlert) return 1;
            const timeA = dayjs(a.hora, "DD/MM/YYYY HH:mm", true);
            const timeB = dayjs(b.hora, "DD/MM/YYYY HH:mm", true);
            if (timeA.isValid() && timeB.isValid()) return timeA.diff(timeB); // Sort by time ascending
            if (timeA.isValid() && !timeB.isValid()) return -1; // Valid times first
            if (!timeA.isValid() && timeB.isValid()) return 1;
            return 0; // Keep order if times are same or both invalid
        });
        const newOrderIds = updatedOrders.map(o => o.orderLineId).join(','); // Get new order

        // Check if flags changed OR sort order changed
        if (productFlagsChanged || originalOrderIds !== newOrderIds) {
            flagsOrOrderChanged = true; // Mark global change needed
            return { ...product, orders: updatedOrders }; // Return new product object with updated orders
        } else {
            return product; // Return original product object if no changes
        }
    });

    // Update state only if flags or order actually changed
    if (flagsOrOrderChanged) {
        console.log("[Effect C] Flags or order changed, updating productsData state.");
        setProductsData(updatedProductsData); // Update state for ProductCards
    }
  // Dependencies: Run when time ticks, base product data changes, or loading state finishes
  }, [currentTimeTick, productsData, isLoadingPedidosAndProcessing]);
  // --- FIN EFFECT C ---


  // --- Salad Logic ---
  const todayDocId = selectedDateStr.replace(/\//g, '-'); // Create Firestore doc ID from date string

  // useEffect 1: Subscribe to/Create daily salad document
  useEffect(() => {
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId); // Reference to the specific daily doc
    // Subscribe to snapshot changes for the daily salad doc
    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        // If doc exists, update local state
        setSaladsData([docSnapshot.data()]);
      } else {
        // If doc doesn't exist, create it with initial structure
        const initialData = {
          name: `Ensaladas y Ensaladillas del ${selectedDateStr}`,
          ensaladas: { grandes: { preparadas: 0, pedidas: 0 }, pequenas: { preparadas: 0, pedidas: 0 } },
          ensaladillas: { grandes: { preparadas: 0, pedidas: 0 }, pequenas: { preparadas: 0, pedidas: 0 } },
        };
        // Create doc in Firestore, then update local state
        setDoc(saladsRef, initialData, { merge: true }) // merge:true avoids overwriting if created concurrently
          .then(() => setSaladsData([initialData]))
          .catch(err => console.error("Error creating initial salad doc:", err));
      }
    }, (error) => console.error("Error fetching salads data:", error));
    // Cleanup subscription when dependencies change or component unmounts
    return () => unsubscribe();
  }, [todayDocId, selectedDateStr]); // Re-run if the selected date changes

  // useEffect 2: Update 'pedidas' count for salads based on orders
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos'); // Reference to 'pedidos' collection
    // Subscribe to all pedidos (filtering happens locally)
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const allPedidosRaw = [];
      querySnapshot.forEach((doc) => allPedidosRaw.push({ id: doc.id, ...doc.data() }));

      // Filter orders based on selected date and shift (same logic as Effect A)
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

      // Calculate total ordered quantities for each salad type/size
      let ensaladasPedidasGr = 0, ensaladasPedidasPeq = 0;
      let ensaladillasPedidasGr = 0, ensaladillasPedidasPeq = 0;
      pedidosDelTurnoOfiltered.forEach((pedido) => {
         if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach((prod) => {
                const cantidad = prod.cantidad || 1;
                // Identify size (grande/pequena)
                const sizeIdentifier = (prod.size || prod.nombre || '').toLowerCase();
                const esPequena = sizeIdentifier.includes('peque');
                // Sum quantities based on product ID
                if (prod.id === 12) { // Ensalada
                    if (esPequena) ensaladasPedidasPeq += cantidad; else ensaladasPedidasGr += cantidad;
                } else if (prod.id === 13) { // Ensaladilla
                    if (esPequena) ensaladillasPedidasPeq += cantidad; else ensaladillasPedidasGr += cantidad;
                }
            });
         }
      });

      // Update Firestore only if calculated counts differ from current counts
      const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId);
      getDoc(saladsRef).then((docSnapshot) => { // Get current data once
        if (docSnapshot.exists()) {
          const currentData = docSnapshot.data();
          // Get current counts from Firestore, default to 0
          const currentEnsGr = currentData.ensaladas?.grandes?.pedidas ?? 0;
          const currentEnsPeq = currentData.ensaladas?.pequenas?.pedidas ?? 0;
          const currentEnsadGr = currentData.ensaladillas?.grandes?.pedidas ?? 0;
          const currentEnsadPeq = currentData.ensaladillas?.pequenas?.pedidas ?? 0;

          // Compare and update if different
          if (currentEnsGr !== ensaladasPedidasGr || currentEnsPeq !== ensaladasPedidasPeq ||
            currentEnsadGr !== ensaladillasPedidasGr || currentEnsadPeq !== ensaladillasPedidasPeq) {
            console.log("[Salads Pedidas Calc Effect] Counts changed. Updating Firestore...");
            updateDoc(saladsRef, { // Update specific fields
              "ensaladas.grandes.pedidas": ensaladasPedidasGr,
              "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
              "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
              "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
            }).catch(err => console.error("Error updating salad pedidas:", err));
          }
        }
      }).catch(err => console.error("Error reading current salad doc for update check:", err));

    }, (error) => console.error("Error fetching pedidos for salad count:", error));
    // Cleanup subscription
    return () => unsubscribe();
  // Dependencies: Re-run if date or shift logic changes
  }, [selectedDateStr, todayDocId, isToday, getTurnoActual]);

  // Function to update 'preparadas' count in Firestore (called by SaladTypeCard buttons)
  const updateSaladCount = async (type, size, amount) => {
    const sizeKey = size.toLowerCase().startsWith('grande') ? 'grandes' : 'pequenas'; // Determine key
    const newAmount = Math.max(0, parseInt(amount, 10) || 0); // Ensure non-negative integer
    const saladsRef = doc(db, SALADS_COLLECTION_NAME, todayDocId); // Doc reference
    const updatePath = `${type}.${sizeKey}.preparadas`; // Field path (e.g., "ensaladas.grandes.preparadas")
    console.log(`[Update Salad Count] Updating ${updatePath} to ${newAmount}`);
    try {
      await updateDoc(saladsRef, { [updatePath]: newAmount }); // Update Firestore
    } catch (error) {
      console.error(`Error updating ${updatePath}:`, error);
    }
  };
  // --- End Salad Logic ---


  // --- Grid Calculation ---
  // Determine Tailwind grid classes based on the number of products (max 9)
  const productCountForGrid = Math.min(productsData.length, 9);
  let gridClass = '';
  if (productCountForGrid <= 1) gridClass = 'grid-cols-1';
  else if (productCountForGrid === 2) gridClass = 'grid-cols-2';
  else if (productCountForGrid === 3) gridClass = 'grid-cols-3';
  else if (productCountForGrid === 4) gridClass = 'grid-cols-2 grid-rows-2';
  else if (productCountForGrid <= 6) gridClass = 'grid-cols-3 grid-rows-2';
  else gridClass = 'grid-cols-3 grid-rows-3';

  // --- Overall Loading State ---
  // Combine loading states for a single loading indicator
  const isLoading = isLoadingCocina || isLoadingProductosStock || isLoadingPedidosAndProcessing;

  // --- Render ---
  return (
    <div className="h-screen flex flex-col"> {/* Main container */}
      {/* Header Component */}
      <HeaderFinal
        title="Cocina"
        subtitle={turnoText}
        libres={libres} // Pass context value
        mostrarBarra={mostrarBarra} // Pass context value (updated by Effect B)
        onDateAccept={handleDateSelectionAccept} // Pass callback for date modal
        currentSelectedDate={selectedDate} // Pass current date for display/modal init
      />

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center p-10 flex-grow"> {/* Simple loading text */}
          Cargando...
        </div>
      )}

      {/* Content Area (Displayed when not loading) */}
      {!isLoading && (
        <>
          {/* Product Grid */}
          {productsData.length > 0 ? (
            // Display grid if there are products
            <div className="p-6 flex-grow overflow-hidden mt-[2.5vh] "> {/* Padding and margin */}
              <div className={`grid gap-6 ${gridClass} h-full`}> {/* Apply dynamic grid classes */}
                {/* Map over the first 9 products */}
                {productsData.slice(0, 9).map((product) => (
                  <ProductCard key={product.id} product={product} /> // Render ProductCard for each
                ))}
              </div>
            </div>
          ) : (
            // Display message if no products/orders
            <div className="text-center p-10 text-gray-500 flex-grow">
              No hay productos o pedidos para mostrar en este turno/fecha.
            </div>
          )}

          {/* Salad Section */}
          {saladsData.length > 0 && (
            // Display salad cards if data exists
            <div className="p-6 bg-white -mt-5"> {/* Styling for salad section */}
              <div className="flex flex-wrap md:flex-nowrap"> {/* Layout for salad cards */}
                {/* Ensaladas Card */}
                {saladsData[0].ensaladas && (
                  <div className="w-full md:w-1/2 p-2">
                    <SaladTypeCard
                      type="ensaladas"
                      data={saladsData[0].ensaladas}
                      updateSaladCount={updateSaladCount} // Pass update function
                    />
                  </div>
                )}
                {/* Ensaladillas Card */}
                {saladsData[0].ensaladillas && (
                  <div className="w-full md:w-1/2 p-2">
                    <SaladTypeCard
                      type="ensaladillas"
                      data={saladsData[0].ensaladillas}
                      updateSaladCount={updateSaladCount} // Pass update function
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div> // End main container
  );
};

export default Cocina;
