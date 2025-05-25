import React, { useEffect, useState, useContext, useRef } from 'react';
import { db } from '../firebase/firebase'; // Ajusta la ruta si es necesario
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { dataContext } from '../Context/DataContext'; // Para el API_PRINT_URL si lo tienes ahí

// Podrías definir esta URL aquí o tomarla del contexto si es compartida
const API_PRINT_URL = 'http://192.168.1.26:3000/imprimir';

// Nombre de la colección en Firestore para registrar intentos de impresión
const PRINT_RECORDS_COLLECTION = 'registrosImpresionPedidosRpos2'; // Nombre específico para tu app

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

const ImprimirPedidoCompleto = ({ numeroPedido }) => {
  const [pedidoData, setPedidoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printInitiatedForThisOrderRef = useRef(false); // Ref para evitar doble impresión
  // const { API_PRINT_URL_CONTEXT } = useContext(dataContext); // Si usaras el contexto para la URL
  // const resolvedApiPrintUrl = API_PRINT_URL_CONTEXT || API_PRINT_URL;

  useEffect(() => {
    printInitiatedForThisOrderRef.current = false; // Resetea el cerrojo para un nuevo numeroPedido
    let unsubscribeFromPedido = () => {}; // Placeholder para la función de desuscripción

    const processPrintRequest = async () => {
      if (!numeroPedido) {
        setLoading(false);
        setError(null);
        setPedidoData(null);
        unsubscribeFromPedido(); // Limpiar suscripción si numeroPedido se vuelve nulo
        return;
      }

      setLoading(true);
      setError(null);
      setPedidoData(null); // Limpiar datos de un pedido anterior

      const alreadyAttempted = await checkIfPrintAttemptedInFirestore(numeroPedido);
      if (alreadyAttempted) {
        // console.log(`Pedido ${numeroPedido} ya tiene un intento de impresión registrado en Firestore. Omitiendo.`);
        setLoading(false);
        return;
      }

      const pedidoDocRef = doc(db, "pedidos", numeroPedido.toString());

      unsubscribeFromPedido = onSnapshot(pedidoDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const pedidoActual = { id: docSnap.id, ...docSnap.data() };
          
          if (pedidoActual.codigoQR) {
            // console.log(`Código QR encontrado para el pedido ${numeroPedido}: ${pedidoActual.codigoQR}`);
            
            unsubscribeFromPedido(); 
            
            // Cerrojo local: si ya hemos iniciado la impresión para este pedido en esta instancia, no continuar.
            if (printInitiatedForThisOrderRef.current) {
              // console.log(`Impresión para ${numeroPedido} ya iniciada por esta instancia. Omitiendo.`);
              setLoading(false); // Asegurarse de que el estado de carga se actualice
              return;
            }
            printInitiatedForThisOrderRef.current = true; // Marcar que hemos iniciado el proceso
            
            const stillNotAttempted = !(await checkIfPrintAttemptedInFirestore(numeroPedido));
            
            if (stillNotAttempted) {
              await markPrintAttemptedInFirestore(numeroPedido);
              setPedidoData(pedidoActual); 
              await handleImprimirPedido(pedidoActual);
            } else {
              // console.log(`Pedido ${numeroPedido} fue marcado como intentado mientras se esperaba el QR. Omitiendo impresión duplicada.`);
            }
            setLoading(false);
          } else {
            // console.log(`Esperando código QR para el pedido ${numeroPedido}... El listener sigue activo.`);
          }
        } else {
          setError(`No se encontró el pedido con número: ${numeroPedido} (listener).`);
          unsubscribeFromPedido(); 
          setLoading(false);
        }
      }, (errorListener) => {
        console.error("Error en el listener de Firestore para el pedido:", errorListener);
        setError("Error escuchando el pedido.");
        unsubscribeFromPedido(); 
        setLoading(false);
      });
    };

    if (numeroPedido) {
      processPrintRequest();
    } else {
      unsubscribeFromPedido(); 
      setLoading(false);
      setError(null);
      setPedidoData(null);
    }

    return () => {
      // console.log(`Limpiando listener para pedido ${numeroPedido}`);
      unsubscribeFromPedido();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPedido]); 

  const formatPedidoForPrint = (data) => {
    if (!data) return "Error: No hay datos del pedido para formatear.";

    let textoRecibo = `--- PEDIDO ${data.NumeroPedido} ---\n`;
    textoRecibo += `Cliente: ${data.cliente || 'N/A'}\n`;
    textoRecibo += `Telefono: ${data.telefono || 'N/A'}\n`;
    textoRecibo += `Hora Recogida: ${data.fechahora || 'N/A'}\n`; 
    if (data.observaciones) {
      textoRecibo += `Obs: ${data.observaciones}\n`;
    }
    textoRecibo += `------------------------\n`;
    textoRecibo += `PRODUCTOS:\n`;
    data.productos.forEach(p => {
      let precioFormateado = 'N/A';
      const cantidadProducto = p.cantidad !== undefined && p.cantidad !== null ? parseInt(p.cantidad, 10) : NaN;
      const precioTotalProducto = p.precio_total !== undefined && p.precio_total !== null ? parseFloat(p.precio_total) : NaN;
      const precioUnitario = p.precio !== undefined && p.precio !== null ? parseFloat(p.precio) : NaN;

      if (!isNaN(precioTotalProducto)) {
        precioFormateado = precioTotalProducto.toFixed(2);
      } else if (!isNaN(cantidadProducto) && !isNaN(precioUnitario)) {
        precioFormateado = (cantidadProducto * precioUnitario).toFixed(2);
      }
      let indicadores = '';
      if (p.celiaco) indicadores += '(CE) ';
      if (p.troceado) indicadores += '(TRO) ';
      if (p.tostado) indicadores += '(TOS) ';
      if (p.extrasalsa) indicadores += '(ES)';
      if (p.sinsalsa) indicadores += '(SS)';

      textoRecibo += `[${isNaN(cantidadProducto) ? 0 : cantidadProducto}x] - ${p.alias} ${indicadores.trim()} - ${precioFormateado}\n`;
    });
    textoRecibo += `------------------------\n`;
    const totalPedidoNumerico = parseFloat(data.total_pedido);
    textoRecibo += `TOTAL PEDIDO: ${!isNaN(totalPedidoNumerico) ? totalPedidoNumerico.toFixed(2) : 'N/A'}\n`;
    if (data.pagado) textoRecibo += `PAGADO\n`;
    textoRecibo += `------------------------\n`;
    //textoRecibo += `Eskerrik Asko\n`;
    return textoRecibo;
  };

  const handleImprimirPedido = async (dataToPrint) => {
    const textoFormateado = formatPedidoForPrint(dataToPrint);
    const payload = {
      texto: textoFormateado,
    };

    /*if (dataToPrint.codigoQR) {
      payload.qrUrl = dataToPrint.codigoQR;
    }*/
    
    try {
      const response = await fetch(API_PRINT_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseBodyText = await response.text();
      if (!response.ok) {
        console.error(`Error del servidor al imprimir pedido #${dataToPrint.NumeroPedido}: ${response.status}`, responseBodyText);
      } else {
        // console.log(`Pedido #${dataToPrint.NumeroPedido} enviado a imprimir. Servidor: ${responseBodyText}`);
      }
    } catch (networkError) {
      console.error(`Error de red al imprimir pedido #${dataToPrint.NumeroPedido}:`, networkError);
    }
  };

  return null; 
};

export default ImprimirPedidoCompleto;
