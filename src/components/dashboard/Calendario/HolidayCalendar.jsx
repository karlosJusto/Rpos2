import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { db } from '../../firebase/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

const HolidayCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDays, setMarkedDays] = useState({});

  // Suscribirse a la colección "holiday_calendar" para mantener actualizados los días marcados.
  useEffect(() => {
    const colRef = collection(db, 'holiday_calendar');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const holidays = {};
      snapshot.docs.forEach((docSnap) => {
        holidays[docSnap.id] = docSnap.data();
      });
      setMarkedDays(holidays);
    });
    return () => unsubscribe();
  }, []);

  // Formatear fecha a "YYYY-MM-DD"
  const formatDate = (date) => date.toISOString().split('T')[0];

  // Lógica para marcar o limpiar un día
  const handleDayClick = async (date) => {
    const dateString = formatDate(date);
    const docRef = doc(db, 'holiday_calendar', dateString);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // Si ya existe el documento:
        const currentData = docSnap.data();
        if (currentData.type === 'holiday' && !currentData.automatic) {
          // Si es festivo manual, al hacer clic se limpia (se elimina)
          await deleteDoc(docRef);
          console.log(`Se eliminó la marca manual para ${dateString}`);
          // Además, si el día anterior está marcado automáticamente, lo eliminamos
          const prevDate = new Date(date);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateString = formatDate(prevDate);
          const prevDocRef = doc(db, 'holiday_calendar', prevDateString);
          const prevDocSnap = await getDoc(prevDocRef);
          if (prevDocSnap.exists() && prevDocSnap.data().type === 'preHoliday' && prevDocSnap.data().automatic) {
            await deleteDoc(prevDocRef);
            console.log(`Se eliminó la marca automática de víspera para ${prevDateString}`);
          }
        } else {
          // Si ya está marcado pero de forma automática (preHoliday), lo actualizamos a festivo manual.
          await setDoc(docRef, { date: dateString, type: 'holiday', automatic: false });
          console.log(`Se actualizó ${dateString} a festivo manual`);
          // Y se asegura marcar el día anterior automáticamente (si no existe o es automático)
          const prevDate = new Date(date);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateString = formatDate(prevDate);
          const prevDocRef = doc(db, 'holiday_calendar', prevDateString);
          const prevDocSnap = await getDoc(prevDocRef);
          if (!prevDocSnap.exists()) {
            await setDoc(prevDocRef, { date: prevDateString, type: 'preHoliday', automatic: true });
            console.log(`Se marcó ${prevDateString} como víspera de festivo automáticamente`);
          }
        }
      } else {
        // Si no existe, se marca el día como festivo manual.
        await setDoc(docRef, { date: dateString, type: 'holiday', automatic: false });
        console.log(`Se marcó ${dateString} como festivo manual`);
        // Marcar automáticamente el día anterior como preHoliday si no existe o si ya está automático.
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateString = formatDate(prevDate);
        const prevDocRef = doc(db, 'holiday_calendar', prevDateString);
        const prevDocSnap = await getDoc(prevDocRef);
        if (!prevDocSnap.exists()) {
          await setDoc(prevDocRef, { date: prevDateString, type: 'preHoliday', automatic: true });
          console.log(`Se marcó ${prevDateString} como víspera de festivo automáticamente`);
        }
      }
    } catch (error) {
      console.error("Error al actualizar la colección holiday_calendar:", error);
    }
  };

  // Personalización de celdas según la marca
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = formatDate(date);
      if (markedDays[dateString]) {
        if (markedDays[dateString].type === 'holiday') {
          return 'bg-red-500 text-white rounded-full'; // Festivo: fondo rojo
        } else if (markedDays[dateString].type === 'preHoliday') {
          return 'bg-yellow-500 text-white rounded-full'; // Víspera de festivo: fondo amarillo
        }
      }
    }
    return null;
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold text-center mb-4">Calendario de Festivos</h2>
      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        onClickDay={handleDayClick}
        tileClassName={tileClassName}
      />
    </div>
  );
};

export default HolidayCalendar;
