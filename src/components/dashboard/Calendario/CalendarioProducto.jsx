// Componentes/Calendario/CalendarioProducto.jsx
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useOrder } from '../../Context/OrderProviderContext';

// Define las configuraciones específicas por producto fuera o en un archivo de config
const productConfig = {
  chicken: {
    name: 'Pollos',
    amountField: 'chickenAmount',
    intervalStep: 15, // Frecuencia en minutos
    dailyCollection: 'chicken_calendar_daily',
    intervalLabel: '(15min)',
  },
  costilla: {
    name: 'Costillas',
    amountField: 'costillaAmount',
    intervalStep: 30,
    dailyCollection: 'costilla_calendar_daily',
    intervalLabel: '(30min)', // Ajusta si es necesario
  },
  codillo: {
    name: 'Codillos',
    amountField: 'codilloAmount',
    intervalStep: 60,
    dailyCollection: 'codillo_calendar_daily',
    intervalLabel: '(60min)', // Ajusta si es necesario
  },
};

// El componente genérico recibe el 'productType' como prop
function CalendarioProducto({ productType }) {
  const config = productConfig[productType]; // Obtiene la configuración específica
  const [days, setDays] = useState([]);
  // El contexto ya te da el dailyCalendar correcto según el orderType
  const { dailyCalendar, loading, refreshDailyCalendar, orderType } = useOrder();

  // Asegúrate de que el orderType del contexto coincida con el productType del prop
  // Si no coinciden, podrías mostrar un estado de carga o un mensaje,
  // o confiar en que CalendarTabs siempre establecerá el orderType correcto.
  useEffect(() => {
    if (orderType !== productType) {
      console.warn(`Mismatch: orderType (${orderType}) vs productType (${productType})`);
      // Podrías forzar una actualización del contexto si fuera necesario,
      // pero lo ideal es que CalendarTabs lo gestione.
    }
  }, [orderType, productType]);


  const normalizeTime = (timeStr) => {
      if (!timeStr) return '';
      return timeStr.includes(':') ? timeStr : `${timeStr.padStart(2, '0')}:00`;
  };

  // Usa el 'intervalStep' y 'amountField' de la configuración
  const generateIntervalsForSchedule = (start, end, maxAllowed) => {
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      let current = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      const intervals = [];
      const step = config.intervalStep; // Usa el step de la config

      while (current + step <= endTime) {
          const startStr = String(Math.floor(current / 60)).padStart(2, '0') + ':' + String(current % 60).padStart(2, '0');
          const endStr = String(Math.floor((current + step) / 60)).padStart(2, '0') + ':' + String((current + step) % 60).padStart(2, '0');
          intervals.push({
              start: startStr,
              end: endStr,
              maxAllowed, // Este viene como argumento
              orderedCount: 0,
          });
          current += step;
      }
      return intervals;
  };

  // Fetch de la configuración base (común para todos)
  useEffect(() => {
      const unsubscribe = onSnapshot(collection(db, 'calendar'), (snapshot) => {
          const daysData = snapshot.docs.map((doc) => {
              const data = doc.data();
              // Normalización de tiempos (común)
              if (data.morningSchedule) {
                  data.morningSchedule.start = normalizeTime(data.morningSchedule.start);
                  data.morningSchedule.end = normalizeTime(data.morningSchedule.end);
              }
              if (data.eveningSchedule) {
                  data.eveningSchedule.start = normalizeTime(data.eveningSchedule.start);
                  data.eveningSchedule.end = normalizeTime(data.eveningSchedule.end);
              }
               if (data.workSchedule) {
                  data.workSchedule.start = normalizeTime(data.workSchedule.start);
                  data.workSchedule.end = normalizeTime(data.workSchedule.end);
              }
              return { id: doc.id, ...data };
          });
          console.log('Calendario base (days) actualizado:', daysData);
          setDays(daysData);
      });
      return unsubscribe;
  }, []); // Se ejecuta solo una vez

  // Handler genérico para inputs
  const handleInputChange = (dayId, field, value, scheduleField) => {
    // Si el campo es específico del producto (amountField), usa el valor de config
    const targetField = field === 'productAmount' ? config.amountField : field;

    setDays((prevDays) =>
      prevDays.map((day) => {
        if (day.id === dayId) {
          if (scheduleField) {
            // Manejo de horarios (común)
            return {
              ...day,
              [targetField]: { // Usa targetField que puede ser 'morningSchedule', etc.
                ...day[targetField],
                [scheduleField]: value,
              },
            };
          }
          // Manejo de otros campos (amount, webPreOrder)
           // Asegura que el valor sea numérico para los campos de cantidad
           const finalValue = (targetField === config.amountField || targetField === 'webPreOrder')
             ? parseInt(value) || 0 // Convierte a número, default a 0 si falla
             : value;
          return { ...day, [targetField]: finalValue };
        }
        return day;
      })
    );
  };


  // Handler para checkboxes (común)
  const handleCheckboxChange = (dayId, field, checked) => {
      setDays((prevDays) =>
          prevDays.map((day) => {
              if (day.id === dayId) {
                  // Lógica para activar/desactivar horarios o stock negativo
                  const currentSchedule = day[field] || {}; // Asegura que el objeto exista
                  return {
                      ...day,
                      [field]: {
                          ...currentSchedule,
                          active: checked,
                           // Restablece start/end si es un schedule y se desactiva
                           ...(field.includes('Schedule') && !checked && { start: '', end: '' }),
                           // Mantiene start/end si es un schedule y se activa (usando los valores existentes)
                           ...(field.includes('Schedule') && checked && { start: currentSchedule.start || '', end: currentSchedule.end || '' })
                      },
                      // Si es negativeStock, simplemente actualiza el booleano
                      ...(field === 'negativeStock' && { [field]: checked })
                  };
              }
              return day;
          })
      );
  };

  // Actualiza el calendario diario específico del producto
  const updateDailyCalendarIntervals = async () => {
      try {
        // Validaciones (comunes)
        if (days.length === 0) {
          console.warn("No hay datos en 'days', no se puede actualizar el dailyCalendar.");
          return;
        }
        // Asegúrate que el dailyCalendar del contexto es el correcto para este producto
        if (!dailyCalendar || !dailyCalendar.date || dailyCalendar.productType !== productType) {
            console.warn(`DailyCalendar no disponible o no es para ${productType}. Actual:`, dailyCalendar);
            // Podrías intentar refrescar o mostrar un error.
            // refreshDailyCalendar(); // Llama a la función del contexto para intentar obtener el correcto
            return; // Es mejor esperar a que el contexto proporcione el dailyCalendar correcto
          }

          const docId = dailyCalendar.date;
          const docRef = doc(db, config.dailyCollection, docId); // Usa la colección de la config
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
              console.warn(`El documento ${config.dailyCollection}/${docId} no existe.`);
              return;
          }
          const oldData = docSnap.data();
           if (!oldData.intervals) {
             console.warn("El documento no contiene 'intervals'.", oldData);
              // Podrías inicializarlo si es necesario: oldData.intervals = [];
             return;
           }
          console.log(`DailyCalendar actual para ${productType}:`, oldData);

          // Lógica para encontrar el día y generar intervalos (común, pero usa config)
          const dateObj = new Date(dailyCalendar.date + "T00:00:00");
          const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
          const dayName = daysOfWeek[dateObj.getDay()];
          const correspondingDay = days.find(day => day.name === dayName);

          if (!correspondingDay) {
              console.warn("No se encontró configuración para el día:", dayName);
              return;
          }

          let newIntervals = [];
          // Usa el amountField de la config para obtener la cantidad máxima
          const maxAmount = correspondingDay[config.amountField] || 0;

          if (correspondingDay.morningSchedule?.active) {
              const intervalsMorning = generateIntervalsForSchedule(
                  correspondingDay.morningSchedule.start,
                  correspondingDay.morningSchedule.end,
                  maxAmount // Usa la cantidad del producto actual
              );
              newIntervals = newIntervals.concat(intervalsMorning);
          }
          if (correspondingDay.eveningSchedule?.active) {
              const intervalsEvening = generateIntervalsForSchedule(
                  correspondingDay.eveningSchedule.start,
                  correspondingDay.eveningSchedule.end,
                  maxAmount // Usa la cantidad del producto actual
              );
              newIntervals = newIntervals.concat(intervalsEvening);
          }
          console.log("Nuevos intervalos generados:", newIntervals);

          // Lógica de merge (común)
          const mergedIntervals = newIntervals.map(newInt => {
              const matchingOld = oldData.intervals.find(oldInt => oldInt.start === newInt.start && oldInt.end === newInt.end);
              if (matchingOld && matchingOld.orderedCount > 0) {
                // Conserva el intervalo viejo si tenía pedidos, pero actualiza maxAllowed por si cambió
                console.log("Conservo intervalo con pedidos:", matchingOld, "Nuevo maxAllowed:", newInt.maxAllowed);
                return { ...matchingOld, maxAllowed: newInt.maxAllowed };
              }
               // Si no hay match o el match no tenía pedidos, usa el nuevo intervalo
              return newInt;
          });

          oldData.intervals.forEach(oldInt => {
              const existsInNew = newIntervals.some(newInt => newInt.start === oldInt.start && newInt.end === oldInt.end);
               // Si un intervalo viejo con pedidos no existe en la nueva configuración, se añade igual
              if (!existsInNew && oldInt.orderedCount > 0) {
                  console.log("Agregando intervalo antiguo con pedidos que no existe en la nueva configuración:", oldInt);
                   // Importante: Decide si quieres usar el maxAllowed viejo o ponerle 0 o el nuevo config.amountField
                   // Por seguridad, quizás mantener el original o ponerle el nuevo si aún es válido ese día.
                   // Aquí le ponemos el maxAmount actual como fallback.
                   mergedIntervals.push({ ...oldInt, maxAllowed: maxAmount });
              }
          });
          mergedIntervals.sort((a, b) => (a.start > b.start ? 1 : -1));
          console.log("Intervalos finales a actualizar:", mergedIntervals);

          await updateDoc(docRef, { intervals: mergedIntervals });
          console.log(`DailyCalendar ${productType} actualizado correctamente`);

      } catch (error) {
          console.error(`Error actualizando dailyCalendar para ${productType}:`, error);
      }
  };

  // Actualiza la configuración base Y el calendario diario específico
  const handleUpdate = async () => {
    try {
      // 1. Actualizar la configuración base en 'calendar' (común para todos los productos)
      //    Solo necesitamos hacer esto una vez, no por cada producto si los cambios son comunes.
      //    Idealmente, esta parte podría incluso moverse al componente padre si fuera necesario,
      //    pero dejarla aquí también funciona, aunque se ejecutaría por cada tipo de producto
      //    si se cambian datos comunes como los horarios.
       await Promise.all(
         days.map((day) => {
            const dayRef = doc(db, 'calendar', day.id);
            // Prepara los datos asegurando la normalización y campos correctos
            const updatedData = { ...day };
             // Normaliza y limpia horarios si están inactivos
             ['morningSchedule', 'eveningSchedule', 'workSchedule'].forEach(scheduleKey => {
                 if (updatedData[scheduleKey]) {
                     updatedData[scheduleKey] = {
                         ...updatedData[scheduleKey],
                         start: updatedData[scheduleKey].active ? normalizeTime(updatedData[scheduleKey].start) : '',
                         end: updatedData[scheduleKey].active ? normalizeTime(updatedData[scheduleKey].end) : '',
                     };
                 }
             });
            // Quita el ID antes de guardar
            const { id, ...dataToSave } = updatedData;
            // Asegura que las cantidades sean números
             dataToSave.chickenAmount = parseInt(dataToSave.chickenAmount) || 0;
             dataToSave.costillaAmount = parseInt(dataToSave.costillaAmount) || 0;
             dataToSave.codilloAmount = parseInt(dataToSave.codilloAmount) || 0;
             dataToSave.webPreOrder = parseInt(dataToSave.webPreOrder) || 0;

            console.log("Actualizando /calendar/", day.id, " con:", dataToSave);
            return updateDoc(dayRef, dataToSave);
         })
       );
       console.log("Configuración base 'calendar' actualizada.");

      // 2. Actualizar los intervalos del calendario diario para ESTE producto
      await updateDailyCalendarIntervals();

      alert(`Cambios para ${config.name} guardados`);
      // Refresca el calendario diario del contexto (forzará re-render si es necesario)
      refreshDailyCalendar();

    } catch (error) {
        console.error(`Error actualizando ${config.name}:`, error);
        alert(`Error actualizando datos para ${config.name}`);
    }
  };

  // --- RENDERIZADO (JSX) ---
  // Usa la configuración (config.name, config.amountField, etc.) para renderizar dinámicamente
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md overflow-hidden">
        <div className="text-center py-8 border-b border-gray-100">
          {/* Título dinámico */}
          <h1 className="text-4xl font-bold text-gray-800">Calendario {config.name}</h1>
          <p className="text-gray-600 mt-2">Gestiona el calendario y el modo de venta para {config.name.toLowerCase()}</p>
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Modo venta</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">Día</th>
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    {/* Label dinámico */}
                    {config.name}<br/>{config.intervalLabel}
                  </th>
                  {/* Campos comunes */}
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    Antelación<br/>Venta Web
                  </th>
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    Horario<br/>Mañana
                  </th>
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    Horario<br/>Tarde
                  </th>
                  <th className="py-4 px-2 text-center text-gray-700 font-semibold">
                    Venta en<br/>negativo
                  </th>
                   <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    Aplicar<br/>Traba {/* Asumo que 'Traba' se refiere a workSchedule */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-2 text-gray-700">{day.name}</td>
                    <td className="py-4 px-2">
                      {/* Input dinámico para la cantidad */}
                      <input
                        type="number"
                        value={day[config.amountField] || 0} // Accede usando el amountField de la config
                        onChange={(e) =>
                          // Usamos 'productAmount' como campo genérico en el handler
                          handleInputChange(day.id, 'productAmount', e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    {/* Inputs/Checkboxes comunes */}
                    <td className="py-4 px-2 flex items-center">
                       <input
                         type="number"
                         value={day.webPreOrder || 0}
                         onChange={(e) =>
                           handleInputChange(day.id, 'webPreOrder', e.target.value)
                         }
                         className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                       />
                      <span className="ml-2 text-gray-600">min</span>
                    </td>
                     {/* Horario Mañana */}
                     <td className="py-4 px-2">
                       <div className="flex items-center space-x-1">
                         <input
                           type="checkbox"
                           checked={day.morningSchedule?.active || false}
                           onChange={(e) =>
                             handleCheckboxChange(day.id, 'morningSchedule', e.target.checked)
                           }
                           className="w-4 h-4 text-blue-600"
                         />
                         <input
                           type="time"
                           value={normalizeTime(day.morningSchedule?.start)}
                           disabled={!day.morningSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'morningSchedule', e.target.value, 'start')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center ml-2 disabled:bg-gray-100"
                         />
                         <span className="text-gray-600">-</span>
                         <input
                           type="time"
                           value={normalizeTime(day.morningSchedule?.end)}
                            disabled={!day.morningSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'morningSchedule', e.target.value, 'end')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100"
                         />
                       </div>
                     </td>
                     {/* Horario Tarde */}
                     <td className="py-4 px-2">
                       <div className="flex items-center space-x-1">
                         <input
                           type="checkbox"
                           checked={day.eveningSchedule?.active || false}
                           onChange={(e) =>
                             handleCheckboxChange(day.id, 'eveningSchedule', e.target.checked)
                           }
                           className="w-4 h-4 text-blue-600"
                         />
                         <input
                           type="time"
                           value={normalizeTime(day.eveningSchedule?.start)}
                            disabled={!day.eveningSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'eveningSchedule', e.target.value, 'start')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center ml-2 disabled:bg-gray-100"
                         />
                         <span className="text-gray-600">-</span>
                         <input
                           type="time"
                           value={normalizeTime(day.eveningSchedule?.end)}
                            disabled={!day.eveningSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'eveningSchedule', e.target.value, 'end')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100"
                         />
                       </div>
                     </td>
                     {/* Venta en negativo */}
                    <td className="py-4 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={day.negativeStock || false} // Asegúrate que el campo se llame así en FB
                        onChange={(e) =>
                          handleCheckboxChange(day.id, 'negativeStock', e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    {/* Aplicar Traba (WorkSchedule) */}
                   <td className="py-4 px-2">
                       {/* Asumo que workSchedule no tiene checkbox propio de activación en esta tabla, */}
                       {/* sino que depende de si existe o tiene horas. Ajusta si es necesario */}
                       <div className="flex items-center space-x-1">
                        {/* Podrías añadir un checkbox si quieres activar/desactivar workSchedule aquí */}
                        {/* <input type="checkbox" checked={day.workSchedule?.active || false} ... /> */}
                         <input
                           type="time"
                            // Asume que si no hay start/end, está inactivo o no aplica
                           value={normalizeTime(day.workSchedule?.start)}
                           // Podrías deshabilitarlo si no hay horario definido o si añades un 'active' flag
                           // disabled={!day.workSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'workSchedule', e.target.value, 'start')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                         />
                         <span className="text-gray-600">-</span>
                         <input
                           type="time"
                           value={normalizeTime(day.workSchedule?.end)}
                            // disabled={!day.workSchedule?.active}
                           onChange={(e) =>
                             handleInputChange(day.id, 'workSchedule', e.target.value, 'end')
                           }
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                         />
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 flex justify-end">
            {/* Botón de actualizar */}
            <button
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
              onClick={handleUpdate} // Llama al handler genérico
            >
              <Save className="w-5 h-5 mr-2" />
              Actualizar modo venta {/* El texto es genérico */}
            </button>
          </div>
          {/* Visualización del calendario diario (usa el dailyCalendar del contexto) */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold">Calendario diario de pedidos ({dailyCalendar?.date || 'Selecciona fecha'})</h3>
            {loading ? (
              <p>Cargando calendario diario...</p>
            ) : dailyCalendar && dailyCalendar.productType === productType && dailyCalendar.intervals ? ( // Verifica que el calendario sea del producto correcto
              <table className="w-full mt-4 border-collapse">
                {/* ... cabecera de la tabla ... */}
                 <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-2">Intervalo</th>
                    <th className="py-2 px-2">Pedidos</th>
                    <th className="py-2 px-2">Límite</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyCalendar.intervals.map((interval, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        {interval.start} - {interval.end}
                      </td>
                      <td className="py-2 px-2">{interval.orderedCount}</td>
                      <td className="py-2 px-2">{interval.maxAllowed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <p>No hay información del calendario diario para {config.name} en esta fecha o el tipo no coincide ({orderType} vs {productType}).</p>
            )}
            <button
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              onClick={refreshDailyCalendar} // Usa la función del contexto
            >
              Refrescar calendario diario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarioProducto;