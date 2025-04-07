// initDailyCalendars.js
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- Configuración específica por producto ---
const productTypesConfig = {
  chicken: { name: 'Pollos', amountField: 'chickenAmount', intervalStep: 15, dailyCollection: 'chicken_calendar_daily', intervalLabel: '(15min)' },
  costilla: { name: 'Costillas', amountField: 'costillaAmount', intervalStep: 30, dailyCollection: 'costilla_calendar_daily', intervalLabel: '(30min)' },
  codillo: { name: 'Codillos', amountField: 'codilloAmount', intervalStep: 60, dailyCollection: 'codillo_calendar_daily', intervalLabel: '(60min)' },
};

// Función para normalizar la hora a formato HH:MM
const normalizeTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes(':')) return timeStr;
  const hour = timeStr.padStart(2, '0');
  return `${hour}:00`;
};

// Función que genera los intervalos según el horario, cantidad máxima y paso definido
const generateIntervalsForSchedule = (start, end, maxAllowed, step, scheduleType) => {
    if (!start || !end || !step) return [];
    try {
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      let current = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      const intervals = [];
  
      while (current + step <= endTime) {
        const startStr = String(Math.floor(current / 60)).padStart(2, '0') + ':' + String(current % 60).padStart(2, '0');
        const endStr = String(Math.floor((current + step) / 60)).padStart(2, '0') + ':' + String((current + step) % 60).padStart(2, '0');
        intervals.push({
          start: startStr,
          end: endStr,
          maxAllowed: maxAllowed || 0,
          orderedCount: 0,
          scheduleType, // Se asigna el tipo de horario
        });
        current += step;
      }
      return intervals;
    } catch (error) {
      console.error("Error generando intervalos:", error);
      return [];
    }
  };
  

// Función que genera y fusiona los intervalos para un producto según la configuración del día y la fecha dada
export const generateAndMergeIntervals = async (productType, dayConfig, date) => {
  const config = productTypesConfig[productType];
  if (!config || !dayConfig || !date) {
    console.error("Faltan datos para generateAndMergeIntervals", { productType, dayConfig, date });
    return;
  }
  console.log(`Regenerando ${config.dailyCollection} para ${date}`);

  const docRef = doc(db, config.dailyCollection, date);

  try {
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : { intervals: [] };
    const oldIntervals = oldData.intervals || [];

    let newIntervals = [];
    const maxAmount = parseInt(dayConfig[config.amountField]) || 0;

    if (dayConfig.morningSchedule?.active && dayConfig.morningSchedule.start && dayConfig.morningSchedule.end) {
    newIntervals = newIntervals.concat(
        generateIntervalsForSchedule(
        normalizeTime(dayConfig.morningSchedule.start),
        normalizeTime(dayConfig.morningSchedule.end),
        maxAmount,
        config.intervalStep,
        'morning'
        )
    );
    }
    if (dayConfig.eveningSchedule?.active && dayConfig.eveningSchedule.start && dayConfig.eveningSchedule.end) {
    newIntervals = newIntervals.concat(
        generateIntervalsForSchedule(
        normalizeTime(dayConfig.eveningSchedule.start),
        normalizeTime(dayConfig.eveningSchedule.end),
        maxAmount,
        config.intervalStep,
        'evening'
        )
    );
    }


    // Fusiona los intervalos nuevos con los anteriores, preservando orderedCount si hay pedidos
    const mergedIntervals = newIntervals.map(newInt => {
      const matchingOld = oldIntervals.find(oldInt => oldInt.start === newInt.start && oldInt.end === newInt.end);
      if (matchingOld && matchingOld.orderedCount > 0) {
         return { ...matchingOld, maxAllowed: newInt.maxAllowed };
      }
      return newInt;
    });

    // Agrega intervalos anteriores con pedidos que ya no están en la nueva lista
    oldIntervals.forEach(oldInt => {
      const existsInNew = newIntervals.some(newInt => newInt.start === oldInt.start && newInt.end === oldInt.end);
      if (!existsInNew && oldInt.orderedCount > 0) {
        mergedIntervals.push({ ...oldInt, maxAllowed: maxAmount });
      }
    });

    mergedIntervals.sort((a, b) => (a.start > b.start ? 1 : -1));
    console.log(`Intervalos finales para ${config.dailyCollection}/${date}:`, mergedIntervals);

    // Guarda (o actualiza) el documento en Firestore con merge: true
    await setDoc(docRef, { intervals: mergedIntervals, date: date, productType: productType }, { merge: true });
    console.log(`Firestore actualizado para ${config.dailyCollection}/${date}`);
  } catch (error) {
    console.error(`Error regenerando ${config.dailyCollection} para ${date}:`, error);
  }
};

// Función de inicialización que se debe ejecutar al inicio de la app
export const initDailyCalendars = async () => {
  try {
    // Usamos la fecha de hoy
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // Determinamos el nombre del día (asumiendo que el id del documento en 'calendar' es el nombre del día)
    const daysOfWeek = ["1", "2", "3", "4", "5", "6", "7","8","9"];
    const dayName = daysOfWeek[today.getDay()];

    // Obtenemos la configuración del día desde la colección 'calendar'
    const dayDocRef = doc(db, 'calendar', dayName);
    const dayDocSnap = await getDoc(dayDocRef);
    if (dayDocSnap.exists()) {
      const dayConfig = dayDocSnap.data();
      // Generamos los calendarios diarios para cada producto configurado
      await Promise.all(
        Object.keys(productTypesConfig).map(productType =>
          generateAndMergeIntervals(productType, dayConfig, dateString)
        )
      );
      console.log("Calendarios diarios generados para " + dateString);
    } else {
      console.warn("No se encontró configuración para el día: " + dayName);
    }
  } catch (error) {
    console.error("Error al inicializar calendarios diarios:", error);
  }
};
