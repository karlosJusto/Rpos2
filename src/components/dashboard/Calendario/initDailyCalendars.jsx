import { db } from '../../firebase/firebase'; // Ajusta la ruta si es necesario
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  runTransaction,
  increment
} from 'firebase/firestore';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc'; // Asegúrate de tener utc si usas timezone
import timezone from 'dayjs/plugin/timezone'; // Asegúrate de tener timezone si usas

// Extender dayjs (si no está ya extendido globalmente)
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Madrid"); // O tu zona horaria relevante

// --- Configuration ---
// Export this config so other modules can use it for regeneration logic
export const productTypesConfig = {
  chicken: {
    name: 'Pollos',
    amountField: 'chickenAmount',
    intervalStep: 15,
    dailyCollection: 'chicken_calendar_daily',
    intervalLabel: '(15min)',
    stockProductId: 1, // ID del producto base para stock (Pollo Entero)
    calendarProductId: 1 // ID base para identificar en calendario (puede ser 1 o 2)
  },
  costilla: {
    name: 'Costillas',
    amountField: 'costillaAmount',
    intervalStep: 15,
    dailyCollection: 'costilla_calendar_daily',
    intervalLabel: '(15min)',
    stockProductId: 41, // ID del producto base para stock (Costilla Entera)
    calendarProductId: 41 // ID base para identificar en calendario (puede ser 41 o 48)
  },
  codillo: {
    name: 'Codillos',
    amountField: 'codilloAmount',
    intervalStep: 15,
    dailyCollection: 'codillo_calendar_daily',
    intervalLabel: '(15min)',
    stockProductId: 50, // ID del producto base para stock (Codillo)
    calendarProductId: 50 // ID base para identificar en calendario
  },
};

// --- NUEVA CONFIGURACIÓN PARA ENSALADAS ---
const SALADS_COLLECTION_NAME = 'ensaladas';

// --- Helper Functions ---
const normalizeTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hour = parts[0].padStart(2, '0');
    const minute = parts[1] ? parts[1].padStart(2, '0') : '00';
    return `${hour}:${minute}`;
  }
  // If only hour is provided (e.g., "9"), assume ":00"
  const hour = timeStr.padStart(2, '0');
  return `${hour}:00`;
};

const generateIntervalsForSchedule = (start, end, maxAllowed, step, scheduleType) => {
  if (!start || !end || !step || typeof start !== 'string' || typeof end !== 'string' || !start.includes(':') || !end.includes(':')) {
    console.error("generateIntervalsForSchedule: Datos de entrada inválidos o incompletos.", { start, end, maxAllowed, step, scheduleType });
    return [];
  }
  if (step <= 0) {
    console.error("generateIntervalsForSchedule: El paso (step) debe ser mayor que cero.", { step });
    return [];
  }

  try {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) ||
      startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
      endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
      console.error("generateIntervalsForSchedule: Formato de hora inválido.", { start, end });
      return [];
    }

    let current = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (endTime <= current) {
      // console.warn("generateIntervalsForSchedule: La hora de fin es anterior o igual a la hora de inicio.", { start, end });
      // Allow generation even if end time is same or earlier, might be valid for single interval cases?
    }

    const intervals = [];

    while (current < endTime) {
      const intervalStartMinutes = current;
      const intervalEndMinutes = current + step;

      // Ensure the interval *starts* before the end time.
      // The interval itself can end exactly at the end time.
      if (intervalStartMinutes < endTime) {
        const startStr = String(Math.floor(intervalStartMinutes / 60)).padStart(2, '0') + ':' + String(intervalStartMinutes % 60).padStart(2, '0');
        intervals.push({
          start: startStr,
          maxAllowed: maxAllowed || 0, // Ensure maxAllowed is a number, default 0
          orderedCount: 0, // Initialize orderedCount
          scheduleType, // 'morning' or 'evening'
        });
      } else {
        break; // Stop if the start of the next interval is at or after the end time
      }
      current += step;
    }
    return intervals;
  } catch (error) {
    console.error("Error generando intervalos:", error, { start, end, step });
    return [];
  }
};

