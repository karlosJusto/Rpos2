import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
// Asegúrate que la ruta a tu configuración de Firebase y contexto sea correcta
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useOrder } from '../../Context/OrderProviderContext';

// --- Configuración Específica por Producto ---
const productTypesConfig = {
  chicken: { name: 'Pollos', amountField: 'chickenAmount', intervalStep: 15, dailyCollection: 'chicken_calendar_daily', intervalLabel: '(15min)' },
  costilla: { name: 'Costillas', amountField: 'costillaAmount', intervalStep: 30, dailyCollection: 'costilla_calendar_daily', intervalLabel: '(30min)' }, // Ajusta label si es necesario
  codillo: { name: 'Codillos', amountField: 'codilloAmount', intervalStep: 60, dailyCollection: 'codillo_calendar_daily', intervalLabel: '(60min)' }, // Ajusta label si es necesario
};

function ConfiguracionCalendario() {
  const [days, setDays] = useState([]);
  // Obtiene el calendario diario y la función para refrescar del contexto
  const { dailyCalendar, refreshDailyCalendar } = useOrder();

  // --- Funciones Auxiliares ---
  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    // Asegura que siempre devuelva HH:MM, incluso si la entrada es solo H o HH
    if (timeStr.includes(':')) return timeStr;
    const hour = timeStr.padStart(2, '0');
    return `${hour}:00`;
  };

  const generateIntervalsForSchedule = (start, end, maxAllowed, step) => {
      if (!start || !end || !step) return []; // Evita errores si falta start/end/step
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
                  maxAllowed: maxAllowed || 0, // Asegura que maxAllowed sea un número
                  orderedCount: 0,
              });
              current += step;
          }
          return intervals;
      } catch (error) {
          console.error("Error generando intervalos para:", { start, end, maxAllowed, step }, error);
          return []; // Devuelve array vacío en caso de error
      }
  };

  const generateAndMergeIntervals = async (productType, dayConfig, date) => {
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
            normalizeTime(dayConfig.morningSchedule.start), // Asegura formato HH:MM
            normalizeTime(dayConfig.morningSchedule.end),
            maxAmount,
            config.intervalStep
          )
        );
      }
      if (dayConfig.eveningSchedule?.active && dayConfig.eveningSchedule.start && dayConfig.eveningSchedule.end) {
        newIntervals = newIntervals.concat(
          generateIntervalsForSchedule(
            normalizeTime(dayConfig.eveningSchedule.start),
            normalizeTime(dayConfig.eveningSchedule.end),
            maxAmount,
            config.intervalStep
          )
        );
      }

      const mergedIntervals = newIntervals.map(newInt => {
        const matchingOld = oldIntervals.find(oldInt => oldInt.start === newInt.start && oldInt.end === newInt.end);
        if (matchingOld && matchingOld.orderedCount > 0) {
           return { ...matchingOld, maxAllowed: newInt.maxAllowed };
        }
        return newInt; // Retorna el nuevo si no hay match o el viejo no tenía pedidos
      });

      oldIntervals.forEach(oldInt => {
        const existsInNew = newIntervals.some(newInt => newInt.start === oldInt.start && newInt.end === oldInt.end);
        if (!existsInNew && oldInt.orderedCount > 0) {
          mergedIntervals.push({ ...oldInt, maxAllowed: maxAmount }); // Añade viejos con pedidos que desaparecen
        }
      });

      mergedIntervals.sort((a, b) => (a.start > b.start ? 1 : -1));
      console.log(`Intervalos finales para ${config.dailyCollection}/${date}:`, mergedIntervals);

      // Usa setDoc con merge: true para crear o actualizar el documento diario
      await setDoc(docRef, { intervals: mergedIntervals, date: date, productType: productType }, { merge: true });
      console.log(`Firestore actualizado para ${config.dailyCollection}/${date}`);

    } catch (error) {
      console.error(`Error regenerando ${config.dailyCollection} para ${date}:`, error);
    }
  };


  // --- Carga Inicial de Datos ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'calendar'), (snapshot) => {
      const daysData = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Normalización inicial (aunque se hará de nuevo al guardar)
        ['morningSchedule', 'eveningSchedule', 'workSchedule'].forEach(key => {
            if (data[key]) {
                data[key].start = normalizeTime(data[key].start);
                data[key].end = normalizeTime(data[key].end);
            } else {
                 // Asegura que el objeto exista aunque esté vacío o inactivo
                 data[key] = { active: false, start: '', end: '' };
            }
        });
         // Asegura que las cantidades existan y sean números
         data.chickenAmount = parseInt(data.chickenAmount) || 0;
         data.costillaAmount = parseInt(data.costillaAmount) || 0;
         data.codilloAmount = parseInt(data.codilloAmount) || 0;
         data.webPreOrder = parseInt(data.webPreOrder) || 0;
         data.negativeStock = !!data.negativeStock; // Asegura booleano

        return { id: doc.id, ...data };
      }).sort((a, b) => { // Ordena los días de Lunes a Domingo (o como prefieras)
           const order = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
           return order.indexOf(a.name) - order.indexOf(b.name);
      });
      console.log('Calendario base (days) actualizado:', daysData);
      setDays(daysData);
    });
    return unsubscribe; // Limpia el listener al desmontar
  }, []);

  // --- Handlers para Inputs ---
  const handleInputChange = (dayId, field, value, scheduleField = null) => {
    setDays((prevDays) =>
      prevDays.map((day) => {
        if (day.id === dayId) {
          const dayCopy = { ...day };
          if (scheduleField) { // Actualizando hora de inicio/fin de un horario
            dayCopy[field] = { ...dayCopy[field], [scheduleField]: value };
          } else { // Actualizando un campo directo (amount, webPreOrder)
             // Convertir a número si es un campo numérico
             const numericFields = ['chickenAmount', 'costillaAmount', 'codilloAmount', 'webPreOrder'];
             dayCopy[field] = numericFields.includes(field) ? parseInt(value) || 0 : value;
          }
          return dayCopy;
        }
        return day;
      })
    );
  };

  const handleCheckboxChange = (dayId, field, checked) => {
      setDays((prevDays) =>
          prevDays.map((day) => {
              if (day.id === dayId) {
                  const dayCopy = { ...day };
                  if (field === 'negativeStock') {
                      dayCopy[field] = checked;
                  } else if (field.includes('Schedule')) { // Activando/desactivando un horario
                      dayCopy[field] = {
                          ...(dayCopy[field] || { start: '', end: '' }), // Asegura objeto base
                          active: checked,
                      };
                       // Opcional: Limpiar horas si se desactiva?
                       // if (!checked) {
                       //     dayCopy[field].start = '';
                       //     dayCopy[field].end = '';
                       // }
                  }
                  return dayCopy;
              }
              return day;
          })
      );
  };

  // --- Función Principal de Guardado y Regeneración ---
  const handleUpdateConfig = async () => {
    // Guardar configuración base
    try {
      await Promise.all(
        days.map((day) => {
          const dayRef = doc(db, 'calendar', day.id);
          const dataToSave = { ...day };

          // Normalizar y limpiar datos ANTES de guardar
          ['morningSchedule', 'eveningSchedule', 'workSchedule'].forEach(key => {
            if (dataToSave[key]) {
               dataToSave[key] = {
                 ...dataToSave[key],
                 active: !!dataToSave[key].active, // Asegura booleano
                 start: dataToSave[key].active ? normalizeTime(dataToSave[key].start) : '',
                 end: dataToSave[key].active ? normalizeTime(dataToSave[key].end) : '',
               };
            } else {
               dataToSave[key] = { active: false, start: '', end: '' }; // Asegura objeto si no existe
            }
          });
           // Asegura cantidades numéricas y booleano negativeStock
          dataToSave.chickenAmount = parseInt(dataToSave.chickenAmount) || 0;
          dataToSave.costillaAmount = parseInt(dataToSave.costillaAmount) || 0;
          dataToSave.codilloAmount = parseInt(dataToSave.codilloAmount) || 0;
          dataToSave.webPreOrder = parseInt(dataToSave.webPreOrder) || 0;
          dataToSave.negativeStock = !!dataToSave.negativeStock;

          delete dataToSave.id; // No guardar el id dentro del documento
          console.log("Guardando en /calendar/", day.id, dataToSave);
          return updateDoc(dayRef, dataToSave);
        })
      );
      console.log("Configuración base 'calendar' actualizada.");
      alert('Configuración general y de productos guardada.');

      // Regenerar intervalos diarios para la fecha actual visible
      if (dailyCalendar?.date) {
        console.log(`Regenerando intervalos diarios para la fecha: ${dailyCalendar.date}`);
        const dateObj = new Date(dailyCalendar.date + "T00:00:00"); // Cuidado con zonas horarias si es relevante
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const dayName = daysOfWeek[dateObj.getDay()];
        // Usa los datos recién actualizados en el estado 'days'
        const relevantDayConfig = days.find(d => d.name === dayName);

        if (relevantDayConfig) {
          await Promise.all(
            Object.keys(productTypesConfig).map(type =>
              generateAndMergeIntervals(type, relevantDayConfig, dailyCalendar.date)
            )
          );
          console.log(`Regeneración completada para ${dailyCalendar.date}`);
          // Refresca el contexto para actualizar la vista diaria
          refreshDailyCalendar();
        } else {
          console.warn(`No se encontró la configuración para el día ${dayName} para regenerar ${dailyCalendar.date}`);
        }
      } else {
        console.warn("No hay fecha en dailyCalendar, no se pueden regenerar los intervalos diarios.");
      }

    } catch (error) {
      console.error('Error al actualizar configuración y/o regenerar intervalos:', error);
      alert('Error al guardar cambios.');
    }
  };

  // --- RENDERIZADO ---
  return (
    <div className="w-full max-w-7xl bg-white rounded-xl shadow-md overflow-hidden mb-8">
      {/* Header */}
      <div className="text-center py-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800">Configuración Semanal General</h1>
        <p className="text-gray-600 mt-1">Define horarios, cantidades y reglas para cada día.</p>
      </div>

      {/* Contenido principal */}
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Modo Venta Semanal</h2>
        {/* Tabla de configuración */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="py-3 px-2 text-left text-gray-600 font-semibold sticky left-0 bg-gray-50 z-10">Día</th>
                {/* Columnas de Cantidad por Producto */}
                {Object.entries(productTypesConfig).map(([key, config]) => (
                   <th key={key} className="py-3 px-2 text-center text-gray-600 font-semibold whitespace-nowrap">{config.name}<br/>{config.intervalLabel}</th>
                ))}
                {/* Columnas Generales */}
                <th className="py-3 px-2 text-center text-gray-600 font-semibold whitespace-nowrap">Antelación<br/>Venta Web</th>
                <th className="py-3 px-2 text-center text-gray-600 font-semibold">Horario Mañana</th>
                <th className="py-3 px-2 text-center text-gray-600 font-semibold">Horario Tarde</th>
                <th className="py-3 px-2 text-center text-gray-600 font-semibold whitespace-nowrap">Venta en<br/>Negativo</th>
                <th className="py-3 px-2 text-center text-gray-600 font-semibold">Aplicar Traba<br/>(Horario Trabajo)</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {/* Día (Sticky) */}
                  <td className="py-3 px-2 text-gray-700 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10">{day.name}</td>

                  {/* Inputs de Cantidad */}
                  {Object.entries(productTypesConfig).map(([key, config]) => (
                    <td key={key} className="py-3 px-2 text-center">
                      <input
                        type="number"
                        value={day[config.amountField] || 0}
                        onChange={(e) => handleInputChange(day.id, config.amountField, e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </td>
                  ))}

                  {/* Input Antelación Web */}
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center">
                       <input
                         type="number"
                         value={day.webPreOrder || 0}
                         onChange={(e) => handleInputChange(day.id, 'webPreOrder', e.target.value)}
                         className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         min="0"
                       />
                      <span className="ml-1 text-gray-600 text-xs">min</span>
                    </div>
                  </td>

                  {/* Input Horario Mañana */}
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center space-x-1">
                      <input
                         type="checkbox"
                         title="Activar/Desactivar Horario Mañana"
                         checked={day.morningSchedule?.active || false}
                         onChange={(e) => handleCheckboxChange(day.id, 'morningSchedule', e.target.checked)}
                         className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                       />
                       <input
                         type="time"
                         value={day.morningSchedule?.start || ''}
                         disabled={!day.morningSchedule?.active}
                         onChange={(e) => handleInputChange(day.id, 'morningSchedule', e.target.value, 'start')}
                         className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                       />
                       <span className="text-gray-500">-</span>
                       <input
                         type="time"
                         value={day.morningSchedule?.end || ''}
                         disabled={!day.morningSchedule?.active}
                         onChange={(e) => handleInputChange(day.id, 'morningSchedule', e.target.value, 'end')}
                         className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                       />
                    </div>
                  </td>

                  {/* Input Horario Tarde */}
                  <td className="py-3 px-2">
                     <div className="flex items-center justify-center space-x-1">
                       <input
                         type="checkbox"
                         title="Activar/Desactivar Horario Tarde"
                         checked={day.eveningSchedule?.active || false}
                         onChange={(e) => handleCheckboxChange(day.id, 'eveningSchedule', e.target.checked)}
                         className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                       />
                       <input
                         type="time"
                         value={day.eveningSchedule?.start || ''}
                         disabled={!day.eveningSchedule?.active}
                         onChange={(e) => handleInputChange(day.id, 'eveningSchedule', e.target.value, 'start')}
                         className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                       />
                       <span className="text-gray-500">-</span>
                       <input
                         type="time"
                         value={day.eveningSchedule?.end || ''}
                         disabled={!day.eveningSchedule?.active}
                         onChange={(e) => handleInputChange(day.id, 'eveningSchedule', e.target.value, 'end')}
                         className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                       />
                    </div>
                  </td>

                   {/* Checkbox Venta Negativo */}
                   <td className="py-3 px-2 text-center">
                     <input
                       type="checkbox"
                       title="Permitir Venta en Negativo"
                       checked={day.negativeStock || false}
                       onChange={(e) => handleCheckboxChange(day.id, 'negativeStock', e.target.checked)}
                       className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                     />
                   </td>

                  {/* Input Horario Trabajo (Traba) */}
                  {/* Asumiendo que 'Traba' es el workSchedule y se activa/desactiva junto con sus horas */}
                  <td className="py-3 px-2">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Podrías añadir un checkbox si workSchedule tuviera su propio 'active' */}
                        {/* <input type="checkbox" checked={day.workSchedule?.active || false} ... /> */}
                         <input
                           type="time"
                           title="Inicio Horario Trabajo (Traba)"
                           value={day.workSchedule?.start || ''}
                           // Podrías deshabilitarlo si no hay horas o si añades un 'active' flag
                           onChange={(e) => handleInputChange(day.id, 'workSchedule', e.target.value, 'start')}
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         />
                         <span className="text-gray-500">-</span>
                         <input
                           type="time"
                           title="Fin Horario Trabajo (Traba)"
                           value={day.workSchedule?.end || ''}
                           onChange={(e) => handleInputChange(day.id, 'workSchedule', e.target.value, 'end')}
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         />
                       </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón para actualizar la configuración */}
        <div className="mt-6 flex justify-end">
          <button
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow hover:shadow-md transition-colors duration-200"
            onClick={handleUpdateConfig} // Llama a la función principal de guardado
          >
            <Save className="w-5 h-5 mr-2" />
            Guardar Configuración y Regenerar Día Actual
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionCalendario;