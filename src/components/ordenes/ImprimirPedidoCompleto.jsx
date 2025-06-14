import React, { useEffect, useState, useContext, useRef } from 'react';
import { db } from '../firebase/firebase'; // Ajusta la ruta si es necesario
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { dataContext } from '../Context/DataContext'; // Para el API_PRINT_URL si lo tienes ahí

// Nombre de la colección en Firestore para registrar intentos de impresión
const PRINT_RECORDS_COLLECTION = 'registrosImpresionPedidosRpos2'; // Nombre específico para tu app
const COLA_IMPRESION_COLLECTION = 'colaImpresionRpos2'; // Nueva colección para la cola de impresión

// Función para verificar si un pedido específico ya tiene un intento de impresión registrado en Firestore
const checkIfPrintAttemptedInFirestore = async (numeroPedido) => {
  if (!numeroPedido) return false;
  try {
    const pedidoIdStr = numeroPedido.toString();
    const printRecordRef = doc(db, PRINT_RECORDS_COLLECTION, pedidoIdStr);
    const printRecordSnap = await getDoc(printRecordRef);
    return printRecordSnap.exists();
  } catch (e) {
    console.error("Error al verificar el registro de impresión en Firestore:", e);
    return false; // En caso de error, asumimos que no se intentó para permitir el proceso
  }
};

// Función para marcar un pedido como intentado en Firestore
const markPrintAttemptedInFirestore = async (numeroPedido) => {
  if (!numeroPedido) return;
  try {
    const pedidoIdStr = numeroPedido.toString();
    const printRecordRef = doc(db, PRINT_RECORDS_COLLECTION, pedidoIdStr);
    await setDoc(printRecordRef, {
      numeroPedido: pedidoIdStr,
      intentadoEn: serverTimestamp(),
    });
    // console.log(`Pedido ${pedidoIdStr} marcado como intentado en Firestore.`);
  } catch (e) {
    console.error("Error al marcar el intento de impresión en Firestore:", e);
  }
};

// Función para formatear el pedido: ahora devuelve un objeto con cabecera, productos y pie
const formatPedidoForPrint = (data) => {
  if (!data) return null; // Devuelve null si no hay datos

  let cabecera = `--- PEDIDO ${data.NumeroPedido} ---\n`;
  cabecera += `Cliente: ${data.cliente || 'N/A'}\n`;
  cabecera += `Telefono: ${data.telefono || 'N/A'}\n`;
  cabecera += `Hora Recogida: ${data.fechahora || 'N/A'}\n`;
  if (data.observaciones) {
    cabecera += `Obs: ${data.observaciones}\n`;
  }
  cabecera += `------------------------\n`;
  // El servidor puede añadir el título "PRODUCTOS:" si es necesario antes de la tabla

  const productosArray = data.productos.map(p => {
    let precioFormateadoStr = 'N/A';
    const cantidadProducto = p.cantidad !== undefined && p.cantidad !== null ? parseInt(p.cantidad, 10) : NaN;
    const precioTotalProducto = p.precio_total !== undefined && p.precio_total !== null ? parseFloat(p.precio_total) : NaN;
    const precioUnitario = p.precio !== undefined && p.precio !== null ? parseFloat(p.precio) : NaN;

    if (!isNaN(precioTotalProducto)) {
      precioFormateadoStr = precioTotalProducto.toFixed(2);
    } else if (!isNaN(cantidadProducto) && !isNaN(precioUnitario)) {
      precioFormateadoStr = (cantidadProducto * precioUnitario).toFixed(2);
    }
    let indicadores = '';
    if (p.celiaco) indicadores += '(CE) ';
    if (p.troceado) indicadores += '(TRO) ';
    if (p.tostado) indicadores += '(TOS) ';
    if (p.extrasalsa) indicadores += '(ES) '; // Añadido espacio
    if (p.sinsalsa) indicadores += '(SS) ';  // Añadido espacio

    return {
      cantidad: `[${isNaN(cantidadProducto) ? 0 : cantidadProducto}x]`,
      // Asegurarse de que la descripción no sea demasiado larga para la columna de la tabla
      descripcion: `${p.alias} ${indicadores.trim()}`,
      precio: precioFormateadoStr
    };
  });

  let pie = `------------------------\n`;
  const totalPedidoNumerico = parseFloat(data.total_pedido);
  pie += `TOTAL PEDIDO: ${!isNaN(totalPedidoNumerico) ? totalPedidoNumerico.toFixed(2) : 'N/A'}\n`;
  if (data.pagado) pie += `PAGADO\n`;
  pie += `------------------------\n`;
  // pie += `Eskerrik Asko\n`; // Puedes añadir esto en el servidor si es fijo

  return { cabecera, productos: productosArray, pie };
};

