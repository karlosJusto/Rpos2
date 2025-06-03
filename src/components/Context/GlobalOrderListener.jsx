import React, { useEffect, useRef } from 'react';
// --- 1. ASEGÚRATE DE IMPORTAR 'db' CORRECTAMENTE DESDE TU CONFIGURACIÓN ---
import { db } from '../firebase/firebase'; // <-- AJUSTA LA RUTA!!
import {
  collection,
  query,
  onSnapshot,
  doc, // Para referenciar documentos
  getDoc, // Para leer un documento específico
  updateDoc, // Para actualizar un documento
  runTransaction, // Importante para usar transacciones
  serverTimestamp, // Para marcar el tiempo de procesamiento
} from 'firebase/firestore';

// --- Helper Function: Convert HH:mm to minutes ---
// Devuelve minutos desde medianoche, o -1 si hay error/formato inválido
const convertTimeToMinutes = (timeStr) => {
    try {
        if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
            // console.warn("[Listener] Formato inválido (HH:MM requerido) en convertTimeToMinutes:", timeStr);
            return -1;
         }
        const parts = timeStr.split(":");
        if (parts.length !== 2) {
            // console.warn("[Listener] Formato inválido (partes != 2) en convertTimeToMinutes:", timeStr);
            return -1;
        }
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            // console.warn("[Listener] Valores inválidos (rango) en convertTimeToMinutes:", timeStr);
            return -1;
         }
        return hours * 60 + minutes;
    } catch (e) {
        console.error("[Listener] Error inesperado en convertTimeToMinutes:", timeStr, e);
        return -1;
     }
};


