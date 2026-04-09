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

const ChickenOrderContext = createContext();

export const ChickenOrderProvider = ({ children }) => {
  const [dailyCalendar, setDailyCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const today = new Date();
  const dayString = today.toISOString().split('T')[0];
  const dayName = getDayName(today);

  useEffect(() => {
    createDailyCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createDailyCalendar = async () => {
    console.log("AAAA?")
    const docRef = doc(db, 'chicken_calendar_daily', dayString);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setDailyCalendar(docSnap.data());
      setLoading(false);
      return;
    }
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
    let intervals = [];
    if (config.morningSchedule && config.morningSchedule.active) {
      const morningIntervals = generateIntervals(
        normalizeTime(config.morningSchedule.start),
        normalizeTime(config.morningSchedule.end),
        config.chickenAmount
      );
      intervals = intervals.concat(morningIntervals);
    }
    if (config.eveningSchedule && config.eveningSchedule.active) {
      const eveningIntervals = generateIntervals(
        normalizeTime(config.eveningSchedule.start),
        normalizeTime(config.eveningSchedule.end),
        config.chickenAmount
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
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    let startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    while (startTotal < endTotal) {
      const slotStart = minutesToTimeString(startTotal);
      const slotEnd = minutesToTimeString(startTotal + 15);
      slots.push({
        start: slotStart,
        end: slotEnd,
        orderedCount: 0,
        maxAllowed: maxAllowed
      });
      startTotal += 15;
    }
    return slots;
  };

  const placeChickenOrder = async (intervalIndex, orderQuantity) => {
    const docRef = doc(db, 'chicken_calendar_daily', dayString);
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

  const canOrderChicken = (intervalIndex) => {
    if (!dailyCalendar) return false;
    const interval = dailyCalendar.intervals[intervalIndex];
    if (!interval) return false;
    return interval.orderedCount < interval.maxAllowed || (interval.orderedCount === interval.maxAllowed);
  };

  return (
    <ChickenOrderContext.Provider
      value={{
        dailyCalendar,
        loading,
        message,
        placeChickenOrder,
        canOrderChicken,
        refreshDailyCalendar: createDailyCalendar,
      }}
    >
      {children}
    </ChickenOrderContext.Provider>
  );
};

export const useChickenOrder = () => useContext(ChickenOrderContext);