// --- NUEVA FUNCIÓN para asegurar el documento de ensaladas ---
export const ensureDailySaladDocument = async (dateStringYYYYMMDD) => {
  const dateForId = dayjs(dateStringYYYYMMDD, 'YYYY-MM-DD').format('DD-MM-YYYY'); // Formato dd-mm-aaaa para ID
  const dateForName = dayjs(dateStringYYYYMMDD, 'YYYY-MM-DD').format('DD/MM/YYYY'); // Formato dd/mm/yyyy para el nombre
  const logPrefix = `[EnsureSaladDoc][${dateForId}]`;

  if (dateForId === 'Invalid Date' || dateForName === 'Invalid Date') {
    console.error(`${logPrefix} Error: Formato de fecha inválido al convertir ${dateStringYYYYMMDD}`);
    return; // No continuar si la fecha es inválida
  }

  const saladDocRef = doc(db, SALADS_COLLECTION_NAME, dateForId);

  try {
    console.log(`${logPrefix} Verificando existencia del documento...`);
    const docSnap = await getDoc(saladDocRef);

    if (!docSnap.exists()) {
      console.log(`%c${logPrefix} Documento NO existe. Creando con valores por defecto...`, 'color: blue; font-weight: bold;');

      const defaultSaladData = {
        ensaladas: {
          grandes: { pedidas: 0, preparadas: 0 },
          pequenas: { pedidas: 0, preparadas: 0 }
        },
        ensaladillas: {
          grandes: { pedidas: 0, preparadas: 0 },
          pequenas: { pedidas: 0, preparadas: 0 }
        },
        name: `Ensaladas y Ensaladillas del ${dateForName}`, // Nombre descriptivo
        lastChecked: new Date().toISOString() // Opcional: timestamp de la última verificación/creación
      };

      await setDoc(saladDocRef, defaultSaladData);
      console.log(`%c${logPrefix} Documento creado exitosamente.`, 'color: green;');

    } else {
      console.log(`${logPrefix} Documento ya existe. No se requiere creación.`);
      // Opcional: Podrías añadir una actualización del campo 'lastChecked' si quieres saber cuándo se ejecutó esto
      // await updateDoc(saladDocRef, { lastChecked: new Date().toISOString() });
    }
  } catch (error) {
    console.error(`${logPrefix} Error al verificar/crear el documento de ensaladas:`, error);
    // Considera si quieres relanzar el error para detener el proceso principal
    // throw error;
  }
};

