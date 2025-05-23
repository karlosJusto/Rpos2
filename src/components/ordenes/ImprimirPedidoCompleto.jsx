import React, { useEffect, useState, useContext } from 'react';
import { db } from '../firebase/firebase'; // Ajusta la ruta si es necesario
import { collection, query, where, getDocs } from 'firebase/firestore';
import { dataContext } from '../Context/DataContext'; // Para el API_PRINT_URL si lo tienes ahí

// Podrías definir esta URL aquí o tomarla del contexto si es compartida
const API_PRINT_URL = 'http://localhost:3000/imprimir';

// Clave para almacenar en localStorage
const LOCAL_STORAGE_KEY = 'attemptedPrintsRpos2'; // Usar un nombre específico para tu app

// Función para obtener los pedidos intentados desde localStorage
const getAttemptedPrintsFromStorage = () => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (e) {
    console.error("Error al leer de localStorage:", e);
    return new Set(); // Retorna un Set vacío en caso de error
  }
};

// Función para guardar los pedidos intentados en localStorage
const saveAttemptedPrintsToStorage = (attemptedSet) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(attemptedSet)));
  } catch (e) {
    console.error("Error al escribir en localStorage:", e);
  }
};

const ImprimirPedidoCompleto = ({ numeroPedido }) => {
  const [pedidoData, setPedidoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const attemptedPrints = getAttemptedPrintsFromStorage();

    if (numeroPedido && !attemptedPrints.has(numeroPedido.toString())) { // Asegurarse de comparar strings
      const fetchPedidoDataAndPrint = async () => {
        setLoading(true);
        setError(null);
        setPedidoData(null);

        try {
          const pedidosRef = collection(db, 'pedidos');
          // Marcar como intentado ANTES de la operación asíncrona
          attemptedPrints.add(numeroPedido.toString());
          saveAttemptedPrintsToStorage(attemptedPrints);

          const q = query(pedidosRef, where("NumeroPedido", "==", Number(numeroPedido)));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            setError(`No se encontró el pedido con número: ${numeroPedido}`);
            setLoading(false);
            return;
          }

          let fetchedData = null;
          querySnapshot.forEach((doc) => {
            fetchedData = { id: doc.id, ...doc.data() };
          });
          
          setPedidoData(fetchedData);
          // Una vez que los datos se han obtenido, procedemos a imprimir
          if (fetchedData) {
            await handleImprimirPedido(fetchedData);
          }

        } catch (err) {
          console.error("Error buscando el pedido para imprimir:", err);
          setError("Error al buscar el pedido.");
          // Opcional: si falla, podríamos considerar quitarlo del Set en localStorage
          // para permitir un reintento en futuras cargas de la página.
          // Esto depende de si el error es temporal o persistente.
          // attemptedPrints.delete(numeroPedido.toString());
          // saveAttemptedPrintsToStorage(attemptedPrints);
        } finally {
          setLoading(false);
        }
      };

      fetchPedidoDataAndPrint();
    }
  }, [numeroPedido]); // La dependencia principal es numeroPedido.

  const formatPedidoForPrint = (data) => {
    if (!data) return "Error: No hay datos del pedido para formatear.";

    let textoRecibo = `--- PEDIDO ${data.NumeroPedido} ---\n`;
    textoRecibo += `Cliente: ${data.cliente || 'N/A'}\n`;
    textoRecibo += `Telefono: ${data.telefono || 'N/A'}\n`;
    textoRecibo += `Hora Recogida: ${data.fechahora || 'N/A'}\n`; // Asumo que 'fechahora' es la de recogida
    if (data.observaciones) {
      textoRecibo += `Obs: ${data.observaciones}\n`;
    }
    textoRecibo += `------------------------\n`;
    textoRecibo += `PRODUCTOS:\n`;
    data.productos.forEach(p => {
      let precioFormateado = 'N/A';
      const cantidadProducto = p.cantidad !== undefined && p.cantidad !== null ? parseInt(p.cantidad, 10) : NaN;

      // Intenta usar p.precio_total si existe y es numérico
      const precioTotalProducto = p.precio_total !== undefined && p.precio_total !== null ? parseFloat(p.precio_total) : NaN;
      // Si no, calcula cantidad * precio, asegurando que sean numéricos
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
    // Añadir la URL del código QR si existe
   
    textoRecibo += `Eskerrik Asko\n`;
    return textoRecibo;
  };

  const handleImprimirPedido = async (dataToPrint) => {
    const textoFormateado = formatPedidoForPrint(dataToPrint);
    console.log(`Imprimiendo pedido #${dataToPrint.NumeroPedido}:\n${textoFormateado}`);

     const payload = {
      texto: textoFormateado,
    };

    if (dataToPrint.codigoQR) {
      payload.qrUrl = dataToPrint.codigoQR;
    }
    console.log(dataToPrint.codigoQR);

    try {
      const response = await fetch(API_PRINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        //body: JSON.stringify({ texto: textoFormateado }),
          body: JSON.stringify(payload), // Enviamos el payload completo
      });

      const responseBodyText = await response.text();
      if (!response.ok) {
        console.error(`Error del servidor al imprimir pedido #${dataToPrint.NumeroPedido}: ${response.status}`, responseBodyText);
        // Considera mostrar un feedback al usuario si es necesario
      } else {
        console.log(`Pedido #${dataToPrint.NumeroPedido} enviado a imprimir. Servidor: ${responseBodyText}`);
      }
    } catch (networkError) {
      console.error(`Error de red al imprimir pedido #${dataToPrint.NumeroPedido}:`, networkError);
    }
  };

  // Este componente puede no renderizar nada visible, o un pequeño indicador si lo deseas.
  // if (loading) return <p>Preparando impresión...</p>;
  // if (error) return <p style={{ color: 'red' }}>Error impresión: {error}</p>;
  return null; // Opcional: no renderiza nada visible
};

export default ImprimirPedidoCompleto;