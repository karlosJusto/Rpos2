import React, { useEffect, useRef } from 'react';
// --- 1. ASEGÚRATE DE IMPORTAR 'db' CORRECTAMENTE DESDE TU CONFIGURACIÓN ---
import { db } from '../firebase/firebase'; // <-- AJUSTA LA RUTA!!
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc, // Usado dentro de la transacción (implícito en transaction.get)
  // updateDoc, // No se usa directamente, transaction.update hace el trabajo
  runTransaction, // Importante para usar transacciones
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
          console.log(`%GLOBAL[Listener ${timestamp}] ---> DETECTADO 'added' PARA DOC ID: ${orderId}`, 'color: blue; font-weight: bold;'); // Log específico
          const callId = Math.random().toString(36).substring(7); // ID único para esta llamada

          // Solo procesar pedidos con origen 0 (online) que necesitan actualizar calendario
          if (newOrderData.origen === 0) {
            console.log(`%c[Listener] ---> NUEVO PEDIDO ONLINE [${orderId}] (Num: ${newOrderData.NumeroPedido || 'N/A'}) DETECTADO. Procesando...`, 'color: green; font-weight: bold;');
            handleFirestoreUpdateLikeCartTotal(newOrderData, orderId, callId); // Pasar el callId
        } else {
            // Opcional: Loggear otros pedidos añadidos si es útil para depuración
            // console.log(`[Listener] Pedido añadido ID: ${orderId}, Origen: ${newOrderData.origen} (Ignorado para calendario)`);
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
    debugger
    const logPrefix = `[UpdateCal][${orderId}][Call ${callId}]`; // Usar callId en logs
    console.log(`${logPrefix} Iniciando procesamiento.`);

    try {
        // --- 1. Parsear Fecha y Hora del Pedido ---
        const fechahoraPedido = order.fechahora; // Formato esperado "DD/MM/YYYY HH:MM"
        if (!fechahoraPedido || typeof fechahoraPedido !== 'string' || !fechahoraPedido.includes(' ')) {
            console.error(`${logPrefix} ERROR: Fecha/hora del pedido inválida o ausente:`, fechahoraPedido);
            return;
        }
        const [datePart, timePart] = fechahoraPedido.split(' ');
        const [day, month, year] = datePart.split('/');

        // Validar partes de la fecha y hora
        if (!year || !month || !day || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
            console.error(`${logPrefix} ERROR: Formato de fecha inválido: ${datePart}`);
            return;
        }
        if (!timePart || !/^\d{2}:\d{2}$/.test(timePart)) {
            console.error(`${logPrefix} ERROR: Formato de hora inválido: ${timePart}`);
            return;
        }

        // Construir ID del documento del calendario (YYYY-MM-DD)
        const calendarDocId = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const orderTimeHHMM = timePart; // Hora del pedido "HH:MM"
        const orderTimeMinutes = convertTimeToMinutes(orderTimeHHMM); // Hora del pedido en minutos desde medianoche

        if (orderTimeMinutes === -1) {
             console.error(`${logPrefix} ERROR: No se pudo convertir la hora del pedido (${orderTimeHHMM}) a minutos.`);
             return;
        }

        console.log(`${logPrefix} Info Pedido: Calendario=${calendarDocId}, Hora=${orderTimeHHMM} (${orderTimeMinutes} min)`);

        // --- 2. Validar Productos del Pedido ---
        if (!Array.isArray(order.productos) || order.productos.length === 0) {
            console.warn(`${logPrefix} Advertencia: El pedido no contiene productos.`);
            return;
        }

        // --- 3. Procesar cada producto relevante en el pedido ---
        for (const producto of order.productos) {
            let collectionName = null;
            let productKey = null; // Para logging claro
            const productNameLower = producto.nombre?.toLowerCase() ?? '';
            const productAliasLower = producto.alias?.toLowerCase() ?? '';
            const productId = producto.id_product; // Asumiendo que existe id_product

            // Identificar producto relevante para calendario
            // Priorizar alias si existe, luego nombre o ID si es necesario
            if (productAliasLower === 'pollo' || productNameLower.includes('pollo asado') || productId === 1 || productId === 2 || productId === 39 || productId === 40 || productNameLower.includes('menú')) {
                collectionName = 'chicken_calendar_daily';
                productKey = 'Pollo';
            } else if (productAliasLower === 'codillo' || productNameLower.includes('codillo') || productId === 50) {
                collectionName = 'codillo_calendar_daily';
                productKey = 'Codillo';
            } else if (productAliasLower === 'costilla' || productNameLower.includes('costilla') || productId === 41 || productId === 48) {
                collectionName = 'costilla_calendar_daily';
                productKey = 'Costilla';
            }

            // Si el producto no afecta a ningún calendario, saltar al siguiente
            if (!collectionName || !productKey) {
                // console.log(`${logPrefix} Producto "${producto.nombre || producto.alias || 'Desconocido'}" ignorado (no afecta calendarios).`);
                continue;
            }

            // Calcular la cantidad a incrementar (lógica específica por producto)
            let cantidadAIncrementar = 0;
            const cantidadPedido = Number(producto.cantidad) || 0;

            if (productKey === 'Pollo') {
                // Revised logic for chicken products:
                // - Menus: 0.5 chicken value per menu item, multiplied by the number of menu items ordered.
                //   (e.g., if producto.cantidad is 3 for a menu, 0.5 * 3 = 1.5, matching observed behavior)
                // - "1/2 Pollo" (non-menu): Fixed 0.5 chicken value.
                // - "Pollo Entero" (non-menu, non-1/2): Fixed 1 chicken value.
                if (productNameLower.includes('menú')) {
                    // Handles items like "Menú Pollo", "Menú 1/2 Pollo", etc.
                    // Assumes each menu item contributes 0.5 to the chicken count,
                    // and cantidadPedido is the number of such menu items.
                    cantidadAIncrementar = 0.5 * cantidadPedido;
                } else if (productNameLower.includes('1/2')) {
                    // Handles "1/2 Pollo Asado", etc. (but not menus containing "1/2")
                    // This item type contributes a fixed 0.5 to the chicken count.
                    cantidadAIncrementar = 0.5;
                } else {
                    // Handles "Pollo Asado" (whole chicken), etc. (not menus, not 1/2)
                    // This item type contributes a fixed 1 to the chicken count.
                    cantidadAIncrementar = 1;
                }
            } else if (productKey === 'Costilla') {
                 // Lógica específica para costillas según ID
                if (productId === 41) { // Asumiendo ID 41 es ración completa
                    cantidadAIncrementar = cantidadPedido;
                } else if (productId === 48) { // Asumiendo ID 48 es media ración
                    cantidadAIncrementar = cantidadPedido / 2; // Dividir cantidad si es media ración
                } else {
                     cantidadAIncrementar = cantidadPedido; // Por defecto, si no coincide ID conocido
                }
            } else if (productKey === 'Codillo') {
                cantidadAIncrementar = cantidadPedido; // Asume cantidad directa
            }

            // Validar cantidad calculada
            if (isNaN(cantidadAIncrementar) || cantidadAIncrementar <= 0) {
                console.warn(`${logPrefix} Cantidad inválida o cero para ${productKey} (${producto.nombre || producto.alias}). Saltando.`);
                continue;
            }
            
            // Referencia al documento del calendario diario específico
            const calendarDocRef = doc(db, collectionName, calendarDocId);
            console.log(`${logPrefix} ---> Procesando ${productKey} (Cant: ${cantidadAIncrementar}). Transacción en ${calendarDocRef.path}`);

            // --- 4. Ejecutar Transacción para actualizar el calendario ---
            try {
                await runTransaction(db, async (transaction) => {
                    const transLogPrefix = `${logPrefix} [Trans]`; // Prefijo para logs dentro de la transacción
                    console.log(`${transLogPrefix} Iniciando transacción para ${productKey}.`);

                    // 4.1 Leer el documento del calendario DENTRO de la transacción
                    console.log(`${transLogPrefix} Leyendo documento ${calendarDocRef.path}...`);
                    const calendarDocSnap = await transaction.get(calendarDocRef);

                    // 4.2 Validar existencia y estructura del documento
                    if (!calendarDocSnap.exists()) {
                        // Documento no existe, no se puede actualizar. La transacción fallará.
                        throw new Error(`Documento ${calendarDocRef.path} NO encontrado.`);
                    }
                    const calendarData = calendarDocSnap.data();
                    if (!Array.isArray(calendarData?.intervals)) {
                        // Estructura inesperada, 'intervals' no es un array. Fallará.
                        throw new Error(`Campo 'intervals' NO es un array o falta en ${calendarDocRef.path}.`);
                    }

                    // 4.3 Encontrar el intervalo correcto basado en la hora del pedido
                    // IMPORTANTE: Crear una copia profunda para modificarla de forma segura
                    let intervalsCopy = JSON.parse(JSON.stringify(calendarData.intervals));
                    let intervalFound = false;
                    let foundIntervalIndex = -1;

                    console.log(`${transLogPrefix} Buscando intervalo para hora ${orderTimeHHMM} (${orderTimeMinutes} min) en ${intervalsCopy.length} intervalos...`);
                    for (let i = 0; i < intervalsCopy.length; i++) {
                        const interval = intervalsCopy[i];
                        const startStr = interval.start; // "HH:MM"
                        // Asumimos que no hay 'end' y que el 'start' define el slot
                        // Si hubiera 'end', la lógica sería como en el prompt original
                        // Adaptación: Usar solo 'start' como identificador del slot
                        // console.log(`${transLogPrefix} - Verificando Intervalo [${i}]: start='${startStr}'`);

                        // Comprobar si el 'start' del intervalo coincide con la hora del pedido
                        if (startStr === orderTimeHHMM) {
                             console.log(`${transLogPrefix} ¡Intervalo ENCONTRADO por coincidencia exacta de hora en índice ${i}!`);
                            intervalFound = true;
                            foundIntervalIndex = i;
                            break; // Salir del bucle al encontrar
                        }
                        // Lógica alternativa si se usara start/end:
                        /*
                        const endStr = interval.end;
                        const startMin = convertTimeToMinutes(startStr);
                        const endMin = convertTimeToMinutes(endStr);
                        if (startMin !== -1 && endMin !== -1) {
                             // Comprobar si la hora del pedido cae DENTRO del intervalo [start, end)
                             // const isInInterval = orderTimeMinutes >= startMin && orderTimeMinutes < endMin;
                             // console.log(`${transLogPrefix}   Comparando: ${orderTimeMinutes} >= ${startMin} && ${orderTimeMinutes} < ${endMin} => ${isInInterval}`);
                             // if (isInInterval) { intervalFound = true; foundIntervalIndex = i; break; }
                        } else {
                             console.warn(`${transLogPrefix}   Intervalo [${i}] con start/end inválido(s): ${startStr}/${endStr}`);
                        }
                        */
                    }

                    // 4.4 Si no se encontró intervalo, fallar la transacción
                    if (!intervalFound) {
                        //throw new Error(`Intervalo para la hora ${orderTimeHHMM} no encontrado para ${productKey} en ${calendarDocRef.path}.`);
                    }

                    // 4.5 Actualizar el contador si no se excede el límite
                    const targetInterval = intervalsCopy[foundIntervalIndex];
                    const currentCount = Number(targetInterval.orderedCount) || 0;
                    const maxAllowed = Number(targetInterval.maxAllowed);
                    const intervalLabel = targetInterval.start; // Usar 'start' como etiqueta

                    if (isNaN(maxAllowed) || maxAllowed <= 0) { // Validar maxAllowed
                         console.warn(`${transLogPrefix} ADVERTENCIA: Límite (maxAllowed) inválido o no positivo (${maxAllowed}) para ${productKey} en ${intervalLabel}. Se actualizará igualmente.`);
                         // Decidir si fallar o continuar. Continuaremos pero loggeando.
                    }

                    const newCount = currentCount + cantidadAIncrementar;

                    
                        // Límite no excedido (o no aplicable), actualizar contador
                        console.log(`${transLogPrefix} Actualizando ${productKey} en intervalo ${intervalLabel}: ${currentCount} -> ${newCount} (Max: ${maxAllowed > 0 ? maxAllowed : 'N/A'})`);
                        targetInterval.orderedCount = newCount;

                        // 4.6 Programar la actualización en la transacción (SOBREESCRIBE TODO EL ARRAY 'intervals')
                        console.log(`${transLogPrefix} Programando transaction.update para ${calendarDocRef.path}...`);
                        transaction.update(calendarDocRef, { intervals: intervalsCopy });
                    
                }); // --- Fin de la función runTransaction ---

                console.log(`${logPrefix} <--- Transacción para ${productKey} completada (o límite detectado).`);

            } catch (error) {
                // Error específico durante la transacción (lectura, escritura, lógica interna, documento no encontrado, etc.)
                console.error(`${logPrefix} ERROR FATAL durante la transacción para ${productKey}:`, error.message);
                // Considerar si se debe intentar reintentar o notificar de alguna manera.
                // Por ahora, solo logueamos y continuamos con el siguiente producto si lo hubiera.
            }
        } // --- Fin del bucle for (producto of order.productos) ---

        console.log(`${logPrefix} Procesamiento finalizado.`);

    } catch (generalError) {
        // Error fuera de la lógica de transacción (ej. parseo inicial, error inesperado)
        console.error(`${logPrefix} ERROR GENERAL durante el procesamiento del pedido:`, generalError);
    }
  }; // --- Fin de handleFirestoreUpdateLikeCartTotal ---

  // El componente en sí no renderiza nada, solo ejecuta el efecto del listener
  return null;
};

export default GlobalOrderListener;