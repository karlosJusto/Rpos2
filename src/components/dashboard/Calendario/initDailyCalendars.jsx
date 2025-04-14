import { db } from '../../firebase/firebase'; // Asegúrate que la ruta sea correcta
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- Configuración específica por producto ---
// MODIFICADO: Todos los productos ahora usan intervalStep: 15
const productTypesConfig = {
  chicken: {
    name: 'Pollos',
    amountField: 'chickenAmount',
    intervalStep: 15,
    dailyCollection: 'chicken_calendar_daily',
    intervalLabel: '(15min)'
  },
  costilla: {
    name: 'Costillas',
    amountField: 'costillaAmount',
    intervalStep: 15, // CAMBIADO de 30 a 15
    dailyCollection: 'costilla_calendar_daily',
    intervalLabel: '(15min)' // CAMBIADO de '(30min)' a '(15min)'
  },
  codillo: {
    name: 'Codillos',
    amountField: 'codilloAmount',
    intervalStep: 15, // CAMBIADO de 60 a 15
    dailyCollection: 'codillo_calendar_daily',
    intervalLabel: '(15min)' // CAMBIADO de '(60min)' a '(15min)'
  },
  // Puedes añadir más productos aquí si es necesario
};

// Función para normalizar la hora a formato HH:MM
const normalizeTime = (timeStr) => {
  if (!timeStr) return '';
  // Si ya tiene dos puntos, asumimos que es HH:MM
  if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const hour = parts[0].padStart(2,'0');
      const minute = parts[1] ? parts[1].padStart(2,'0') : '00';
      return `${hour}:${minute}`;
  }
  // Si no tiene dos puntos, asumimos que es solo la hora y añadimos :00
  const hour = timeStr.padStart(2, '0');
  return `${hour}:00`;
};

// Función que genera los intervalos según el horario, cantidad máxima y paso definido
const generateIntervalsForSchedule = (start, end, maxAllowed, step, scheduleType) => {
  // Validaciones de entrada robustas
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

    // Validar que las horas/minutos sean números válidos
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) ||
        startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
        endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
        console.error("generateIntervalsForSchedule: Formato de hora inválido.", { start, end });
        return [];
    }

    let current = startHour * 60 + startMinute; // Tiempo actual en minutos desde medianoche
    const endTime = endHour * 60 + endMinute;   // Tiempo final en minutos desde medianoche

    // Validar que la hora de fin no sea anterior a la de inicio
    if (endTime <= current) {
        console.warn("generateIntervalsForSchedule: La hora de fin es anterior o igual a la hora de inicio.", { start, end });
        // Podría devolver [] o simplemente no entrar al bucle, que es lo que pasará
    }

    const intervals = [];

    while (current < endTime) {
        const intervalStartMinutes = current;
        const intervalEndMinutes = current + step;

        // Solo añadir si el intervalo TERMINA antes o justo a la hora de fin
        if (intervalEndMinutes <= endTime) {
            const startStr = String(Math.floor(intervalStartMinutes / 60)).padStart(2, '0') + ':' + String(intervalStartMinutes % 60).padStart(2, '0');
            // endStr no se usa generalmente en la lógica posterior, pero se puede calcular si es necesario
            // const endStr = String(Math.floor(intervalEndMinutes / 60)).padStart(2, '0') + ':' + String(intervalEndMinutes % 60).padStart(2, '0');

            intervals.push({
                start: startStr,
                // end: endStr, // Opcional
                maxAllowed: maxAllowed || 0,
                orderedCount: 0,      // Se inicializa a 0
                scheduleType,
            });
        } else {
            // Si el intervalo se pasa de la hora final, no lo añadimos y terminamos el bucle
            break;
        }
        current += step; // Avanzar al siguiente intervalo
    }
    return intervals;
  } catch (error) {
    console.error("Error generando intervalos:", error, { start, end, step });
    return []; // Devuelve array vacío en caso de error
  }
};


