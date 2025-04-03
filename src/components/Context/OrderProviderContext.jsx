// OrderProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  // Estado para definir el tipo de pedido. Valores: 'chicken', 'costilla' o 'codillo'
  const [orderType, setOrderType] = useState('chicken');
  const [dailyCalendar, setDailyCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fecha de hoy y nombre del día en español
  const today = new Date();
  const dayString = today.toISOString().split('T')[0];
  const dayName = getDayName(today);

  // Funciones para determinar la colección y la cantidad máxima permitida según el orderType
  const getCollectionName = () => {
    switch (orderType) {
      case 'chicken':
        return 'chicken_calendar_daily';
      case 'costilla':
        return 'costilla_calendar_daily';
      case 'codillo':
        return 'codillo_calendar_daily';
      default:
        return 'chicken_calendar_daily';
    }
  };

  const getMaxAllowedFromConfig = (config) => {
    switch (orderType) {
      case 'chicken':
        return config.chickenAmount;
      case 'costilla':
        return config.costillaAmount || config.chickenAmount;
      case 'codillo':
        return config.codilloAmount || config.chickenAmount;
      default:
        return config.chickenAmount;
    }
  };

  // Crea (o lee) el documento diario según el orderType actual
  const createDailyCalendar = async () => {
    const collectionName = getCollectionName();
    const docRef = doc(db, collectionName, dayString);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setDailyCalendar(docSnap.data());
      setLoading(false);
      return;
    }
    // Buscamos la configuración en la colección "calendar"
    const calendarQuerySnapshot = await getDocs(collection(db, 'calendar'));
    let config = null;
    calendarQuerySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name === dayName) {
        config = data;
      }
    });
    if (!config) {
      setMessage(`No se encontró configuración para el día ${dayName}`);
      setLoading(false);
      return;
    }
    // Genera los intervalos para los turnos activos
    let intervals = [];
    if (config.morningSchedule && config.morningSchedule.active) {
      const morningIntervals = generateIntervals(
        normalizeTime(config.morningSchedule.start),
        normalizeTime(config.morningSchedule.end),
        getMaxAllowedFromConfig(config)
      );
      intervals = intervals.concat(morningIntervals);
    }
    if (config.eveningSchedule && config.eveningSchedule.active) {
      const eveningIntervals = generateIntervals(
        normalizeTime(config.eveningSchedule.start),
        normalizeTime(config.eveningSchedule.end),
        getMaxAllowedFromConfig(config)
      );
      intervals = intervals.concat(eveningIntervals);
    }
    const newDoc = {
      date: dayString,
      intervals,
      createdAt: new Date()
    };
    await setDoc(docRef, newDoc);
    setDailyCalendar(newDoc);
    setLoading(false);
  };

  // UTILIDADES
  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.includes(':') ? timeStr : `${timeStr.padStart(2, '0')}:00`;
  };

  const minutesToTimeString = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  function getDayName(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }

  const generateIntervals = (startTime, endTime, maxAllowed) => {
    let step = 15;

    //En caso de cambiar horas se modificaria el step con los minutos correspondientes TODO
    if (orderType === 'costilla') {
      step = 30;
    } else if (orderType === 'codillo') {
      step = 60;
    }
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    let startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    while (startTotal + step <= endTotal) {
      const slotStart = minutesToTimeString(startTotal);
      const slotEnd = minutesToTimeString(startTotal + step);
      slots.push({
        start: slotStart,
        end: slotEnd,
        orderedCount: 0,
        maxAllowed: maxAllowed
      });
      startTotal += step;
    }
    return slots;
  };
  

  // Función genérica para realizar un pedido en un intervalo concreto
  const placeOrder = async (intervalIndex, orderQuantity) => {
    const collectionName = getCollectionName();
    const docRef = doc(db, collectionName, dayString);
    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('No se encontró el calendario para hoy.');
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        const interval = intervals[intervalIndex];
        let newOrderedCount = interval.orderedCount;
        // Se permite sumar la cantidad si no se excede el límite
        if (newOrderedCount < interval.maxAllowed) {
          newOrderedCount += orderQuantity;
          if (newOrderedCount > interval.maxAllowed) {
            newOrderedCount = interval.maxAllowed + 1;
          }
        } else {
          if (interval.orderedCount === interval.maxAllowed && orderQuantity === 1) {
            newOrderedCount += 1;
          } else {
            throw new Error('Límite alcanzado para este intervalo. Solo se permite pedir 1 adicional.');
          }
        }
        intervals[intervalIndex].orderedCount = newOrderedCount;
        transaction.update(docRef, { intervals });
      });
      const updatedDoc = await getDoc(docRef);
      setDailyCalendar(updatedDoc.data());
      return { success: true, message: 'Pedido realizado correctamente.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const canOrder = (intervalIndex) => {
    if (!dailyCalendar) return false;
    const interval = dailyCalendar.intervals[intervalIndex];
    if (!interval) return false;
    return interval.orderedCount < interval.maxAllowed || interval.orderedCount === interval.maxAllowed;
  };

  // Reejecuta la creación del dailyCalendar cuando cambia el orderType
  useEffect(() => {
    createDailyCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  return (
    <OrderContext.Provider
      value={{
        dailyCalendar,
        loading,
        message,
        placeOrder,
        canOrder,
        refreshDailyCalendar: createDailyCalendar,
        orderType,
        setOrderType
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);
