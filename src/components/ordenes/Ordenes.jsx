import dinero from '../../assets/dinero.png';
import singluten from '../../assets/singluten.png';
import fire_new from '../../assets/fire_new.png';
import tijera_new from '../../assets/tijera_new.png';

import GenerarQRCodeInvisible from './GenerarQRCodeInvisible';
import isEqual from 'lodash/isEqual'; // Import isEqual

import { useState, useContext, useEffect, useRef } from 'react';
import { dataContext } from '../Context/DataContext';
import { doc, updateDoc, getDoc, runTransaction, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Modal, Button, Form se mantienen si los modales del CUERPO de Órdenes los usan.
import { Button, Modal, Form } from 'react-bootstrap'; 

// Link se mantiene si hay links en el CUERPO de Órdenes que no eran del offcanvas.
// import { Link } from 'react-router-dom'; 

// PedidoRapido lo maneja TestHeader.
// import PedidoRapido from './PedidoRapido'; 
import ImprimirPedidoCompleto from './ImprimirPedidoCompleto';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';

import { useNavigate } from "react-router-dom";

// Importar el nuevo TestHeader
import TestHeader from './TestHeader'; // Ajusta la ruta si es necesario

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.locale('es');


const Ordenes = () => {
  // Estados y contexto originales de Ordenes.jsx que se mantienen
  const {
    // pedidosConOrigenUno, // TestHeader podría mostrar esto si se pasa como prop o calcula internamente
    setOrderBeingEdited,
    // libres, // TestHeader muestra su propio cálculo
    pedidos: pedidosFromContext, // Renamed to avoid confusion with local state
    dateToPass, // Del DataContext, usado por la barra de búsqueda de Órdenes
    setDateToPass, // Del DataContext
    // numeroBarra, // TestHeader usa su propia base
    // setNumeroBarra, 
    totalProductosDespuesDeLas18, // Usado por la barra de búsqueda de Órdenes
    totalbloquesAntesdelas18, // Usado por la barra de búsqueda de Órdenes
    setCart 
  } = useContext(dataContext);

  const [displayPedidos, setDisplayPedidos] = useState(pedidosFromContext || []);

  // Estados para el nuevo modal de detalle de pollos
  const [showDetallePollosModal, setShowDetallePollosModal] = useState(false);
  const [detallePollosData, setDetallePollosData] = useState(null);
  const [bloqueHorarioSeleccionadoParaDetalle, setBloqueHorarioSeleccionadoParaDetalle] = useState('');

   // Funciones para el modal de detalle de pollos
  const handleOpenDetallePollosModal = (datosPollos, horaBloque) => {
    setDetallePollosData(datosPollos);
    setBloqueHorarioSeleccionadoParaDetalle(horaBloque);
    setShowDetallePollosModal(true);
  };

  const handleCloseDetallePollosModal = () => {
    setShowDetallePollosModal(false);
    setDetallePollosData(null);
  };

  useEffect(() => {
    // Keep local displayPedidos in sync with context, ensuring it's always an array
    setDisplayPedidos(pedidosFromContext || []);
  }, [pedidosFromContext]);


  const navigate = useNavigate();

  // Lógica y estados para los modales y funcionalidades del CUERPO de Ordenes.jsx
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const handleCloseTurnoModal = () => {
    setShowTurnoModal(false);
    window.location.reload(); 
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = dayjs().locale('es').tz('Europe/Madrid');
      const targetTime = currentTime.set('hour', 18).set('minute', 0).set('second', 0); 
      if (currentTime.isSame(targetTime, 'minute')) {
        setShowTurnoModal(true);
        clearInterval(interval);
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, []);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const handleCloseOptionsModal = () => setShowOptionsModal(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const handleShowOptionsModal = (pedido) => {
    setPedidoSeleccionado(pedido);
    setShowOptionsModal(true);
  };

  const handleCreateOrder = (pedido) => {
    const clientInfo = {
      cliente: pedido.cliente,
      telefono: pedido.telefono,
      img_perfil: pedido.img_perfil,
    };
    setCart([]); 
    setOrderBeingEdited(clientInfo); 
    navigate('/layout/comida');
  };

  const handleEditOrder = (pedido) => {
    setOrderBeingEdited(pedido); 
    navigate('/layout/comida');
  };

  const borrarOrden = async (numeroPedido) => {
    if (!pedidoSeleccionado || pedidoSeleccionado.NumeroPedido !== numeroPedido) {
        console.error("[Ordenes][borrarOrden] Error: No hay pedido seleccionado o no coincide.");
        handleCloseOptionsModal();
        return;
    }

    const numeroPedidoStr = numeroPedido.toString();
    const logPrefix = `[Ordenes][borrarOrden][${numeroPedidoStr}]`;
    const pedidoRef = doc(db, "pedidos", numeroPedidoStr);

    try {
        const pedidoSnap = await getDoc(pedidoRef);
        if (!pedidoSnap.exists()) {
            console.error(`${logPrefix} Pedido no encontrado en Firestore.`);
            handleCloseOptionsModal();
            return;
        }
        const pedidoData = pedidoSnap.data();
        const productosDelPedido = pedidoData.productos;
        const fechahoraPedido = pedidoData.fechahora;

        let dailyDocumentIdForSalads = null;
        let calendarDocIdYYYYMMDD = null;
        let orderTimeHHMM = null;

        if (fechahoraPedido && typeof fechahoraPedido === 'string' && fechahoraPedido.includes(' ')) {
            const [datePart, timePart] = fechahoraPedido.split(' ');
            const [day, month, year] = datePart.split('/');
            if (day && month && year && /^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month) && /^\d{4}$/.test(year)) {
                dailyDocumentIdForSalads = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
                calendarDocIdYYYYMMDD = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            if (timePart && /^\d{2}:\d{2}$/.test(timePart)) {
                orderTimeHHMM = timePart;
            }
        }

        if (productosDelPedido && productosDelPedido.length > 0) {
            for (const productoEnPedido of productosDelPedido) {
                const productoNombreOriginal = (productoEnPedido.nombre || productoEnPedido.alias || '');
                const productNameLower = productoNombreOriginal.toLowerCase();
                const productoCantidadEnPedido = Number(productoEnPedido.cantidad) || 0;
                let idProductoParaStockGlobal = productoEnPedido.id?.toString(); 
                let cantidadParaStockGlobal = productoCantidadEnPedido;
                // Modificar la lógica para incluir IDs 39 y 40 para restaurar stock al ID 1 (pollo entero)
                if ([2, 39, 40].includes(productoEnPedido.id)) {
                    idProductoParaStockGlobal = '1'; 
                    cantidadParaStockGlobal = 0.5 * productoCantidadEnPedido;
                }

                if (cantidadParaStockGlobal > 0 && idProductoParaStockGlobal) {
                    const productRef = doc(db, 'productos', idProductoParaStockGlobal);
                    try {
                        await updateDoc(productRef, { stock: increment(cantidadParaStockGlobal) });
                    } catch (e) {
                        console.warn(`${logPrefix} Producto con ID ${idProductoParaStockGlobal} no encontrado o error al restaurar stock en 'productos': `, e);
                    }
                }

                const esEnsalada = productNameLower.includes('ensaladilla') || productNameLower.includes('ensalada');
                if (esEnsalada && dailyDocumentIdForSalads && productoCantidadEnPedido > 0) {
                    const saladCollectionName = 'ensaladas';
                    const saladStockRef = doc(db, saladCollectionName, dailyDocumentIdForSalads);
                    let tipoEnsaladaBase = '';
                    let tamanoEnsalada = '';

                    if (productNameLower.includes('ensaladilla')) tipoEnsaladaBase = 'ensaladillas';
                    else if (productNameLower.includes('ensalada')) tipoEnsaladaBase = 'ensaladas';

                    if (productNameLower.includes('1/2') || productNameLower.includes('media')) tamanoEnsalada = 'pequenas';
                    else tamanoEnsalada = 'grandes';
                    
                    if (tipoEnsaladaBase && tamanoEnsalada) {
                        const fieldPathParaDecremento = `${tipoEnsaladaBase}.${tamanoEnsalada}.pedidas`;
                        try {
                            await updateDoc(saladStockRef, { [fieldPathParaDecremento]: increment(-productoCantidadEnPedido) });
                        } catch (e) {
                            console.warn(`${logPrefix} Error al decrementar 'pedidas' de ensaladas para ${dailyDocumentIdForSalads} (campo: ${fieldPathParaDecremento}):`, e);
                        }
                    }
                }
                
                let calendarCollectionName = null;
                let cantidadARestarDelCalendario = 0;
                const productoIdOriginal = productoEnPedido.id;

                if (productoIdOriginal === 1 || productoIdOriginal === 2 || productoIdOriginal === 39 || productoIdOriginal === 40 || productNameLower.includes('menú pollo')) {
                    calendarCollectionName = 'chicken_calendar_daily';
                    cantidadARestarDelCalendario = (productoIdOriginal === 1 || productNameLower.includes('menú pollo entero')) ? productoCantidadEnPedido : 0.5 * productoCantidadEnPedido;
                } else if (productoIdOriginal === 41 || productoIdOriginal === 48) {
                    calendarCollectionName = 'costilla_calendar_daily';
                    cantidadARestarDelCalendario = (productoIdOriginal === 41) ? productoCantidadEnPedido : 0.5 * productoCantidadEnPedido;
                } else if (productoIdOriginal === 20) { 
                    calendarCollectionName = 'codillo_calendar_daily';
                    cantidadARestarDelCalendario = productoCantidadEnPedido;
                }

                if (calendarCollectionName && calendarDocIdYYYYMMDD && orderTimeHHMM && cantidadARestarDelCalendario > 0) {
                    const calendarDocRef = doc(db, calendarCollectionName, calendarDocIdYYYYMMDD);
                    try {
                        await runTransaction(db, async (transaction) => {
                            const calendarDocSnap = await transaction.get(calendarDocRef);
                            if (!calendarDocSnap.exists() || !Array.isArray(calendarDocSnap.data()?.intervals)) {
                                console.warn(`${logPrefix} Documento de calendario ${calendarDocRef.path} o 'intervals' no encontrado/inválido.`);
                                return;
                            }
                            let intervalsCopy = JSON.parse(JSON.stringify(calendarDocSnap.data().intervals));
                            const intervalIndex = intervalsCopy.findIndex(interval => interval.start === orderTimeHHMM);
                            if (intervalIndex === -1) {
                                console.warn(`${logPrefix} Intervalo para ${orderTimeHHMM} no encontrado en ${calendarDocRef.path}.`);
                                return;
                            }
                            const currentCount = Number(intervalsCopy[intervalIndex].orderedCount) || 0;
                            intervalsCopy[intervalIndex].orderedCount = Math.max(0, currentCount - cantidadARestarDelCalendario);
                            transaction.update(calendarDocRef, { intervals: intervalsCopy });
                        });
                    } catch (e) {
                        console.error(`${logPrefix} Error en transacción de calendario ${calendarCollectionName}:`, e);
                    }
                }
            }
        }

        await deleteDoc(pedidoRef);
        handleCloseOptionsModal();
    } catch (error) {
        console.error(`${logPrefix} Error general al borrar pedido:`, error);
        handleCloseOptionsModal();
    }
  };

  const handleClickProductoEntregado = async (numeroPedido, productoClickeado, maxCantidad, indiceProductoEnPedido) => {
    // Optimistic update
    setDisplayPedidos(currentDisplayPedidos =>
      currentDisplayPedidos.map(p => {
        if (p.NumeroPedido !== numeroPedido) return p;

        let productFoundAndUpdated = false; // To ensure we only update the first match if items are ambiguous
        const updatedProductos = p.productos.map(prodInState => {
          if (productFoundAndUpdated) return prodInState;

          // Determine if prodInState is the productoClickeado
          let isMatch = false;
          if (productoClickeado.id_cart && prodInState.id_cart === productoClickeado.id_cart) {
            isMatch = true;
          } else if (productoClickeado.uniqueId && prodInState.uniqueId === productoClickeado.uniqueId &&
                     prodInState.id === productoClickeado.id && prodInState.alias === productoClickeado.alias) {
            isMatch = true;
          } else if (!productoClickeado.id_cart && !productoClickeado.uniqueId) { // Fallback to full attribute match
            if (
              prodInState.id === productoClickeado.id &&
              prodInState.alias === productoClickeado.alias &&
              isEqual(prodInState.opciones || {}, productoClickeado.opciones || {}) &&
              prodInState.tostado === productoClickeado.tostado &&
              prodInState.troceado === productoClickeado.troceado &&
              prodInState.sinsalsa === productoClickeado.sinsalsa &&
              prodInState.extrasalsa === productoClickeado.extrasalsa &&
              prodInState.celiaco === productoClickeado.celiaco
            ) {
              isMatch = true;
            }
          }

          if (isMatch) {
            productFoundAndUpdated = true;
            const entregadoActual = prodInState.entregado || 0;
            let nuevoEntregado = entregadoActual + 1;
            if (nuevoEntregado > maxCantidad) {
              nuevoEntregado = 0;
            }
            return { ...prodInState, entregado: nuevoEntregado };
          }
          return prodInState;
        });
        return { ...p, productos: updatedProductos };
      })
    );

    // Proceed with Firestore update
    const numeroPedidoStr = numeroPedido.toString();
    const pedidoRef = doc(db, 'pedidos', numeroPedidoStr);

    try {
      await runTransaction(db, async (transaction) => {
        const pedidoDocSnap = await transaction.get(pedidoRef);
        if (!pedidoDocSnap.exists()) {
          throw new Error("El documento del pedido no existe en Firestore!");
        }

        let productosFirestore = pedidoDocSnap.data().productos;
        if (!Array.isArray(productosFirestore)) {
            throw new Error("El campo 'productos' en Firestore no es un array o no existe.");
        }

        let targetIndexInFirestore = -1;

        // 1. Try to find by id_cart if productoClickeado.id_cart is present
        if (productoClickeado.id_cart) {
            targetIndexInFirestore = productosFirestore.findIndex(p => p.id_cart === productoClickeado.id_cart);
        }

        // 2. If not found by id_cart, and productoClickeado.uniqueId is present, try by uniqueId (with id and alias)
        if (targetIndexInFirestore === -1 && productoClickeado.uniqueId) {
            targetIndexInFirestore = productosFirestore.findIndex(p => 
                p.id === productoClickeado.id &&
                p.alias === productoClickeado.alias &&
                p.uniqueId === productoClickeado.uniqueId
            );
        }
        
        // 3. If still not found by a unique identifier, attempt the broader attribute match
        if (targetIndexInFirestore === -1) {
            targetIndexInFirestore = productosFirestore.findIndex(p =>
                p.id === productoClickeado.id &&
                p.alias === productoClickeado.alias && 
                isEqual(p.opciones || {}, productoClickeado.opciones || {}) && // Use isEqual for robust object comparison
                p.tostado === productoClickeado.tostado && 
                p.troceado === productoClickeado.troceado &&
                p.sinsalsa === productoClickeado.sinsalsa &&
                p.extrasalsa === productoClickeado.extrasalsa &&
                p.celiaco === productoClickeado.celiaco
            );
        }
        
        // 4. The existing fallback to indiceProductoEnPedido (use with caution)
        if (targetIndexInFirestore === -1) {
          console.warn(`Producto específico no encontrado por atributos en pedido ${numeroPedidoStr}. Intentando por índice local ${indiceProductoEnPedido}. Clickeado:`, productoClickeado);
          if (productosFirestore[indiceProductoEnPedido] && productosFirestore[indiceProductoEnPedido].id === productoClickeado.id && productosFirestore[indiceProductoEnPedido].alias === productoClickeado.alias ) {
            targetIndexInFirestore = indiceProductoEnPedido; 
            console.log("Producto encontrado por índice local como fallback.")
          } else {
              console.error('No se pudo encontrar el producto específico en Firestore por atributos ni por índice local confiable. Producto clickeado:', productoClickeado, 'Productos en Firestore:', productosFirestore);
              throw new Error('Producto no encontrado en Firestore para actualizar.');
          }
        }
        
        const productoAActualizar = productosFirestore[targetIndexInFirestore];
        const entregadoActual = productoAActualizar.entregado || 0;
        let nuevoEntregado = entregadoActual + 1;
        if (nuevoEntregado > maxCantidad) {
          nuevoEntregado = 0;
        }

        const productosActualizados = productosFirestore.map((p, idx) =>
          (idx === targetIndexInFirestore)
            ? { ...p, entregado: nuevoEntregado }
            : p
        );
        transaction.update(pedidoRef, { productos: productosActualizados });
      });
    } catch (error) {
      console.error(`Error al actualizar producto en pedido ${numeroPedidoStr} en Firestore:`, error);
      // Revert optimistic update on error by resetting to the context's state
      setDisplayPedidos(pedidosFromContext || []);
    }
  };

  const agruparPorBloques15Minutos = (pedidosParaAgrupar) => {
    const bloques = {};
    if (!pedidosParaAgrupar) return bloques;

    pedidosParaAgrupar.forEach((pedido) => {
      if (!pedido.fechahora || typeof pedido.fechahora !== 'string' || !pedido.fechahora.includes(' ')) return;
      const fechaHora = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid', true); 
      if(!fechaHora.isValid()) return;

      const hora = fechaHora.format('HH:mm');
      if (!bloques[hora]) {
        bloques[hora] = {
          pedidos: [],
          cantidadProductos: 0,
          productos: [], 
          cantidadProductosId1: 0, cantidadProductosId20: 0, cantidadProductosId2: 0,
          cantidadProductosId41: 0, cantidadProductosId48: 0,
          pollosAgrupados: {} // Para el desglose detallado de pollos
        };
      }
      bloques[hora].pedidos.push(pedido);
      if(pedido.productos && Array.isArray(pedido.productos)){
        pedido.productos.forEach((producto) => {
          const cantidadProducto = Number(producto.cantidad) || 0; 
          bloques[hora].cantidadProductos += cantidadProducto;
          const productoExistente = bloques[hora].productos.find(p => 
            p.nombre === producto.alias && 
            p.categoria === producto.categoria 
          );
          if (productoExistente) {
            productoExistente.cantidad += cantidadProducto;
            productoExistente.entregado += (Number(producto.entregado) || 0); 
          } else {
            bloques[hora].productos.push({
              nombre: producto.alias, 
              cantidad: cantidadProducto, 
              categoria: producto.categoria, 
              entregado: (Number(producto.entregado) || 0), 
              position: producto.position 
            });
          }
          if (producto.id === 1) bloques[hora].cantidadProductosId1 += cantidadProducto;
          if (producto.id === 2 || producto.id === 39 || producto.id === 40) bloques[hora].cantidadProductosId2 += cantidadProducto;
          if (producto.id === 20) bloques[hora].cantidadProductosId20 += cantidadProducto;
          if (producto.id === 41) bloques[hora].cantidadProductosId41 += cantidadProducto;
          if (producto.id === 48) bloques[hora].cantidadProductosId48 += cantidadProducto;

          // Lógica para el desglose detallado de pollos
          const esPolloEntero = producto.id === 1;
          const esMedioPolloEquivalente = producto.id === 2 || producto.id === 39 || producto.id === 40 || (producto.alias || producto.nombre || "").toLowerCase().includes("menú pollo");

          if (esPolloEntero || esMedioPolloEquivalente) {
            const tipoPollo = esPolloEntero ? "entero" : "medio";
            const tostadoKey = producto.tostado ? "t" : "f";
            const troceadoKey = producto.troceado ? "t" : "f";
            const sinsalsaKey = producto.sinsalsa ? "t" : "f";
            const extrasalsaKey = producto.extrasalsa ? "t" : "f";

            const clavePollo = `${tipoPollo}_${tostadoKey}_${troceadoKey}_${sinsalsaKey}_${extrasalsaKey}`;
            
            let nombreDisplayPollo = tipoPollo === "entero" ? "Pollo" : "1/2 Pollo"; // Abreviado para más espacio
            let detallesDisplay = [];
            if (producto.tostado) detallesDisplay.push("Tostado");
            if (producto.troceado) detallesDisplay.push("Troceado");
            if (producto.sinsalsa) detallesDisplay.push("S.S");
            if (producto.extrasalsa) detallesDisplay.push("E.S");
            
            if (detallesDisplay.length > 0) {
              nombreDisplayPollo += ` (${detallesDisplay.join(', ')})`;
            }

            if (!bloques[hora].pollosAgrupados[clavePollo]) {
              bloques[hora].pollosAgrupados[clavePollo] = {
                tipo: tipoPollo, // Guardar el tipo para ordenar
                nombre: nombreDisplayPollo,
                cantidad: 0,
                cantidadEntregada: 0, // Inicializar cantidad entregada
              };
            }
            // Para el display de "1/2 P.", contamos unidades de medio pollo.
            // Para "P.", contamos unidades de pollo entero.
            bloques[hora].pollosAgrupados[clavePollo].cantidad += cantidadProducto; // Sumar la cantidad del item directamente
            bloques[hora].pollosAgrupados[clavePollo].cantidadEntregada += (producto.entregado || 0); // Sumar la cantidad entregada del item directamente
          }
        });
      }
    });
    for (const hora in bloques) {
        bloques[hora].productos.sort((a, b) => {
            const categoriaPrioridad = { comida: 1, complementos: 2, bebidas: 3, postres: 4, extras: 5, default: 6 };
            const categoriaA = categoriaPrioridad[a.categoria] || categoriaPrioridad.default;
            const categoriaB = categoriaPrioridad[b.categoria] || categoriaPrioridad.default;
            if (categoriaA !== categoriaB) return categoriaA - categoriaB;
            return (a.position || 0) - (b.position || 0);
        });
    }
    return bloques;
  };

  const bloquesPedidos = agruparPorBloques15Minutos(displayPedidos || []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const [totalesProximos45Min, setTotalesProximos45Min] = useState({
    totalProductosId1: 0, totalProductosId2: 0, totalProductosId20: 0,
    totalProductosId41: 0, totalProductosId48: 0,
  });

  useEffect(() => {
    const horaActual = dayjs().locale('es').tz('Europe/Madrid');
    const horaFin = horaActual.add(45, 'minutes');
    const nuevosTotales = Object.keys(bloquesPedidos).reduce(
      (acc, bloqueHora) => {
        const horaBloqueDate = dayjs(bloqueHora, 'HH:mm', 'es', true).tz('Europe/Madrid', true); 
        if (horaBloqueDate.isValid() && horaBloqueDate.isBetween(horaActual, horaFin, null, '[)')) {
          const bloqueData = bloquesPedidos[bloqueHora];
          acc.totalProductosId1 += (bloqueData.cantidadProductosId1 || 0);
          acc.totalProductosId2 += (bloqueData.cantidadProductosId2 || 0); 
          acc.totalProductosId20 += (bloqueData.cantidadProductosId20 || 0);
          acc.totalProductosId41 += (bloqueData.cantidadProductosId41 || 0);
          acc.totalProductosId48 += (bloqueData.cantidadProductosId48 || 0); 
        }
        return acc;
      },
      { totalProductosId1: 0, totalProductosId2: 0, totalProductosId20: 0, totalProductosId41: 0, totalProductosId48: 0 }
    );
    if (!isEqual(nuevosTotales, totalesProximos45Min)) { // Usar isEqual para comparación profunda
      setTotalesProximos45Min(nuevosTotales);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloquesPedidos]); // Removido totalesProximos45Min para evitar bucles si la estructura interna de bloquesPedidos no cambia pero la referencia sí

  let bloquesFiltrados = bloquesPedidos;
  if (!dateToPass) { 
    const currentTime = dayjs().locale('es').tz('Europe/Madrid');
    const isBefore6PM = currentTime.hour() < 18;
    bloquesFiltrados = Object.fromEntries(
      Object.entries(bloquesPedidos).filter(([hora]) => {
        const horaBloqueDate = dayjs(hora, 'HH:mm', 'es', true).tz('Europe/Madrid', true); 
        if(!horaBloqueDate.isValid()) return false;
        return isBefore6PM ? horaBloqueDate.hour() < 18 : horaBloqueDate.hour() >= 18;
      })
    );
  }
  
  return (
    <>
      <TestHeader /> {/* <--- NUEVO HEADER INTEGRADO AQUÍ ---> */}

      {/* BARRA DE BÚSQUEDA Y FILTROS (Original de Ordenes.jsx) */}
      <div className="w-full bg-gray-700 p-1 fixed flex z-20 top-[12vh] h-[6vh] items-center">
        <div className="flex justify-start items-center">
          <div className="ms-3 p-1">
            <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"><path fillRule="evenodd" clipRule="evenodd" d="M15 10.5C15 12.9853 12.9853 15 10.5 15C8.01472 15 6 12.9853 6 10.5C6 8.01472 8.01472 6 10.5 6C12.9853 6 15 8.01472 15 10.5ZM14.1793 15.2399C13.1632 16.0297 11.8865 16.5 10.5 16.5C7.18629 16.5 4.5 13.8137 4.5 10.5C4.5 7.18629 7.18629 4.5 10.5 4.5C13.8137 4.5 16.5 7.18629 16.5 10.5C16.5 11.8865 16.0297 13.1632 15.2399 14.1792L20.0304 18.9697L18.9697 20.0303L14.1793 15.2399Z" fill="#e5e7e9"/></g></svg>
          </div>
          <div className="ms-1 w-30 h-6 bg-white rounded-md"> 
            <div className="relative w-full h-full"> 
              <input type="text" className="w-full h-full bg-transparent border-none outline-none px-2 text-center pl-8" placeholder="buscar..." value={searchTerm} onChange={handleSearchChange}/>
              {searchTerm && (
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2" onClick={() => setSearchTerm('')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center w-full items-center"> 
          <div className="text-white text-[1.5vh]">
            <div>
              {dateToPass && ( // Este dateToPass es del DataContext
                <span className="text-[#75adab] font-nunito font-bold -ms-[20vw] flex items-center justify-between"> 
                  MODO SUPERVISIÓN DE PEDIDOS ({dayjs(dateToPass).format("DD/MM/YYYY")}) {/* Mostrar fecha */}
                  <button 
                    onClick={() => { setDateToPass(null); }} 
                    className=" text-[#75adab] hover:text-yellow-700 font-bold text-lg leading-none -me-[40vw]" 
                    aria-label="Volver al día actual">&times;
                  </button>
                </span>
              )}
              <div className={`font-nunito text-xl flex space-x-1 -ms-[8vw] ${ dateToPass ? 'text-gray-700' : 'text-gray-400' }`}>
                {!dateToPass && ( // Mostrar solo si es hoy (dateToPass del context es null)
                  <>
                    <span>Prox 45 min</span><span>|</span><span className="font-nunito text-gray-400">Pollo:</span><span className="text-white font-nunito font-extrabold">{(totalesProximos45Min.totalProductosId1 + (totalesProximos45Min.totalProductosId2 * 0.5)).toFixed(1)}</span>
                    { totalesProximos45Min.totalProductosId20 > 0 && ( <><span>|</span><span className="text-gray-400 font-nunito">Codillo:</span><span className="text-white font-nunito font-extrabold">{totalesProximos45Min.totalProductosId20}</span></> )}
                    { (totalesProximos45Min.totalProductosId41 > 0 || totalesProximos45Min.totalProductosId48 > 0) && ( <><span>|</span><span className="text-gray-400 font-nunito">Costilla:</span><span className="text-white font-nunito font-extrabold">{(totalesProximos45Min.totalProductosId41 + (totalesProximos45Min.totalProductosId48 * 0.5)).toFixed(1)}</span></> )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL DE ÓRDENES (Scrollable) */}
      <div className="w-full bg-gray-100 flex flex-col justify-center items-center pt-[18vh] mb-2 pl-1 pr-1 z-10">
        {Object.keys(bloquesFiltrados).sort().map((bloqueHora) => (
          <div key={bloqueHora} className="w-full ">
            <div className="text-center bg-gray-500 text-md font-semibold mb-1 text-white font-nunito rounded-md ">

              {/* CONTENIDO Pollo detalle */}

              <div className="relative flex items-center px-4 h-[25px]">
                {/* Izquierda - Desglose de Pollos */}
                 <div className="z-10 mt-3 flex items-center px-2 ">
                  <button
                    onClick={() => handleOpenDetallePollosModal(bloquesFiltrados[bloqueHora].pollosAgrupados || {}, bloqueHora)}
                    className="p-1 rounded-md hover:bg-gray-600 transition-colors"
                    title="Ver detalle de pollos"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </button>
               </div>

                {/* Centro fijo */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <span className='text-xl font-extrabold'>{bloqueHora}</span>
                </div>

                {/* Derecha */}
                <div className="ml-auto flex items-center gap-1 z-10">
                  <p className="text-lg font-bold text-gray-300">
                    <span>Pedidos: </span>{bloquesFiltrados[bloqueHora]?.pedidos.length || 0} | Entregados:
                  </p>
                  <p className="text-lg font-bold text-gray-300">
                    {bloquesFiltrados[bloqueHora]?.pedidos.filter(p => p.productos.every(prod => prod.entregado === prod.cantidad && prod.cantidad > 0)).length || 0}
                  </p>
                </div>
              </div>

              {bloquesFiltrados[bloqueHora].productos.length > 0 && (
                <div className="p-1">
                  {bloquesFiltrados[bloqueHora].productos
                    .map((producto, index) => {
                      const categoriaColor = producto.categoria === "comida" ? "text-yellow-500" : producto.categoria === "complementos" ? "text-green-900" : producto.categoria === "bebidas" ? "text-red-700" : producto.categoria === "postres" ? "text-purple-700" : producto.categoria === "extras" ? "text-gray-900" : "text-gray-900";
                      if (producto.categoria === "comida" || producto.categoria === "complementos") {
                        return ( <span key={index} className={`mr-2 font-extrabold font-nunito text-lg ${categoriaColor}`}>{producto.nombre}: {producto.cantidad} ({producto.entregado})</span> );
                      }
                      return null;
                    })}
                </div>
              )}
            </div>
            {bloquesFiltrados[bloqueHora].pedidos.filter((pedido) => {
              const searchLower = searchTerm.toLowerCase();
              const numeroPedidoStr = String(pedido.NumeroPedido || "").toLowerCase();
              const clienteStr = String(pedido.cliente || "").toLowerCase();
              return clienteStr.includes(searchLower) || numeroPedidoStr.includes(searchLower);
            }).map((pedido) => {
              const todosCompletados = pedido.productos.every(producto => producto.entregado === producto.cantidad && producto.cantidad > 0);
              const containerColor = todosCompletados ? 'bg-[#52be80]' : 'bg-gray-200';
              return (
                <div key={pedido.id || pedido.NumeroPedido} className={`w-full flex ${containerColor} p-[0.30vh] mb-1 rounded-md shadow`}>
                  <div className="flex items-center">
                    <h3 className={`text-[0.75vw] font-semibold mr-1 sm:mr-4 text-center ${pedido.origen === 1 ? 'text-green-700' : pedido.origen === 0 ? 'text-gray-600' : 'text-gray-700'}`}>
                      {pedido.NumeroPedido}
                      <p className="pt-1 w-20 sm:w-24 text-[0.8vw] sm:text-[1vw] font-extrabold truncate">{pedido.cliente ? pedido.cliente : 'Generico'}</p>
                    </h3>
                    <div className="ms-[-0.5vw] me-1 sm:me-0">
                      <button className="p-1 rounded-md hover:bg-[#f2ac02] transition-all border border-gray-300" onClick={() => handleShowOptionsModal(pedido)}>
                        <svg fill="#808b96" width="25px" height="25px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,7a2,2,0,1,0-2-2A2,2,0,0,0,12,7Zm0,10a2,2,0,1,0,2,2A2,2,0,0,0,12,17Zm0-7a2,2,0,1,0,2,2A2,2,0,0,0,12,10Z"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="ml-1 sm:ml-2 gap-1 sm:gap-2 flex flex-wrap items-center flex-grow">
                    {pedido.productos
                     .filter(producto => producto.id !== 59)
                      .sort((a, b) => {
                        const categoriaPrioridad = { comida: 1, complementos: 2, bebidas: 3, postres: 4, extras: 5, default: 6 };
                        const categoriaA = categoriaPrioridad[a.categoria] || categoriaPrioridad.default;
                        const categoriaB = categoriaPrioridad[b.categoria] || categoriaPrioridad.default;
                        if (categoriaA !== categoriaB) return categoriaA - categoriaB;
                        return (a.position || 0) - (b.position || 0);
                      })
                      .map((producto, index) => {
                        let borderColor = 'border-gray-500';
                        let backgroundColor = 'bg-white';
                        const entregadoActual = producto.entregado || 0;
                        const cantidadTotal = producto.cantidad;
                        if (producto.categoria === 'comida') borderColor = 'border-yellow-500';
                        else if (producto.categoria === 'complementos') borderColor = 'border-green-700';
                        else if (producto.categoria === 'bebidas') borderColor = 'border-red-700';
                        else if (producto.categoria === 'postres') borderColor = 'border-purple-700';
                        if (entregadoActual === cantidadTotal && cantidadTotal > 0) backgroundColor = 'bg-[#52be80]';
                        
                        return (
                          <div
                            key={producto.id_cart || `${producto.id}-${index}-${producto.alias}`} 
                            className={`border-2 ${borderColor} ${backgroundColor} p-1 sm:p-2 rounded-md w-auto flex items-center text-xs sm:text-sm cursor-pointer my-1`}
                            onClick={() => handleClickProductoEntregado(pedido.NumeroPedido, producto, producto.cantidad, index)}>
                            {producto.alias}
                            <strong className="text-gray-500 ms-1"> [ </strong><strong>{entregadoActual}/{cantidadTotal}</strong><strong className="text-gray-500"> ] </strong>
                            {producto.celiaco && <img src={singluten} alt="Sin gluten" className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />}
                            {producto.tostado>0 && <img src={fire_new} alt="Tostado" className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />}
                            {producto.troceado && <img src={tijera_new} alt="Troceado" className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />}
                            {producto.sinsalsa && <p className="ms-1 sm:ms-2 text-xs sm:text-sm font-extrabold font-nunito">| S.S</p>}
                            {producto.extrasalsa && <p className="ms-1 sm:ms-2 text-xs sm:text-sm font-extrabold font-nunito">| E.S</p>}
                          </div>
                        );
                      })}
                      {todosCompletados && (
                        <>
                         <GenerarQRCodeInvisible numeroPedido={pedido.NumeroPedido} />
                          <ImprimirPedidoCompleto numeroPedido={pedido.NumeroPedido} />
                        </>
                      )}
                    {pedido.pagado && pedido.observaciones && (
                    <div className={`ml-1 sm:ml-2 p-1 sm:p-2 border-1 border-gray-700 ${todosCompletados ? 'bg-[#52be80]' : 'bg-gray-300'} rounded-md w-auto font-nunito flex justify-center items-center text-xs sm:text-sm`}>
                      <p className="flex items-center gap-1 sm:gap-3">
                        <img src={dinero} alt="pagado" className="w-4 sm:w-5" />
                        Ob: <span className="whitespace-nowrap">{pedido.observaciones}</span>
                      </p>
                    </div>
                  )}
                  {!pedido.pagado && pedido.observaciones && (
                    <div className={`ml-1 sm:ml-2 p-1 sm:p-2 border-1 border-gray-700 ${todosCompletados ? 'bg-[#52be80]' : 'bg-gray-300'} rounded-md w-auto font-nunito flex justify-center items-center text-xs sm:text-sm`}>
                      <p className="flex items-center gap-1 sm:gap-3">
                        Ob: <span className="whitespace-nowrap">{pedido.observaciones}</span>
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div> 
      
      {/* Modals del cuerpo de Órdenes (Options, Turno) se mantienen */}
      <Modal show={showOptionsModal} onHide={handleCloseOptionsModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center ">
         {pedidoSeleccionado && pedidoSeleccionado.origen === 1 && (
           <div className="p-3 text-center">
             <h1 className='text-red-600 font-extrabold font-nunito text-lg'>-PEDIDO APP NO EDITABLE-</h1>
             <p className='text-gray-400 font-nunito text-xs mt-1 -mb-2'>Puedes crear un nuevo pedido con los datos del cliente desde aquí.</p>
           </div>
         )}
          <div className="flex space-x-4 sm:space-x-6">
            <div className="p-2 sm:p-3 cursor-pointer hover:bg-yellow-500 rounded-md text-center" onClick={() => borrarOrden(pedidoSeleccionado?.NumeroPedido)}>
              <svg width="4vw" height="4vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M20.5001 6H3.5" stroke="#f10707 " strokeWidth="1.5" strokeLinecap="round"/> <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="#f10707 " strokeWidth="1.5"/> <path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5" stroke="#f10707 " strokeWidth="1.5" strokeLinecap="round"/> </g></svg>
              <p className='text-center p-1 font-nunito text-[#f10707]'>Borrar</p>
            </div>
              {pedidoSeleccionado && (
  <div
    className="p-2 sm:p-3 cursor-pointer hover:bg-yellow-500 rounded-md text-center"
    onClick={() => {
      if (pedidoSeleccionado.origen === 1) {
        handleCreateOrder(pedidoSeleccionado); // 
        handleCloseOptionsModal();
      } else {
        handleEditOrder(pedidoSeleccionado);
        handleCloseOptionsModal();
      }
    }}
  >
    {pedidoSeleccionado.origen === 1 ? (
      <>
        {/* Ícono Crear */}
        <svg  width="4vw" height="4vw" fill="none" viewBox="0 0 24 24" stroke="#808b96" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <p className="text-center p-1 font-nunito text-[#808b96]">Crear</p>
      </>
    ) : (
      <>
        {/* Ícono Editar */}
        <svg width="4vw" height="4vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 21.9948C6.58687 21.9658 4.70529 21.7764 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#808b96" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M2.5 7.25C2.08579 7.25 1.75 7.58579 1.75 8C1.75 8.41421 2.08579 8.75 2.5 8.75V7.25ZM22 7.25H2.5V8.75H22V7.25Z" fill="#808b96"/>
          <path d="M10.5 2.5L7 8" stroke="#808b96" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M17 2.5L13.5 8" stroke="#808b96" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18.562 13.9354L18.9791 13.5183C19.6702 12.8272 20.7906 12.8272 21.4817 13.5183C22.1728 14.2094 22.1728 15.3298 21.4817 16.0209L21.0646 16.438M18.562 13.9354C18.562 13.9354 18.6142 14.8217 19.3962 15.6038C20.1783 16.3858 21.0646 16.438 21.0646 16.438M18.562 13.9354L14.7275 17.77C14.4677 18.0297 14.3379 18.1595 14.2262 18.3027C14.0945 18.4716 13.9815 18.6544 13.8894 18.8478C13.8112 19.0117 13.7532 19.1859 13.637 19.5344L13.2651 20.65L13.1448 21.0109M21.0646 16.438L17.23 20.2725C16.9703 20.5323 16.8405 20.6621 16.6973 20.7738C16.5284 20.9055 16.3456 21.0185 16.1522 21.1106C15.9883 21.1888 15.8141 21.2468 15.4656 21.363L14.35 21.7349L13.9891 21.8552M13.9891 21.8552L13.6281 21.9755C13.4567 22.0327 13.2676 21.988 13.1398 21.8602C13.012 21.7324 12.9673 21.5433 13.0245 21.3719L13.1448 21.0109M13.9891 21.8552L13.1448 21.0109" stroke="#808b96" strokeWidth="1.5"/>
        </svg>
        <p className="text-center p-1 font-nunito text-[#808b96]">Editar</p>
      </>
    )}
  </div>
)}
            <div className="p-2 sm:p-3 cursor-pointer hover:bg-yellow-500 rounded-md text-center">
              <svg fill="#2ad12f " height="4vw" width="4vw" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 220.262 220.262" xmlSpace="preserve"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <g> <path d="M110.127,0C50.606,0,2.184,48.424,2.184,107.944c0,23.295,9.455,44.211,13.521,52.123 c1.893,3.685,6.416,5.135,10.099,3.243c3.684-1.893,5.136-6.415,3.243-10.099c-3.566-6.941-11.862-25.247-11.862-45.268 C17.184,56.695,58.878,15,110.127,15c51.254,0,92.951,41.695,92.951,92.944c0,51.251-41.697,92.946-92.951,92.946 c-20.044,0-35.971-6.94-41.889-9.925c-1.755-0.886-3.788-1.046-5.66-0.447l-47.242,15.097c-3.945,1.261-6.122,5.481-4.861,9.427 c1.018,3.187,3.968,5.219,7.142,5.219c0.757,0,1.526-0.115,2.285-0.358l44.391-14.186c9.287,4.311,25.633,10.173,45.834,10.173 c59.524,0,107.951-48.424,107.951-107.946C218.078,48.424,169.651,0,110.127,0z"/> <path d="M88.846,89.537c-3.285,2.523-3.902,7.231-1.38,10.517c2.523,3.285,7.23,3.903,10.517,1.38 c2.299-1.766,8.406-6.456,7.512-14.845c-0.551-4.987-5.417-11.83-9.402-16.691c-5.831-7.114-10.767-11.327-14.643-12.513 c-3.632-1.126-7.354-0.948-11.066,0.53c-7.636,3.052-13.025,8.108-15.585,14.622c-2.493,6.344-2.04,13.443,1.313,20.537 c7.827,16.522,18.288,30.791,31.093,42.413c0.05,0.047,0.101,0.093,0.152,0.139c12.987,11.48,28.352,20.325,45.675,26.293 c3.287,1.129,6.513,1.692,9.611,1.692c3.892,0,7.583-0.888,10.94-2.658c6.191-3.264,10.621-9.177,12.814-17.115 c1.056-3.848,0.82-7.564-0.689-11.024c-1.619-3.745-6.35-8.184-14.064-13.193c-5.269-3.422-12.601-7.5-17.64-7.5 c-0.003,0-0.007,0-0.011,0c-8.406,0.034-12.397,6.621-13.899,9.102c-2.146,3.543-1.014,8.155,2.529,10.301 c3.541,2.146,8.154,1.015,10.301-2.529c0.593-0.98,0.969-1.5,1.205-1.772c4.236,1.23,15.567,8.642,17.889,11.761 c0.038,0.166,0.043,0.417-0.082,0.874c-0.739,2.675-2.268,6.204-5.349,7.828c-2.879,1.516-6.312,0.863-8.677,0.051 c-15.413-5.31-29.053-13.142-40.543-23.279c-0.003-0.003-0.007-0.006-0.01-0.01c-11.377-10.308-20.693-23.023-27.688-37.788 c-1.071-2.268-2.1-5.607-0.91-8.634c1.274-3.242,4.613-5.15,7.183-6.177c0.441-0.176,0.69-0.203,0.871-0.179 c3.358,1.965,11.969,12.402,13.66,16.477C90.229,88.41,89.753,88.84,88.846,89.537z"/> </g> </g></svg>
              <p className='text-center p-1 -ms-2 font-nunito text-[#2ad12f]'>Mensaje</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className='border-t-0'>
          <Button variant="primary" className="shadow-md bg-white border-red-500 text-red-500 hover:bg-red-700 hover:border-red-700 hover:text-red-700 p-2 font-nunito" onClick={handleCloseOptionsModal}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
      
      <Modal show={showTurnoModal} onHide={handleCloseTurnoModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center ">
          <div><h1 className='font-nunito text-2xl font-[2vw] text-[#808b96]'>El Turno actual ha finalizado!</h1></div>
          <div className='p-2'>
            <svg fill="#808b96 " width="100px" height="100px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"/><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g></svg>
          </div>
        </Modal.Body>
        <Modal.Footer className='border-t-0'>
          <Button variant="primary" className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-2 font-nunito" onClick={handleCloseTurnoModal}>Aceptar</Button>
        </Modal.Footer>
      </Modal>

         {/* Modal para mostrar el detalle de pollos */}
      <Modal show={showDetallePollosModal} onHide={handleCloseDetallePollosModal} size="md" keyboard={false} centered>
       
        <Modal.Body className='bg-gray-100 font-nunito rounded-md'>

            <div className='flex justify-center items-center text-gray-700 font-extrabold font-nunito p-2 mb-2'>
              <h1 className='text-xl' > Detalle Pollos franja horaria- {bloqueHorarioSeleccionadoParaDetalle}</h1>
            </div>
            <div className="flex justify-center">
  {detallePollosData && Object.keys(detallePollosData).length > 0 ? (
    <ul className="list-none space-y-1 text-sm text-center">
      {Object.values(detallePollosData)
        .sort((a, b) => {
          if (a.tipo === 'entero' && b.tipo === 'medio') return -1;
          if (a.tipo === 'medio' && b.tipo === 'entero') return 1;
          return a.nombre.localeCompare(b.nombre);
        })
        .map((polloDetalle, idx) => {
          const entregadoCompleto = polloDetalle.cantidad === polloDetalle.cantidadEntregada;

          return (
            <li
              key={idx}
              className={`text-gray-700 text-lg ${entregadoCompleto ? 'line-through text-gray-400' : ''}`}
            >
              <strong className="text-green-400">{polloDetalle.cantidad}</strong> x {polloDetalle.nombre}{' '}
              (
              <strong className={entregadoCompleto ? 'text-green-500' : 'text-gray-900'}>
                {polloDetalle.cantidadEntregada}
              </strong>
              )
            </li>
          );
        })}
    </ul>
  ) : (
    <p className="text-center text-gray-500">No hay pollos para mostrar en este bloque.</p>
  )}
</div>


        </Modal.Body>
        <Modal.Footer className='bg-gray-100 border-t-0'>
          <Button 
            variant="primary" 
            onClick={handleCloseDetallePollosModal}
            className="bg-white border-gray-500 text-gray-500 hover:border-yellow-900 hover:text-gray-900 font-nunito"
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* El Modal de Sumar en Barra y el Offcanvas de menú ya no son necesarios aquí, TestHeader los manejaría si tuviera esa funcionalidad */}
      {/* Si PedidoRapido se usa fuera del TestHeader, se mantiene. Si no, se elimina. TestHeader tiene su propio PedidoRapido. */}
      {/* <PedidoRapido ref={pedidoRapidoRef} datosCliente={datosCliente} /> */} 
    </>
  );
};

export default Ordenes;