export const generateAndMergeIntervals = async (productType, dayConfig, date) => {
  const config = productTypesConfig[productType];
  if (!config || !dayConfig || !date) {
    console.error("Faltan datos para generateAndMergeIntervals", { productType, dayConfig, date });
    return;
  }
  const logPrefix = `[GenMerge][${config.dailyCollection}/${date}]`;
  console.log(`%c${logPrefix} Regenerando (MODO: Sin preservar intervalos fuera de horario)...`, 'color: orange; font-weight: bold;');

  const docRef = doc(db, config.dailyCollection, date);

  try {
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : { intervals: [] };
    const oldIntervals = Array.isArray(oldData.intervals) ? oldData.intervals : [];
    if (docSnap.exists()) {
      console.log(`${logPrefix} Encontrados ${oldIntervals.length} intervalos antiguos.`);
    } else {
      console.log(`${logPrefix} No existe documento previo. Se creará uno nuevo.`);
    }

    let newIntervals = [];
    const maxAmount = parseInt(dayConfig[config.amountField], 10) || 0; // Ensure maxAmount is a number
    console.log(`${logPrefix} Generando con maxAmount: ${maxAmount}`);

    // Generate Morning Intervals
    if (dayConfig.morningSchedule?.active && dayConfig.morningSchedule.start && dayConfig.morningSchedule.end) {
      const morningStart = normalizeTime(dayConfig.morningSchedule.start);
      const morningEnd = normalizeTime(dayConfig.morningSchedule.end);
      if (morningStart && morningEnd && morningEnd > morningStart) { // Check if end is strictly after start
        console.log(`${logPrefix} Generando intervalos MAÑANA (${morningStart} - ${morningEnd})`);
        newIntervals = newIntervals.concat(
          generateIntervalsForSchedule(morningStart, morningEnd, maxAmount, config.intervalStep, 'morning')
        );
      } else {
        console.warn(`${logPrefix} Horas de mañana inválidas o fin <= inicio:`, dayConfig.morningSchedule);
      }
    } else {
      console.log(`${logPrefix} Horario de mañana inactivo o incompleto.`);
    }

    // Generate Evening Intervals
    if (dayConfig.eveningSchedule?.active && dayConfig.eveningSchedule.start && dayConfig.eveningSchedule.end) {
      const eveningStart = normalizeTime(dayConfig.eveningSchedule.start);
      const eveningEnd = normalizeTime(dayConfig.eveningSchedule.end);
      if (eveningStart && eveningEnd && eveningEnd > eveningStart) { // Check if end is strictly after start
        console.log(`${logPrefix} Generando intervalos TARDE (${eveningStart} - ${eveningEnd})`);
        newIntervals = newIntervals.concat(
          generateIntervalsForSchedule(eveningStart, eveningEnd, maxAmount, config.intervalStep, 'evening')
        );
      } else {
        console.warn(`${logPrefix} Horas de tarde inválidas o fin <= inicio:`, dayConfig.eveningSchedule);
      }
    } else {
      console.log(`${logPrefix} Horario de tarde inactivo o incompleto.`);
    }
    console.log(`${logPrefix} Generados ${newIntervals.length} intervalos nuevos según horario actual.`);

    // Merge Logic: Preserve orderedCount from old intervals if they match new ones
    const mergedIntervalsMap = new Map();
    newIntervals.forEach(newInt => {
      // Find an old interval that matches the start time
      const matchingOld = oldIntervals.find(oldInt => oldInt.start === newInt.start);
      if (matchingOld && matchingOld.orderedCount > 0) {
        // If found and has orders, preserve the old data but update maxAllowed and scheduleType
        console.log(`${logPrefix} Intervalo ${newInt.start}: Preservando ${matchingOld.orderedCount} pedidos antiguos.`);
        mergedIntervalsMap.set(newInt.start, {
          ...matchingOld, // Keep all old fields (including orderedCount)
          maxAllowed: newInt.maxAllowed, // Update maxAllowed from new config
          scheduleType: newInt.scheduleType, // Update scheduleType from new config
        });
      } else {
        // If no match or old interval had 0 orders, use the newly generated interval
        mergedIntervalsMap.set(newInt.start, newInt);
      }
    });

    // Log discarded intervals that had orders
    oldIntervals.forEach(oldInt => {
      // If an old interval had orders but is NOT in the new schedule (mergedIntervalsMap)
      if (oldInt.orderedCount > 0 && !mergedIntervalsMap.has(oldInt.start)) {
        console.warn(`${logPrefix} Intervalo ${oldInt.start} con ${oldInt.orderedCount} pedidos NO está en el nuevo horario y será descartado.`);
      }
    });

    // Convert map back to array and sort by start time
    const finalIntervals = Array.from(mergedIntervalsMap.values())
      .sort((a, b) => a.start.localeCompare(b.start));

    console.log(`${logPrefix} ${finalIntervals.length} intervalos finales generados/fusionados.`);

    // Write the final intervals to Firestore
    await setDoc(docRef, {
      intervals: finalIntervals,
      date: date, // Store the date for which these intervals apply
      productType: productType, // Store the product type
      lastGenerated: new Date().toISOString(), // Timestamp of generation
    }, { merge: true }); // Use merge:true to avoid overwriting other potential fields

    console.log(`${logPrefix} Documento actualizado/creado en Firestore.`);

  } catch (error) {
    console.error(`${logPrefix} Error FATAL regenerando/fusionando:`, error);
  }
};

const processTodaysFutureOrders = async (dateString) => {
  const logPrefix = `[ProcessFutureOrders][${dateString}]`;
  console.log(`%c${logPrefix} Iniciando proceso para pedidos futuros de HOY...`, 'color: purple; font-weight: bold;');

  const dateForQuery = dayjs(dateString, 'YYYY-MM-DD').format('DD/MM/YYYY');
  if (!dateForQuery || dateForQuery === 'Invalid Date') {
    console.error(`${logPrefix} Error: Fecha inválida ${dateString}.`);
    return;
  }

  const startOfDayString = `${dateForQuery} 00:00`;
  const endOfDayString = `${dateForQuery} 23:59`;
  console.log(`${logPrefix} Buscando pedidos con paraOtroDia=true entre ${startOfDayString} y ${endOfDayString}`);

  const pedidosRef = collection(db, "pedidos");
  const q = query(pedidosRef,
    where("paraOtroDia", "==", true),
    where("fechahora", ">=", startOfDayString),
    where("fechahora", "<=", endOfDayString)
  );

  try {
    const querySnapshot = await getDocs(q);
    const ordersToProcess = querySnapshot.docs;

    if (ordersToProcess.length === 0) {
      console.log(`${logPrefix} No se encontraron pedidos futuros para procesar hoy.`);
      return;
    }

    console.log(`${logPrefix} Se encontraron ${ordersToProcess.length} pedidos para procesar.`);

    // Revisa que todos tus IDs estén correctos aquí
    const productProcessingConfig = {
      '1': { stockId: 1, stockMultiplier: 1, calendarType: 'chicken' },
      '2': { stockId: 1, stockMultiplier: 0.5, calendarType: 'chicken' },
      '39': { stockId: 1, stockMultiplier: 0.5, calendarType: 'chicken' },
      '40': { stockId: 1, stockMultiplier: 1, calendarType: 'chicken' },
      '41': { stockId: 41, stockMultiplier: 1, calendarType: 'costilla' },
      '48': { stockId: 41, stockMultiplier: 0.5, calendarType: 'costilla' },
      '50': { stockId: 50, stockMultiplier: 1, calendarType: 'codillo' },
      '20': { stockId: 20, stockMultiplier: 1, calendarType: 'codillo' },
    };

    for (const orderDoc of ordersToProcess) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderLogPrefix = `[Pedido ${orderId}]`;

      console.log(`%c${logPrefix} ${orderLogPrefix} Procesando... Cliente: ${orderData.cliente || 'N/A'}, Hora: ${orderData.fechahora}`, 'color: blue;');

      if (!Array.isArray(orderData.productos) || orderData.productos.length === 0) {
        console.warn(`${logPrefix} ${orderLogPrefix} Pedido sin productos. Marcando como procesado.`);
        try {
          await updateDoc(doc(db, "pedidos", orderId), { paraOtroDia: false, procesado: true });
        } catch (updateError) {
          console.error(`${logPrefix} ${orderLogPrefix} Error al marcar pedido vacío como procesado:`, updateError);
        }
        continue;
      }

      const orderTimeString = orderData.fechahora?.split(' ')[1];
      if (!orderTimeString || !/^\d{2}:\d{2}$/.test(orderTimeString)) {
        console.error(`${logPrefix} ${orderLogPrefix} Error: Hora inválida (${orderData.fechahora}). Saltando pedido.`);
        continue;
      }

      try {
        await runTransaction(db, async (transaction) => {
          const txLogPrefix = `${logPrefix} ${orderLogPrefix} [TX]`;
          console.log(`${txLogPrefix} Iniciando transacción.`);

          const productRefsToRead = new Map();
          const calendarRefsToRead = new Map();

          for (const item of orderData.productos) {
            const itemIdStr = String(item.id);
            const itemQuantity = Number(item.cantidad) || 0;
            if (itemQuantity <= 0) continue;

            const config = productProcessingConfig[itemIdStr];
            let stockIdToUpdate, quantityToDeduct;

            if (config) {
              stockIdToUpdate = config.stockId;
              quantityToDeduct = itemQuantity * config.stockMultiplier;
              if (config.calendarType) {
                const calendarConfig = productTypesConfig[config.calendarType];
                const calendarPath = `${calendarConfig.dailyCollection}/${dateString}`;
                if (!calendarRefsToRead.has(calendarPath)) {
                  calendarRefsToRead.set(calendarPath, { ref: doc(db, calendarConfig.dailyCollection, dateString), items: [] });
                }
                calendarRefsToRead.get(calendarPath).items.push({ quantity: quantityToDeduct, time: orderTimeString, name: calendarConfig.name });
              }
            } else {
              stockIdToUpdate = item.id;
              quantityToDeduct = itemQuantity;
            }

            if (stockIdToUpdate && quantityToDeduct > 0) {
              const stockIdStr = String(stockIdToUpdate);
              if (!productRefsToRead.has(stockIdStr)) {
                productRefsToRead.set(stockIdStr, { ref: doc(db, "productos", stockIdStr), totalDeduction: 0 });
              }
              productRefsToRead.get(stockIdStr).totalDeduction += quantityToDeduct;
            }
          }

          // --- FASE 1: LECTURAS ---
          const productSnapshots = new Map();
          for (const [id, data] of productRefsToRead.entries()) productSnapshots.set(id, await transaction.get(data.ref));
          const calendarSnapshots = new Map();
          for (const [path, data] of calendarRefsToRead.entries()) calendarSnapshots.set(path, await transaction.get(data.ref));
          console.log(`${txLogPrefix} Lecturas completadas.`);

          // --- FASE 2: CÁLCULOS Y VALIDACIONES ---
          for (const [id, dataToRead] of productRefsToRead.entries()) {
            const productSnap = productSnapshots.get(id);
            if (!productSnap.exists()) {
              throw new Error(`Producto con ID de stock ${id} no encontrado.`);
            }
            const currentStock = productSnap.data().stock;

            if (currentStock < dataToRead.totalDeduction) {
              const newStock = currentStock - dataToRead.totalDeduction;
              console.warn(
                `%c${txLogPrefix} ¡ATENCIÓN! El stock del producto ID ${id} entrará en negativo. Stock actual: ${currentStock}, se restará: ${dataToRead.totalDeduction}, quedará: ${newStock}`,
                'color: orange; font-weight: bold;'
              );
            }
          }

          const calendarUpdates = new Map();
          for (const [path, dataToRead] of calendarRefsToRead.entries()) {
            const calendarSnap = calendarSnapshots.get(path);
            if (!calendarSnap.exists() || !Array.isArray(calendarSnap.data().intervals)) {
              console.warn(`${txLogPrefix} ADVERTENCIA: Calendario ${path} no encontrado o con formato incorrecto. Se omitirá su actualización.`);
              continue;
            }

            let intervalsCopy = JSON.parse(JSON.stringify(calendarSnap.data().intervals));
            let hasBeenUpdated = false;

            for (const item of dataToRead.items) {
              const intervalIndex = intervalsCopy.findIndex(interval => interval.start === item.time);

              if (intervalIndex === -1) {
                console.warn(`${txLogPrefix} ADVERTENCIA: Intervalo ${item.time} no encontrado en ${path}. Se omitirá la actualización para "${item.name}".`);
                continue;
              }

              intervalsCopy[intervalIndex].orderedCount = (intervalsCopy[intervalIndex].orderedCount || 0) + item.quantity;
              hasBeenUpdated = true;
            }

            if (hasBeenUpdated) {
              calendarUpdates.set(path, { ref: dataToRead.ref, intervals: intervalsCopy });
            }
          }
          console.log(`${txLogPrefix} Cálculos y validaciones completadas.`);

          // --- FASE 3: ESCRITURAS ---
          for (const [id, data] of productRefsToRead.entries()) {
            transaction.update(data.ref, { stock: increment(-data.totalDeduction) });
          }
          for (const [path, updateData] of calendarUpdates.entries()) {
            transaction.update(updateData.ref, { intervals: updateData.intervals });
          }

          const orderRefToUpdate = doc(db, "pedidos", orderId);
          transaction.update(orderRefToUpdate, { paraOtroDia: false, procesado: true });

          console.log(`${txLogPrefix} Escrituras programadas.`);
        });

        console.log(`%c${logPrefix} ${orderLogPrefix} Transacción completada con éxito.`, 'color: green;');

      } catch (error) {
        console.error(`${logPrefix} ${orderLogPrefix} ¡ERROR FATAL EN TRANSACCIÓN! El pedido NO fue procesado. Causa:`, error.message);
      }
    }

    console.log(`%c${logPrefix} Proceso de pedidos futuros de hoy finalizado.`, 'color: purple; font-weight: bold;');

  } catch (error) {
    console.error(`${logPrefix} Error al obtener los pedidos futuros para hoy:`, error);
  }
};


export const initDailyCalendars = async () => {
  // Removed the isInitializing lock flag - control this in the calling useEffect

  try {
    const today = dayjs().tz("Europe/Madrid"); // Use your specific timezone
    console.log(`[${new Date().toISOString()}] Iniciando proceso de inicialización de calendarios (hoy y los próximos 6 días)...`);

    // Loop from today (i=0) to today + 6 days (i=6) -> total 7 days
    for (let i = 0; i < 7; i++) {
      const currentDateInLoop = today.add(i, 'day');
      const dateString = currentDateInLoop.format('YYYY-MM-DD');

      console.log(`%c[${new Date().toISOString()}] Procesando fecha: ${dateString} (Día ${i + 1}/7)`, 'color: cyan; font-weight: bold;');

      // --- PASO 1: Determinar tipo de día y obtener configuración PARA dateString ---
      const holidayDocRef = doc(db, 'holiday_calendar', dateString);
      const holidayDocSnap = await getDoc(holidayDocRef);
      let dayId = null;
      let dayType = 'normal'; // Default day type

      if (holidayDocSnap.exists()) {
        const holidayData = holidayDocSnap.data();
        if (holidayData.type === 'holiday') { dayId = "8"; dayType = 'Festivo'; }
        // CORREGIDO: Ahora asigna el ID correcto para vísperas.
        else if (holidayData.type === 'preHoliday') { dayId = "9"; dayType = 'Víspera de Festivo'; }
      }

      if (dayId === null) {
        const dayOfWeek = currentDateInLoop.day(); // 0 for Sunday, 1 for Monday...
        const daysMapping = { 0: "7", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" };
        dayId = daysMapping[dayOfWeek];
        dayType = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek];
      }
      console.log(`[${dateString}] Detectado como: ${dayType} (ID: ${dayId}).`);

      if (!dayId) {
        console.error(`[${dateString}] ¡Error Crítico! No se pudo determinar el ID del día. Saltando generación para esta fecha.`);
        continue; // Skip to the next day in the loop
      }

      const dayDocRef = doc(db, 'calendar', dayId);
      console.log(`[${dateString}] Buscando configuración para el día ID: ${dayId} en /calendar/${dayId}`);
      const dayDocSnap = await getDoc(dayDocRef);

      if (!dayDocSnap.exists()) {
        console.error(`[${dateString}] ¡Error Crítico! No se encontró configuración en 'calendar' para el día ID: ${dayId}. No se generaron calendarios para esta fecha.`);
        continue; // Skip to the next day
      }

      const dayConfig = dayDocSnap.data();
      console.log(`[${dateString}] Configuración encontrada para el día ID ${dayId}.`);

      // --- PASO 2: Generar/fusionar los calendarios diarios para CADA producto Y ASEGURAR ENSALADAS PARA dateString ---
      console.log(`[${dateString}] Iniciando generación/fusión de calendarios y verificación de ensaladas...`);

      const tasks = [];
      Object.keys(productTypesConfig).forEach(productType => {
        tasks.push(generateAndMergeIntervals(productType, dayConfig, dateString));
      });
      tasks.push(ensureDailySaladDocument(dateString));

      try {
        await Promise.all(tasks);
        console.log(`%c[${new Date().toISOString()}] Todos los calendarios (productos y ensaladas) generados/verificados para ${dateString}.`, 'color: green;');
      } catch (taskError) {
        console.error(`[${new Date().toISOString()}] Error generando/verificando calendarios para ${dateString}:`, taskError);
        // Continue to the next day even if this one fails
      }
    } // End of loop for 7 days

    // --- PASO 3: Procesar pedidos futuros que son para HOY ---
    // COMENTADO: El stock ahora se resta al momento del pedido, no hace falta procesarlo aquí.
    /*
    const actualCurrentDateString = today.format('YYYY-MM-DD');
    console.log(`%c[${new Date().toISOString()}] Iniciando procesamiento de pedidos futuros para HOY (${actualCurrentDateString})...`, 'color: magenta; font-weight: bold;');
    await processTodaysFutureOrders(actualCurrentDateString);
    */

    console.log(`%c[${new Date().toISOString()}] Proceso initDailyCalendars completado (7 días verificados, pedidos de hoy procesados).`, 'color: green; font-weight: bold;');


  } catch (error) {
    // Log any errors that occurred during the process
    console.error(`[${new Date().toISOString()}] Error fatal durante el proceso initDailyCalendars:`, error);
    // No finally block needed just for the lock anymore
  }
};