const GlobalOrderListener = () => {
  const isInitialLoad = useRef(true);

  useEffect(() => {
    console.log("GlobalOrderListener: Configurando listener de Firestore en 'pedidos'...");
    const q = query(collection(db, "pedidos"));

    // Listener para nuevos pedidos
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // Evita procesar todos los documentos existentes al iniciar
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        console.log("GlobalOrderListener: Carga inicial completada. Escuchando nuevos pedidos...");
        return;
      }

      // Procesa solo los documentos añadidos desde que el listener está activo
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newOrderData = change.doc.data();
          const orderId = change.doc.id;
          const timestamp = Date.now(); // Hora actual en milisegundos
          console.log(`%cGLOBAL[Listener ${timestamp}] ---> DETECTADO 'added' PARA DOC ID: ${orderId} (Token: ${newOrderData.orderCreationToken || 'N/A'})`, 'color: blue; font-weight: bold;');
          const callId = Math.random().toString(36).substring(7); // ID único para esta llamada

          // Modificado: No procesar pedidos con origen 0 (online) aquí, ya que se manejan desde la app.
          // Este listener podría procesar otros orígenes si fuera necesario en el futuro.
          if (newOrderData.origen !== 1) {
            console.log(`%c[Listener] ---> PEDIDO CON ORIGEN ${newOrderData.origen} [${orderId}] (Num: ${newOrderData.NumeroPedido || 'N/A'}) DETECTADO. Procesando...`, 'color: orange; font-weight: bold;');
            handleFirestoreUpdateLikeCartTotal(newOrderData, orderId, callId); // Pasar el callId
          } else {
            console.log(`%c[Listener] ---> PEDIDO CON ORIGEN ${newOrderData.origen} [${orderId}] (Num: ${newOrderData.NumeroPedido || 'N/A'}) DETECTADO. IGNORADO por este listener.`, 'color: gray;');
          }
        }
        // Ignorar cambios 'modified' o 'removed' para esta lógica
      });
    }, (error) => {
      console.error("GlobalOrderListener: Error en listener Firestore:", error);
      isInitialLoad.current = false; // Asegurar que se resetee en caso de error
    });

    // Función de limpieza al desmontar el componente
    return () => {
      console.log("GlobalOrderListener: Limpiando listener.");
      unsubscribe();
    };
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez al montar

  /**
   * Procesa un nuevo pedido online (origen 0) para actualizar los contadores
   * en los calendarios diarios correspondientes (pollo, codillo, costilla)
   * usando transacciones de Firestore para atomicidad.
   * Sobreescribe el array 'intervals' completo.
   */
  const handleFirestoreUpdateLikeCartTotal = async (order, orderId,callId) => {
    // El orderCreationToken es para trazabilidad. La lógica de "solo uno procesa"
    // se basa en la transacción sobre `webListenerProcessed`.
    // No hay una "coincidencia de instancia" directa entre CartTotal y un listener global específico
    // que pueda determinar quién procesa sin una transacción.
    const logPrefix = `[UpdateCal][${orderId}][Token:${order.orderCreationToken || 'N/A'}][Call ${callId}]`;
    console.log(`${logPrefix} Iniciando intento de procesamiento.`);

    const pedidoDocRef = doc(db, "pedidos", orderId);
    let canProceedWithProcessing = false;

    // --- 0. ATOMICALLY CHECK AND MARK AS PROCESSED ---
    // This transaction attempts to "claim" the order for processing.
    // Only one listener instance should succeed.
    try {
        await runTransaction(db, async (transaction) => {
            const transLogPrefixClaim = `${logPrefix} [ClaimTrans]`;
            console.log(`${transLogPrefixClaim} Attempting to get pedidoDocRef: ${pedidoDocRef.path}`);
            const pedidoSnap = await transaction.get(pedidoDocRef);

            if (!pedidoSnap.exists()) {
                // This is unlikely for an 'added' event that triggered this,
                // but good to handle. It means the doc was deleted very quickly.
                console.warn(`${transLogPrefixClaim} Pedido ${orderId} NOT FOUND during claim transaction. Aborting this attempt.`);
                throw new Error(`Pedido ${orderId} no encontrado.`);
            }

            const pedidoData = pedidoSnap.data();
            const currentFlagVal = pedidoData.webListenerProcessed;
            const processedAt = pedidoData.webListenerProcessedAt ? new Date(pedidoData.webListenerProcessedAt.seconds * 1000).toISOString() : "N/A";

            console.log(`${transLogPrefixClaim} Read from DB. OrderId: ${orderId}. Current webListenerProcessed: ${currentFlagVal} (type: ${typeof currentFlagVal}), ProcessedAt: ${processedAt}`);

            if (currentFlagVal === true) {
                console.log(`${transLogPrefixClaim} Flag is TRUE. Order already processed or being processed by another instance. This instance will NOT claim.`);
                // canProceedWithProcessing remains false
            } else {
                // This instance claims the order.
                console.log(`${transLogPrefixClaim} Flag is FALSE or UNDEFINED. This instance WILL ATTEMPT TO CLAIM order ${orderId}.`);
                transaction.update(pedidoDocRef, {
                    webListenerProcessed: true,
                    webListenerProcessedAt: serverTimestamp(), // Mark with server time
                });
                canProceedWithProcessing = true;
                console.log(`${transLogPrefixClaim} Order ${orderId} SUCCESSFULLY CLAIMED by this instance. Staged update: webListenerProcessed: true.`);
            }
        });
    } catch (error) {
        console.error(`${logPrefix} Error durante la transacción para reclamar el pedido ${orderId}. No se procesará por esta instancia. Error:`, error.message);
        return; // Important to exit if the claim fails
    }

    if (!canProceedWithProcessing) {
        console.log(`${logPrefix} Esta instancia no procesará el pedido ${orderId} (ya reclamado o error en reclamación). Finalizando.`);
        return; // Exit if this instance did not claim the order
    }

    console.log(`${logPrefix} Procesamiento principal iniciado para el pedido ${orderId} (reclamado).`);
    let canProcessCalendars = true; // Bandera para controlar si se procesan los calendarios
    try {
        // --- 1. Parsear Fecha y Hora del Pedido ---
        const fechahoraPedido = order.fechahora; // Formato esperado "DD/MM/YYYY HH:MM"
        if (!fechahoraPedido || typeof fechahoraPedido !== 'string' || !fechahoraPedido.includes(' ')) {
            console.error(`${logPrefix} ERROR: Fecha/hora del pedido inválida o ausente: ${fechahoraPedido}. No se procesarán calendarios.`);
            canProcessCalendars = false;
        }
        
        let calendarDocId = '';
        let orderTimeHHMM = '';
        let orderTimeMinutes = -1;

        if (canProcessCalendars) {
            const [datePart, timePart] = fechahoraPedido.split(' ');
            const [day, month, year] = datePart.split('/');

            if (!year || !month || !day || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
                console.error(`${logPrefix} ERROR: Formato de fecha inválido: ${datePart}. No se procesarán calendarios.`);
                canProcessCalendars = false;
            } else if (!timePart || !/^\d{2}:\d{2}$/.test(timePart)) {
                console.error(`${logPrefix} ERROR: Formato de hora inválido: ${timePart}. No se procesarán calendarios.`);
                canProcessCalendars = false;
            } else {
                calendarDocId = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                orderTimeHHMM = timePart;
                orderTimeMinutes = convertTimeToMinutes(orderTimeHHMM);
                if (orderTimeMinutes === -1) {
                    console.error(`${logPrefix} ERROR: No se pudo convertir la hora del pedido (${orderTimeHHMM}) a minutos. No se procesarán calendarios.`);
                    canProcessCalendars = false;
                } else {
                    console.log(`${logPrefix} Info Pedido: Calendario=${calendarDocId}, Hora=${orderTimeHHMM} (${orderTimeMinutes} min)`);
                }
            }
        }

        // --- 2. Validar Productos del Pedido ---
        if (canProcessCalendars && (!Array.isArray(order.productos) || order.productos.length === 0)) {
            console.warn(`${logPrefix} Advertencia: El pedido no contiene productos. No se procesarán calendarios.`);
            canProcessCalendars = false;
        }

        // --- 3. Procesar cada producto relevante en el pedido ---
        if (canProcessCalendars) {
            console.log(`${logPrefix} Procediendo a actualizar calendarios...`);
            for (const producto of order.productos) {
                let collectionName = null;
                let productKey = null; 
                const productNameLower = producto.nombre?.toLowerCase() ?? '';
                const productAliasLower = producto.alias?.toLowerCase() ?? '';
                const productId = producto.id; 
                const cantidadPedido = Number(producto.cantidad) || 0;

                if (productAliasLower === 'pollo' || productNameLower.includes('pollo') || productId === 1 || productId === 2 || productId === 39 || productId === 40) {
                    collectionName = 'chicken_calendar_daily';
                    productKey = 'Pollo';
                } else if (productAliasLower === 'codillo' || productNameLower.includes('codillo') || productId === 50) {
                    collectionName = 'codillo_calendar_daily';
                    productKey = 'Codillo';
                } else if (productAliasLower === 'costilla' || productNameLower.includes('costilla') || productId === 41 || productId === 48) {
                    collectionName = 'costilla_calendar_daily';
                    productKey = 'Costilla';
                }

                if (!collectionName || !productKey) {
                    continue;
                }

                let cantidadAIncrementar = 0;
                if (productKey === 'Pollo') {
                    if (productId === 39 || productId === 40 || productNameLower.includes('menú')) {
                        cantidadAIncrementar = 0.5 * cantidadPedido;
                    } else if (productId === 2 || (productNameLower.includes('pollo') && (productNameLower.includes('1/2') || productNameLower.includes('medio')))) {
                        cantidadAIncrementar = 0.5 * cantidadPedido;
                    } else if (productId === 1 || productNameLower.includes('pollo')) {
                        cantidadAIncrementar = 1 * cantidadPedido;
                    } else {
                        console.warn(`${logPrefix} Pollo identificado, pero no se pudo determinar tipo (ID: ${productId}, Nombre: ${producto.nombre}). Usando 0.`);
                    }
                } else if (productKey === 'Costilla') {
                    if (productId === 48 || (productNameLower.includes('costilla') && (productNameLower.includes('1/2') || productNameLower.includes('media')))) {
                        cantidadAIncrementar = 0.5 * cantidadPedido;
                    } else if (productId === 41 || productNameLower.includes('costilla')) {
                        cantidadAIncrementar = cantidadPedido;
                    } else {
                        console.warn(`${logPrefix} Costilla identificada, pero no se pudo determinar tipo (ID: ${productId}, Nombre: ${producto.nombre}). Usando ${cantidadPedido} por defecto.`);
                    }
                } else if (productKey === 'Codillo') {
                    cantidadAIncrementar = cantidadPedido;
                }

                if (isNaN(cantidadAIncrementar) || cantidadAIncrementar <= 0) {
                    console.warn(`${logPrefix} Cantidad inválida o cero para ${productKey} (${producto.nombre || producto.alias}). Saltando producto.`);
                    continue;
                }
                
                const calendarDocRef = doc(db, collectionName, calendarDocId);
                console.log(`${logPrefix} ---> Procesando ${productKey} (Cant: ${cantidadAIncrementar}). Transacción en ${calendarDocRef.path}`);

                try {
                    await runTransaction(db, async (transaction) => {
                        const transLogPrefix = `${logPrefix} [Trans]`;
                        console.log(`${transLogPrefix} Iniciando transacción para ${productKey}.`);
                        const calendarDocSnap = await transaction.get(calendarDocRef);

                        if (!calendarDocSnap.exists()) {
                            throw new Error(`Documento ${calendarDocRef.path} NO encontrado.`);
                        }
                        const calendarData = calendarDocSnap.data();
                        if (!Array.isArray(calendarData?.intervals)) {
                            throw new Error(`Campo 'intervals' NO es un array o falta en ${calendarDocRef.path}.`);
                        }

                        let intervalsCopy = JSON.parse(JSON.stringify(calendarData.intervals));
                        let intervalFound = false;
                        let foundIntervalIndex = -1;

                        console.log(`${transLogPrefix} Buscando intervalo para hora ${orderTimeHHMM} (${orderTimeMinutes} min) en ${intervalsCopy.length} intervalos...`);
                        for (let i = 0; i < intervalsCopy.length; i++) {
                            const interval = intervalsCopy[i];
                            if (interval.start === orderTimeHHMM) {
                                 console.log(`${transLogPrefix} ¡Intervalo ENCONTRADO por coincidencia exacta de hora en índice ${i}!`);
                                intervalFound = true;
                                foundIntervalIndex = i;
                                break;
                            }
                        }

                        if (!intervalFound) {
                             console.warn(`${transLogPrefix} Intervalo para la hora ${orderTimeHHMM} no encontrado para ${productKey} en ${calendarDocRef.path}. No se actualizará este producto.`);
                             return; // Salir de la transacción para este producto, pero no fallar toda la función.
                        }

                        const targetInterval = intervalsCopy[foundIntervalIndex];
                        const currentCount = Number(targetInterval.orderedCount) || 0;
                        const maxAllowed = Number(targetInterval.maxAllowed);
                        const intervalLabel = targetInterval.start;

                        if (isNaN(maxAllowed) || maxAllowed <= 0) {
                             console.warn(`${transLogPrefix} ADVERTENCIA: Límite (maxAllowed) inválido o no positivo (${maxAllowed}) para ${productKey} en ${intervalLabel}. Se actualizará igualmente.`);
                        }

                        const newCount = currentCount + cantidadAIncrementar;

                        if (maxAllowed > 0 && newCount > maxAllowed) {
                            console.warn(`${transLogPrefix} LÍMITE EXCEDIDO para ${productKey} en intervalo ${intervalLabel}. Pedido: ${cantidadAIncrementar}, Actual: ${currentCount}, Nuevo (sin aplicar): ${newCount}, Límite: ${maxAllowed}. No se actualizará el contador.`);
                        } else {
                            console.log(`${transLogPrefix} Actualizando ${productKey} en intervalo ${intervalLabel}: ${currentCount} -> ${newCount} (Max: ${maxAllowed > 0 ? maxAllowed : 'N/A'})`);
                            targetInterval.orderedCount = newCount;
                            transaction.update(calendarDocRef, { intervals: intervalsCopy });
                        }
                    }); 
                    console.log(`${logPrefix} <--- Transacción para ${productKey} completada (o límite detectado/intervalo no encontrado).`);
                } catch (error) {
                    console.error(`${logPrefix} ERROR durante la transacción para ${productKey}:`, error.message);
                }
            }
            console.log(`${logPrefix} Procesamiento de calendarios para productos (si los hubo) completado.`);
        } else {
            console.log(`${logPrefix} No se procesaron calendarios debido a validaciones previas fallidas o falta de productos.`);
        }

        // --- 5. Marcar el pedido como procesado ---
        // Esta acción ahora se realiza de forma atómica al inicio de la función, en la transacción de reclamación.
        console.log(`${logPrefix} Procesamiento general finalizado.`);

    } catch (generalError) {
        console.error(`${logPrefix} ERROR GENERAL durante el procesamiento del pedido:`, generalError);
    }
  }; // --- Fin de handleFirestoreUpdateLikeCartTotal ---

  // El componente en sí no renderiza nada, solo ejecuta el efecto del listener
  return null;
};

export default GlobalOrderListener;