// Función que genera y fusiona los intervalos para un producto según la configuración del día y la fecha dada
// VERSIÓN MODIFICADA: Ya NO preserva intervalos con pedidos que queden fuera del nuevo horario.
// ¡¡¡ADVERTENCIA: ESTO PUEDE CAUSAR PÉRDIDA DE DATOS DE PEDIDOS EXISTENTES!!!
export const generateAndMergeIntervals = async (productType, dayConfig, date) => {
  const config = productTypesConfig[productType];
  if (!config || !dayConfig || !date) {
    console.error("Faltan datos para generateAndMergeIntervals", { productType, dayConfig, date });
    return; // Salir si faltan datos esenciales
  }
  // Añadir aviso en el log
  console.log(`%c[${new Date().toISOString()}] Regenerando ${config.dailyCollection} para ${date} (MODO: Sin preservar intervalos fuera de horario)...`, 'color: orange; font-weight: bold;');

  const docRef = doc(db, config.dailyCollection, date);

  try {
    // 1. Obtener datos antiguos (si existen) para preservar orderedCount DENTRO del nuevo horario
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : { intervals: [] };
    // Asegurarse que oldIntervals siempre sea un array
    const oldIntervals = Array.isArray(oldData.intervals) ? oldData.intervals : [];
    if (docSnap.exists()) {
        console.log(`[${config.dailyCollection}/${date}] Encontrados ${oldIntervals.length} intervalos antiguos.`);
    }


    // 2. Generar nuevos intervalos basados en la configuración del día (morning/evening)
    let newIntervals = [];
    // Usar parseInt para asegurar que es un número, con fallback a 0
    const maxAmount = parseInt(dayConfig[config.amountField], 10) || 0;

    console.log(`[${config.dailyCollection}/${date}] Generando con maxAmount: ${maxAmount}`);

    // Generar intervalos de mañana si está activo y tiene horas válidas
    if (dayConfig.morningSchedule?.active && dayConfig.morningSchedule.start && dayConfig.morningSchedule.end) {
      const morningStart = normalizeTime(dayConfig.morningSchedule.start);
      const morningEnd = normalizeTime(dayConfig.morningSchedule.end);
       if (morningStart && morningEnd && morningEnd > morningStart) { // Añadir validación de fin > inicio
            console.log(`[${config.dailyCollection}/${date}] Generando intervalos MAÑANA (${morningStart} - ${morningEnd})`);
            newIntervals = newIntervals.concat(
                generateIntervalsForSchedule(
                morningStart,
                morningEnd,
                maxAmount,
                config.intervalStep,
                'morning'
                )
            );
       } else {
            console.warn(`[${config.dailyCollection}/${date}] Horas de mañana inválidas o fin <= inicio:`, dayConfig.morningSchedule);
       }
    } else {
         console.log(`[${config.dailyCollection}/${date}] Horario de mañana inactivo o incompleto.`);
    }

    // Generar intervalos de tarde si está activo y tiene horas válidas
    if (dayConfig.eveningSchedule?.active && dayConfig.eveningSchedule.start && dayConfig.eveningSchedule.end) {
       const eveningStart = normalizeTime(dayConfig.eveningSchedule.start);
       const eveningEnd = normalizeTime(dayConfig.eveningSchedule.end);
        if (eveningStart && eveningEnd && eveningEnd > eveningStart) { // Añadir validación de fin > inicio
             console.log(`[${config.dailyCollection}/${date}] Generando intervalos TARDE (${eveningStart} - ${eveningEnd})`);
            newIntervals = newIntervals.concat(
                generateIntervalsForSchedule(
                eveningStart,
                eveningEnd,
                maxAmount,
                config.intervalStep,
                'evening'
                )
            );
        } else {
             console.warn(`[${config.dailyCollection}/${date}] Horas de tarde inválidas o fin <= inicio:`, dayConfig.eveningSchedule);
        }
    } else {
         console.log(`[${config.dailyCollection}/${date}] Horario de tarde inactivo o incompleto.`);
    }
    console.log(`[${config.dailyCollection}/${date}] Generados ${newIntervals.length} intervalos nuevos según horario actual.`);

    // 3. Fusionar intervalos nuevos con los antiguos (Solo para los que coinciden en hora de inicio)
    // Mapear sobre los NUEVOS intervalos generados
    const mergedIntervalsMap = new Map();

    newIntervals.forEach(newInt => {
        // Buscar si existe un intervalo antiguo con el mismo 'start'
        const matchingOld = oldIntervals.find(oldInt => oldInt.start === newInt.start);
        if (matchingOld && matchingOld.orderedCount > 0) {
            // Si existe y tiene pedidos, usar el antiguo pero actualizar maxAllowed
             mergedIntervalsMap.set(newInt.start, {
                ...matchingOld, // Preserva orderedCount y otros campos si los hubiera
                maxAllowed: newInt.maxAllowed, // Actualiza la capacidad
                scheduleType: newInt.scheduleType, // Actualiza el tipo de horario
            });
            // Log más específico
            console.log(`[${config.dailyCollection}/${date}] Intervalo ${newInt.start}: Fusionado. Preserva ${matchingOld.orderedCount} pedidos. Nuevo maxAllowed: ${newInt.maxAllowed}.`);
        } else {
            // Si no existe un antiguo o el antiguo no tenía pedidos, usar el nuevo tal cual
            mergedIntervalsMap.set(newInt.start, newInt); // orderedCount será 0
            if (matchingOld) {
                 console.log(`[${config.dailyCollection}/${date}] Intervalo ${newInt.start}: Sobrescrito (antiguo tenía 0 pedidos). Nuevo maxAllowed: ${newInt.maxAllowed}.`);
            } else {
                 console.log(`[${config.dailyCollection}/${date}] Intervalo ${newInt.start}: Nuevo. maxAllowed: ${newInt.maxAllowed}.`);
            }
        }
    });

    // 4. ELIMINADO / COMENTADO - Ya no se añaden intervalos antiguos con pedidos que queden fuera del nuevo horario
    /*
    oldIntervals.forEach(oldInt => {
        // Si el intervalo antiguo tiene pedidos y NO está ya en el mapa de fusionados...
        if (oldInt.orderedCount > 0 && !mergedIntervalsMap.has(oldInt.start)) {
            // ESTE BLOQUE YA NO SE EJECUTA CON EL CAMBIO
            // console.warn(`[${config.dailyCollection}/${date}] Intervalo antiguo ${oldInt.start} con ${oldInt.orderedCount} pedidos YA NO SE MANTIENE.`);
            // mergedIntervalsMap.set(oldInt.start, { ... }); // No se añade
        }
    });
    */
    console.warn(`%c[${config.dailyCollection}/${date}] ADVERTENCIA: Paso 4 omitido. Los intervalos con pedidos fuera del nuevo horario NO serán preservados.`, 'color: red; font-weight: bold;');


    // 5. Convertir el mapa a un array y ordenar por hora de inicio
    // Ahora solo contendrá intervalos que están definidos en el NUEVO horario
    const finalIntervals = Array.from(mergedIntervalsMap.values())
        .sort((a, b) => a.start.localeCompare(b.start)); // Ordenar por hora 'start'

    console.log(`[${config.dailyCollection}/${date}] ${finalIntervals.length} intervalos finales generados (sin preservar externos).`);
    // console.log(`Intervalos finales para ${config.dailyCollection}/${date}:`, finalIntervals); // Descomentar para depuración detallada


    // 6. Guardar (o actualizar) el documento en Firestore
    // Usar set con merge: true sigue siendo útil por si hay otros campos no relacionados con 'intervals'
    await setDoc(docRef, {
        intervals: finalIntervals, // Sobrescribe TODO el array de intervalos
        date: date,
        productType: productType,
        lastGenerated: new Date().toISOString(),
     }, { merge: true }); // merge: true preserva otros campos de nivel superior si existieran

    console.log(`%c[${new Date().toISOString()}] Firestore actualizado para ${config.dailyCollection}/${date} (intervals sobrescrito)`, 'color: green;');

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error FATAL regenerando ${config.dailyCollection} para ${date}:`, error);
    // Considerar lanzar el error o manejarlo de otra forma si es crítico
    // throw error; // Podrías querer lanzar el error para que el proceso que llama se entere
  }
};


// Función de inicialización que se debe ejecutar (ej. al inicio del servidor/función cloud)
// Llama a la versión MODIFICADA de generateAndMergeIntervals
export const initDailyCalendars = async () => {
  try {
    // Considerar usar una librería de manejo de fechas/horas con zonas horarias (ej. date-fns-tz)
    // si la precisión de la zona horaria es crítica. Aquí usamos UTC para la fecha.
    // const today = new Date();
    // const dateString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD (UTC)

    // O usar la hora local del servidor (¡cuidado con dónde se ejecuta!)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`; // Fecha local del servidor

    console.log(`[${new Date().toISOString()}] Iniciando generación de calendarios diarios para fecha local: ${dateString}...`);

    // 1. Determinar si es festivo, víspera o día normal (usando dateString local)
    const holidayDocRef = doc(db, 'holiday_calendar', dateString);
    const holidayDocSnap = await getDoc(holidayDocRef);
    let dayId = null; // Usar null o undefined inicialmente
    let dayType = 'normal'; // Para logging

    if (holidayDocSnap.exists()) {
      const holidayData = holidayDocSnap.data();
      if (holidayData.type === 'holiday') {
        dayId = "8"; // ID para Festivo en 'calendar'
        dayType = 'Festivo';
        console.log(`[${dateString}] Detectado como FESTIVO.`);
      } else if (holidayData.type === 'preHoliday') {
        dayId = "9"; // ID para Víspera de Festivo en 'calendar'
        dayType = 'Víspera de Festivo';
        console.log(`[${dateString}] Detectado como VÍSPERA DE FESTIVO.`);
      } else {
          console.log(`[${dateString}] Encontrado en holiday_calendar pero tipo desconocido: ${holidayData.type}. Tratando como día normal.`);
      }
    }

    // Si no es un día especial del holiday_calendar, usar el día de la semana
    if (dayId === null) {
      const dayOfWeek = now.getDay(); // Domingo: 0, Lunes: 1, ..., Sábado: 6
      // Mapear a los IDs usados en la colección 'calendar' (asumiendo 1=Lunes... 7=Domingo)
      const daysMapping = { 0: "7", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" };
      dayId = daysMapping[dayOfWeek];
      dayType = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek];
      console.log(`[${dateString}] Detectado como día normal: ${dayType} (ID: ${dayId}).`);
    }

    if (!dayId) {
        console.error(`[${dateString}] ¡Error Crítico! No se pudo determinar el ID del día (dayId=${dayId}). Abortando generación.`);
        return; // Salir si no tenemos ID de día
    }

    // 2. Obtener la configuración para ese tipo de día desde la colección "calendar"
    const dayDocRef = doc(db, 'calendar', dayId);
    console.log(`[${dateString}] Buscando configuración para el día ID: ${dayId} (${dayType}) en /calendar/${dayId}`);
    const dayDocSnap = await getDoc(dayDocRef);

    if (dayDocSnap.exists()) {
      const dayConfig = dayDocSnap.data();
      console.log(`[${dateString}] Configuración encontrada para el día ID ${dayId}. Nombre: ${dayConfig.name || '(sin nombre)'}.`);
      // console.log("Configuración detallada:", dayConfig); // Descomentar para depurar

      // 3. Generar/fusionar los calendarios diarios para CADA producto
      // Usará la función generateAndMergeIntervals MODIFICADA
      const generationPromises = Object.keys(productTypesConfig).map(productType =>
        generateAndMergeIntervals(productType, dayConfig, dateString)
      );

      // Esperar a que todas las generaciones terminen
      await Promise.all(generationPromises);

      console.log(`%c[${new Date().toISOString()}] Todos los calendarios diarios generados/actualizados para ${dateString}.`, 'color: green; font-weight: bold;');

    } else {
      // Esto sería un error de configuración si no existe documento para un día (1-9)
      console.error(`[${dateString}] ¡Error Crítico! No se encontró configuración en 'calendar' para el tipo de día ID: ${dayId} (${dayType}). No se generaron calendarios diarios.`);
      // Considerar notificar este error
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fatal durante la inicialización de calendarios diarios:`, error);
    // Considerar notificar este error
  }
};

// Podrías exportar funciones individuales si las necesitas en otros lugares
// export { normalizeTime, generateIntervalsForSchedule, generateAndMergeIntervals, initDailyCalendars };