// Nueva función para encolar el pedido en Firestore
const encolarPedidoParaImpresion = async (pedidoData) => {
  if (!pedidoData || !pedidoData.NumeroPedido) {
    console.error("Datos del pedido o NumeroPedido faltantes para encolar en Firestore.");
    return;
  }

  const partesDelTicket = formatPedidoForPrint(pedidoData);
  if (!partesDelTicket) {
    console.error("Error al formatear el pedido para la cola de impresión.");
    return;
  }

  const payloadParaCola = {
    numeroPedido: pedidoData.NumeroPedido.toString(),
    // En lugar de un solo textoTicket, enviamos las partes
    ticketCabecera: partesDelTicket.cabecera,
    ticketProductos: partesDelTicket.productos, // Array de objetos
    ticketPie: partesDelTicket.pie,
    imagenURL: pedidoData.codigoQR || null, // Usamos el campo que contiene la URL del QR de Firebase Storage
    estado: 'pendiente', // Estado inicial
    timestampSolicitud: serverTimestamp(),
  };

  try {
    const docRef = doc(db, COLA_IMPRESION_COLLECTION, payloadParaCola.numeroPedido);
    await setDoc(docRef, payloadParaCola);
    // console.log(`Pedido ${payloadParaCola.numeroPedido} encolado para impresión en Firestore con formato tabla.`);
  } catch (e) {
    console.error(`Error al encolar pedido ${payloadParaCola.numeroPedido} para impresión en Firestore:`, e);
  }
};

const ImprimirPedidoCompleto = ({ numeroPedido }) => {
  const [pedidoData, setPedidoData] = useState(null); // No es estrictamente necesario si solo encolamos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printInitiatedForThisOrderRef = useRef(false);

  useEffect(() => {
    printInitiatedForThisOrderRef.current = false;
    let unsubscribeFromPedido = () => {};

    const processPrintRequest = async () => {
      if (!numeroPedido) {
        setLoading(false);
        setError(null);
        // setPedidoData(null); // No es necesario si no se usa en el render
        if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido();
        return;
      }

      setLoading(true);
      setError(null);
      // setPedidoData(null); // Limpiar

      const alreadyAttempted = await checkIfPrintAttemptedInFirestore(numeroPedido);
      if (alreadyAttempted) {
        // console.log(`Pedido ${numeroPedido} ya tiene un intento de impresión registrado. Omitiendo.`);
        setLoading(false);
        return;
      }

      const pedidoDocRef = doc(db, "pedidos", numeroPedido.toString());

      unsubscribeFromPedido = onSnapshot(pedidoDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const pedidoActual = { id: docSnap.id, ...docSnap.data() };
          
          // Asumimos que 'codigoQR' es el campo en 'pedidos' que contiene la URL de la imagen del QR
          if (pedidoActual.codigoQR) { 
            if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido(); 
            
            if (printInitiatedForThisOrderRef.current) {
              setLoading(false);
              return;
            }
            printInitiatedForThisOrderRef.current = true;
            
            const stillNotAttempted = !(await checkIfPrintAttemptedInFirestore(numeroPedido));
            
            if (stillNotAttempted) {
              await markPrintAttemptedInFirestore(numeroPedido);
              // setPedidoData(pedidoActual); // No es necesario si solo se usa para encolar
              await encolarPedidoParaImpresion(pedidoActual); 
            }
            setLoading(false);
          } else {
            // console.log(`Esperando URL de imagen QR para el pedido ${numeroPedido}...`);
          }
        } else {
          setError(`No se encontró el pedido con número: ${numeroPedido}.`);
          if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido(); 
          setLoading(false);
        }
      }, (errorListener) => {
        console.error("Error en el listener de Firestore para el pedido:", errorListener);
        setError("Error escuchando el pedido.");
        if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido(); 
        setLoading(false);
      });
    };

    if (numeroPedido) {
      processPrintRequest();
    } else {
      if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido(); 
      setLoading(false);
      setError(null);
      // setPedidoData(null);
    }

    return () => {
      if (typeof unsubscribeFromPedido === 'function') unsubscribeFromPedido();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPedido]); 

  return null; 
};

export default ImprimirPedidoCompleto;
