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

// Extender dayjs (si no está ya extendido globalmente)
dayjs.extend(customParseFormat);

// --- Configuration ---
const productTypesConfig = {
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

// --- Helper Functions ---
const normalizeTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const hour = parts[0].padStart(2,'0');
      const minute = parts[1] ? parts[1].padStart(2,'0') : '00';
      return `${hour}:${minute}`;
  }
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
    }

    const intervals = [];

    while (current < endTime) {
        const intervalStartMinutes = current;
        const intervalEndMinutes = current + step;

        if (intervalEndMinutes <= endTime) {
            const startStr = String(Math.floor(intervalStartMinutes / 60)).padStart(2, '0') + ':' + String(intervalStartMinutes % 60).padStart(2, '0');
            intervals.push({
                start: startStr,
                maxAllowed: maxAllowed || 0,
                orderedCount: 0,
                scheduleType,
            });
        } else {
             break;
        }
        current += step;
    }
    return intervals;
  } catch (error) {
    console.error("Error generando intervalos:", error, { start, end, step });
    return [];
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
    const maxAmount = parseInt(dayConfig[config.amountField], 10) || 0;
    console.log(`${logPrefix} Generando con maxAmount: ${maxAmount}`);

    // Generate Morning Intervals
    if (dayConfig.morningSchedule?.active && dayConfig.morningSchedule.start && dayConfig.morningSchedule.end) {
      const morningStart = normalizeTime(dayConfig.morningSchedule.start);
      const morningEnd = normalizeTime(dayConfig.morningSchedule.end);
       if (morningStart && morningEnd && morningEnd > morningStart) {
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
        if (eveningStart && eveningEnd && eveningEnd > eveningStart) {
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

    // Merge Logic
    const mergedIntervalsMap = new Map();
    newIntervals.forEach(newInt => {
        const matchingOld = oldIntervals.find(oldInt => oldInt.start === newInt.start);
        if (matchingOld && matchingOld.orderedCount > 0) {
             console.log(`${logPrefix} Intervalo ${newInt.start}: Preservando ${matchingOld.orderedCount} pedidos antiguos.`);
             mergedIntervalsMap.set(newInt.start, {
                ...matchingOld,
                maxAllowed: newInt.maxAllowed,
                scheduleType: newInt.scheduleType,
            });
        } else {
            mergedIntervalsMap.set(newInt.start, newInt);
        }
    });

    // Log discarded intervals
    oldIntervals.forEach(oldInt => {
        if (oldInt.orderedCount > 0 && !mergedIntervalsMap.has(oldInt.start)) {
            console.warn(`${logPrefix} Intervalo ${oldInt.start} con ${oldInt.orderedCount} pedidos NO está en el nuevo horario y será descartado.`);
        }
    });

    const finalIntervals = Array.from(mergedIntervalsMap.values())
        .sort((a, b) => a.start.localeCompare(b.start));

    console.log(`${logPrefix} ${finalIntervals.length} intervalos finales generados/fusionados.`);

    await setDoc(docRef, {
        intervals: finalIntervals,
        date: date,
        productType: productType,
        lastGenerated: new Date().toISOString(),
     }, { merge: true });

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
        console.error(`${logPrefix} Error: No se pudo convertir la fecha ${dateString} al formato DD/MM/YYYY.`);
        return;
    }

    const startOfDayString = `${dateForQuery} 00:00`;
    const endOfDayString = `${dateForQuery} 23:59`;

    console.log(`${logPrefix} Buscando pedidos con paraOtroDia=true y fechahora entre ${startOfDayString} y ${endOfDayString}`);

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

        for (const orderDoc of ordersToProcess) {
            const orderId = orderDoc.id;
            const orderData = orderDoc.data();
            const orderLogPrefix = `[Pedido ${orderId}]`;

            console.log(`%c${logPrefix} ${orderLogPrefix} Procesando... Cliente: ${orderData.cliente || 'N/A'}, Hora: ${orderData.fechahora}`, 'color: blue;');

            if (!Array.isArray(orderData.productos) || orderData.productos.length === 0) {
                console.warn(`${logPrefix} ${orderLogPrefix} Advertencia: El pedido no tiene productos. Marcando como procesado igualmente.`);
                try {
                    await updateDoc(doc(db, "pedidos", orderId), { paraOtroDia: false });
                    console.log(`${logPrefix} ${orderLogPrefix} Marcado como procesado (sin productos).`);
                } catch (updateError) {
                    console.error(`${logPrefix} ${orderLogPrefix} Error al marcar pedido vacío como procesado:`, updateError);
                }
                continue;
            }

            const orderTimeString = orderData.fechahora ? orderData.fechahora.split(' ')[1] : null;
            if (!orderTimeString || !/^\d{2}:\d{2}$/.test(orderTimeString)) {
                console.error(`${logPrefix} ${orderLogPrefix} Error: Hora inválida en fechahora (${orderData.fechahora}). Saltando pedido.`);
                continue;
            }

            // --- Ejecutar todo dentro de una única transacción por pedido ---
            try {
                await runTransaction(db, async (transaction) => {
                    const txLogPrefix = `${logPrefix} ${orderLogPrefix} [TX]`;
                    console.log(`${txLogPrefix} Iniciando transacción.`);

                    // --- FASE 1: Identificar documentos a leer y realizar TODAS las lecturas ---
                    console.log(`${txLogPrefix} Fase 1: Identificando y leyendo documentos...`);
                    const productRefsToRead = new Map();
                    const calendarRefsToRead = new Map();

                    for (const item of orderData.productos) {
                        const itemId = item.id; // Assuming 'id' field exists
                        const itemName = item.nombre || 'Desconocido';
                        const itemQuantity = Number(item.cantidad) || 0;

                        if (itemQuantity <= 0) continue;

                        let stockProductId = null;
                        let quantityToDeductFromStock = 0;
                        let calendarCollection = null;
                        let quantityToAddCalendar = 0;
                        let productNameForCalendar = '';

                        // Determine IDs and quantities
                        if (itemId === 1 || itemId === 2) {
                            stockProductId = productTypesConfig.chicken.stockProductId;
                            quantityToDeductFromStock = (itemId === 2) ? itemQuantity / 2 : itemQuantity;
                            calendarCollection = productTypesConfig.chicken.dailyCollection;
                            quantityToAddCalendar = quantityToDeductFromStock;
                            productNameForCalendar = 'Pollo';
                        } else if (itemId === 41 || itemId === 48) {
                            stockProductId = productTypesConfig.costilla.stockProductId;
                            quantityToDeductFromStock = (itemId === 48) ? itemQuantity / 2 : itemQuantity;
                            calendarCollection = productTypesConfig.costilla.dailyCollection;
                            quantityToAddCalendar = quantityToDeductFromStock;
                            productNameForCalendar = 'Costilla';
                        } else if (itemId === 50) {
                            stockProductId = productTypesConfig.codillo.stockProductId;
                            quantityToDeductFromStock = itemQuantity;
                            calendarCollection = productTypesConfig.codillo.dailyCollection;
                            quantityToAddCalendar = itemQuantity;
                            productNameForCalendar = 'Codillo';
                        } else {
                            stockProductId = itemId;
                            quantityToDeductFromStock = itemQuantity;
                        }

                        // Register stock ref for reading
                        if (stockProductId && quantityToDeductFromStock > 0) {
                            const stockIdStr = stockProductId.toString();
                            if (!productRefsToRead.has(stockIdStr)) {
                                productRefsToRead.set(stockIdStr, { ref: doc(db, "productos", stockIdStr), items: [] });
                            }
                            productRefsToRead.get(stockIdStr).items.push({ quantity: quantityToDeductFromStock, name: itemName });
                        }

                        // Register calendar ref for reading
                        if (calendarCollection && quantityToAddCalendar > 0) {
                            const calendarPath = `${calendarCollection}/${dateString}`;
                            if (!calendarRefsToRead.has(calendarPath)) {
                                calendarRefsToRead.set(calendarPath, { ref: doc(db, calendarCollection, dateString), items: [] });
                            }
                            calendarRefsToRead.get(calendarPath).items.push({ quantity: quantityToAddCalendar, time: orderTimeString, name: productNameForCalendar });
                        }
                    }

                    // Perform all stock reads
                    const productSnapshots = new Map();
                    for (const [id, data] of productRefsToRead.entries()) {
                        console.log(`${txLogPrefix} Leyendo stock para ID: ${id}`);
                        const snap = await transaction.get(data.ref);
                        productSnapshots.set(id, snap);
                    }

                    // Perform all calendar reads
                    const calendarSnapshots = new Map();
                    for (const [path, data] of calendarRefsToRead.entries()) {
                        console.log(`${txLogPrefix} Leyendo calendario: ${path}`);
                        const snap = await transaction.get(data.ref);
                        calendarSnapshots.set(path, snap);
                    }
                    console.log(`${txLogPrefix} Fase 1: Lecturas completadas.`);

                    // --- FASE 2: Process read data, validate, and calculate writes ---
                    console.log(`${txLogPrefix} Fase 2: Validando y calculando escrituras...`);
                    const stockUpdates = new Map();
                    const calendarUpdates = new Map();

                    // Process Stock
                    for (const [id, dataToRead] of productRefsToRead.entries()) {
                        const productSnap = productSnapshots.get(id);
                        const productNameForLog = dataToRead.items[0]?.name || `ID ${id}`;

                        if (!productSnap.exists()) {
                            throw new Error(`Producto ${id} no encontrado para actualizar stock.`);
                        }
                        const productData = productSnap.data();
                        const currentStock = productData.stock;

                        if (typeof currentStock !== 'number' || isNaN(currentStock)) {
                            throw new Error(`Stock inválido para producto ${productNameForLog}.`);
                        }

                        const totalQuantityToDeduct = dataToRead.items.reduce((sum, item) => sum + item.quantity, 0);

                        if (currentStock < totalQuantityToDeduct) {
                            throw new Error(`Stock insuficiente para ${productNameForLog}. Solo quedan ${currentStock}. Pedido ${orderId} no procesado.`);
                        }

                        const stockDecrement = -Math.abs(totalQuantityToDeduct);
                        stockUpdates.set(id, { ref: dataToRead.ref, decrement: stockDecrement });
                        console.log(`${txLogPrefix} Stock OK para ${id}. Planificando decremento: ${stockDecrement}`);
                    }

                    // Process Calendars
                    for (const [path, dataToRead] of calendarRefsToRead.entries()) {
                        const calendarSnap = calendarSnapshots.get(path);
                        const productNameForLog = dataToRead.items[0]?.name || `Calendario ${path}`;

                        if (!calendarSnap.exists()) {
                            throw new Error(`Calendario diario ${path} no encontrado.`);
                        }
                        const calendarData = calendarSnap.data();

                        if (!Array.isArray(calendarData?.intervals)) {
                            throw new Error(`Estructura de calendario inválida para ${productNameForLog}.`);
                        }

                        let intervalsCopy = JSON.parse(JSON.stringify(calendarData.intervals));
                        let updated = false;

                        console.log(`${txLogPrefix} [F2] Processing calendar path '${path}'. Items to process:`, JSON.stringify(dataToRead.items));

                        // Apply all updates for this calendar
                        for (const item of dataToRead.items) {
                            const intervalIndex = intervalsCopy.findIndex(interval => interval.start === item.time);

                            if (intervalIndex === -1) {
                                throw new Error(`Intervalo ${item.time} no encontrado en calendario ${path} para ${item.name}.`);
                            }

                            const currentCount = intervalsCopy[intervalIndex].orderedCount || 0;
                            const newCount = currentCount + item.quantity;
                            console.log(`${txLogPrefix} [F2] Inner loop item: ${JSON.stringify(item)}. currentCount: ${currentCount}, quantityToAdd: ${item.quantity}, newCount: ${newCount}`);

                            intervalsCopy[intervalIndex].orderedCount = newCount;
                            updated = true;
                        }

                        if (updated) {
                            calendarUpdates.set(path, { ref: dataToRead.ref, intervals: intervalsCopy });
                            console.log(`${txLogPrefix} Planificando actualización para calendario ${path}.`);
                        }
                    }
                    console.log(`${txLogPrefix} Fase 2: Cálculos completados.`);

                    // --- FASE 3: Perform ALL writes ---
                    console.log(`${txLogPrefix} Fase 3: Ejecutando escrituras...`);

                    // Write stock updates
                    for (const [id, updateData] of stockUpdates.entries()) {
                        console.log(`${txLogPrefix} Escribiendo stock update para ID: ${id} (Decremento: ${updateData.decrement})`);
                        transaction.update(updateData.ref, { stock: increment(updateData.decrement) });
                    }

                    // Write calendar updates
                    for (const [path, updateData] of calendarUpdates.entries()) {
                        console.log(`${txLogPrefix} Escribiendo calendario update para: ${path}`);
                        transaction.update(updateData.ref, { intervals: updateData.intervals });
                    }

                    // Mark order as processed
                    console.log(`${txLogPrefix} Escribiendo update para paraOtroDia=false en pedido ${orderId}.`);
                    const orderRefToUpdate = doc(db, "pedidos", orderId);
                    transaction.update(orderRefToUpdate, { paraOtroDia: false });

                    console.log(`${txLogPrefix} Fase 3: Escrituras programadas.`);

                }); // --- End of transaction ---

                console.log(`%c${logPrefix} ${orderLogPrefix} Transacción completada con éxito. Stock y calendario actualizados, paraOtroDia=false.`, 'color: green;');

            } catch (error) {
                // Log transaction errors, but don't stop processing other orders
                console.error(`${logPrefix} ${orderLogPrefix} ¡ERROR FATAL EN TRANSACCIÓN! El pedido NO fue procesado (paraOtroDia sigue true). Causa:`, error.message);
            }
        } // End of order loop

        console.log(`%c${logPrefix} Proceso de pedidos futuros de hoy finalizado.`, 'color: purple; font-weight: bold;');

    } catch (error) {
        console.error(`${logPrefix} Error al obtener los pedidos futuros para hoy:`, error);
    }
};


export const initDailyCalendars = async () => {
  // Removed the isInitializing lock flag - control this in the calling useEffect

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    console.log(`[${new Date().toISOString()}] Iniciando generación de calendarios diarios para fecha local: ${dateString}...`);

    // --- PASO 1: Determinar tipo de día y obtener configuración ---
    const holidayDocRef = doc(db, 'holiday_calendar', dateString);
    const holidayDocSnap = await getDoc(holidayDocRef);
    let dayId = null;
    let dayType = 'normal';

    if (holidayDocSnap.exists()) {
      const holidayData = holidayDocSnap.data();
      if (holidayData.type === 'holiday') { dayId = "8"; dayType = 'Festivo'; }
      else if (holidayData.type === 'preHoliday') { dayId = "9"; dayType = 'Víspera de Festivo'; }
    }

    if (dayId === null) {
      const dayOfWeek = now.getDay();
      const daysMapping = { 0: "7", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" };
      dayId = daysMapping[dayOfWeek];
      dayType = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek];
    }
    console.log(`[${dateString}] Detectado como: ${dayType} (ID: ${dayId}).`);

    if (!dayId) {
        console.error(`[${dateString}] ¡Error Crítico! No se pudo determinar el ID del día. Abortando generación.`);
        // Throw error to ensure it stops if dayId is missing
        throw new Error("Could not determine day ID.");
    }

    const dayDocRef = doc(db, 'calendar', dayId);
    console.log(`[${dateString}] Buscando configuración para el día ID: ${dayId} en /calendar/${dayId}`);
    const dayDocSnap = await getDoc(dayDocRef);

    if (!dayDocSnap.exists()) {
      console.error(`[${dateString}] ¡Error Crítico! No se encontró configuración en 'calendar' para el día ID: ${dayId}. No se generaron calendarios.`);
      throw new Error(`Configuration not found for day ID: ${dayId}`);
    }

    const dayConfig = dayDocSnap.data();
    console.log(`[${dateString}] Configuración encontrada para el día ID ${dayId}.`);


    // --- PASO 2: Generar/fusionar los calendarios diarios para CADA producto ---
    console.log(`[${dateString}] Iniciando generación/fusión de calendarios...`);
    const generationPromises = Object.keys(productTypesConfig).map(productType =>
      generateAndMergeIntervals(productType, dayConfig, dateString)
    );
    await Promise.all(generationPromises);
    console.log(`%c[${new Date().toISOString()}] Todos los calendarios diarios generados/actualizados para ${dateString}.`, 'color: green; font-weight: bold;');

    // --- PASO 3: Procesar pedidos futuros que son para HOY ---
    // This will now only run once if the calling useEffect is correctly implemented
    await processTodaysFutureOrders(dateString);

    console.log(`%c[${new Date().toISOString()}] Proceso initDailyCalendars completado para ${dateString}.`, 'color: green; font-weight: bold;');


  } catch (error) {
    // Log any errors that occurred during the process
    console.error(`[${new Date().toISOString()}] Error fatal durante la inicialización completa de calendarios diarios y procesamiento de futuros:`, error);
    // No finally block needed just for the lock anymore
  }
};
