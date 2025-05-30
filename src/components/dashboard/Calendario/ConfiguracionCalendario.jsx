import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
// Asegúrate que la ruta a tu configuración de Firebase y contexto sea correcta
// AÑADE setDoc a los imports de firestore
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore'; // Import getDoc
// Importamos useOrder solo si necesitamos refreshDailyCalendar para refrescar OTRAS vistas
import { useOrder } from '../../Context/OrderProviderContext';
import {
  productTypesConfig as productTypesConfigFromInit, // Alias to avoid conflict with local UI config
  generateAndMergeIntervals,
  ensureDailySaladDocument
} from './initDailyCalendars'; // Ajusta la ruta si es necesario
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// --- Configuración Específica por Producto (para la UI) ---
// Mantenemos esto aquí para construir la tabla correctamente
const productTypesConfig = {
  chicken: { name: 'Pollos', amountField: 'chickenAmount', intervalLabel: '(15min)' },
  costilla: { name: 'Costillas', amountField: 'costillaAmount', intervalLabel: '(15min)' }, // Ajustado label
  codillo: { name: 'Codillos', amountField: 'codilloAmount', intervalLabel: '(15min)' }, // Ajustado label
};

// Extender dayjs para la lógica de regeneración de calendarios
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault("Europe/Madrid"); // O tu zona horaria relevante

function ConfiguracionCalendario() {
  const [days, setDays] = useState([]);
  // Mantenemos refreshDailyCalendar si queremos que al guardar aquí,
  // se refresque la vista del calendario diario (aunque los intervalos
  // no se regeneren desde este componente). Si no es necesario, puedes quitarlo.
  const { refreshDailyCalendar } = useOrder();

  // --- Funciones Auxiliares ---
  // Normaliza la hora a HH:MM
  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    // Si ya tiene dos puntos, asumimos que es HH:MM
    if (timeStr.includes(':')) {
        // Opcional: Validar/rellenar ceros si es necesario, ej: "9:5" -> "09:05"
        const parts = timeStr.split(':');
        const hour = parts[0].padStart(2,'0');
        const minute = parts[1] ? parts[1].padStart(2,'0') : '00';
        return `${hour}:${minute}`;
    }
    // Si no tiene dos puntos, asumimos que es solo la hora y añadimos :00
    const hour = timeStr.padStart(2, '0');
    return `${hour}:00`;
  };

  // --- Carga Inicial de Datos ---
  // (Sigue escuchando 'calendar')
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'calendar'), (snapshot) => {
      const daysData = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Normalización y asegurar estructura al cargar
        ['morningSchedule', 'eveningSchedule', 'workSchedule'].forEach(key => {
            if (data[key]) {
                data[key] = {
                    active: !!data[key].active, // Asegura booleano
                    start: normalizeTime(data[key].start),
                    end: normalizeTime(data[key].end),
                };
            } else {
                 // Asegura que el objeto exista aunque esté vacío o inactivo
                 data[key] = { active: false, start: '', end: '' };
            }
        });
         // Asegura que las cantidades existan y sean números
         data.chickenAmount = parseInt(data.chickenAmount) || 0;
         data.costillaAmount = parseInt(data.costillaAmount) || 0;
         data.codilloAmount = parseInt(data.codilloAmount) || 0;
        return { id: doc.id, ...data };
      }).sort((a, b) => { // Ordena los días
           const order = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo", "Festivo", "Vispera"]; // Ajusta si tus IDs son distintos (8 y 9?)
           // Mapea IDs 8 y 9 a nombres para ordenar si es necesario
           const nameA = a.id === "8" ? "Festivo" : a.id === "9" ? "Vispera" : a.name;
           const nameB = b.id === "8" ? "Festivo" : b.id === "9" ? "Vispera" : b.name;
           return order.indexOf(nameA) - order.indexOf(nameB);
      });
      console.log('Calendario base (days) actualizado desde Firestore:', daysData);
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
            // Asegura que el objeto de horario exista antes de actualizar
            dayCopy[field] = { ...(dayCopy[field] || { active: false, start: '', end: '' }), [scheduleField]: value };
          } else { // Actualizando un campo directo (amount, webPreOrder)
             // Convertir a número si es un campo numérico
             const numericFields = ['chickenAmount', 'costillaAmount', 'codilloAmount'];
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
                  if (field.includes('Schedule')) { // Activando/desactivando un horario
                      dayCopy[field] = {
                          ...(dayCopy[field] || { start: '', end: '' }), // Asegura objeto base
                          active: checked,
                      };
                       // Opcional: Limpiar horas si se desactiva? (Actualmente no lo hace)
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

  // --- Función de Guardado (MODIFICADA para usar setDoc) ---
  // Guarda/Sobrescribe la configuración base en la colección 'calendar'
  const handleUpdateBaseConfig = async () => {
    console.log("Iniciando guardado (con setDoc) de configuración semanal base...");
    try {
      await Promise.all(
        days.map((day) => {
          const dayRef = doc(db, 'calendar', day.id);
          // Prepara los datos asegurando la estructura y normalización ANTES de guardar
          // Es crucial que dataToSave contenga TODOS los campos que quieres en el documento final
          const dataToSave = {
              name: day.name || '', // Asegura que siempre haya un nombre
              chickenAmount: parseInt(day.chickenAmount) || 0,
              costillaAmount: parseInt(day.costillaAmount) || 0,
              codilloAmount: parseInt(day.codilloAmount) || 0,
              morningSchedule: {
                  active: !!day.morningSchedule?.active,
                  // Solo guarda horas si está activo
                  start: (!!day.morningSchedule?.active && day.morningSchedule?.start) ? normalizeTime(day.morningSchedule.start) : '',
                  end: (!!day.morningSchedule?.active && day.morningSchedule?.end) ? normalizeTime(day.morningSchedule.end) : '',
              },
              eveningSchedule: {
                  active: !!day.eveningSchedule?.active,
                  // Solo guarda horas si está activo
                  start: (!!day.eveningSchedule?.active && day.eveningSchedule?.start) ? normalizeTime(day.eveningSchedule.start) : '',
                  end: (!!day.eveningSchedule?.active && day.eveningSchedule?.end) ? normalizeTime(day.eveningSchedule.end) : '',
              },
              // ¡Importante! No incluimos el 'id' de React dentro del documento Firestore
          };

          console.log(`Guardando (setDoc) en /calendar/${day.id}`, dataToSave);
          // Usamos setDoc para sobrescribir completamente el documento
          return setDoc(dayRef, dataToSave); // <--- USA SETDOC PARA SOBRESCRIBIR
        })
      );
      console.log("Configuración base 'calendar' actualizada (sobrescrita) correctamente.");
      alert('Configuración semanal base guardada (sobrescrita).');

      // --- PASO 2: Regenerar calendarios diarios para los próximos 7 días ---
      console.log("%cIniciando regeneración de calendarios diarios para los próximos 7 días...", "color: blue; font-weight: bold;");
      const today = dayjs().tz("Europe/Madrid");

      for (let i = 0; i < 7; i++) {
        const currentDateInLoop = today.add(i, 'day');
        const dateString = currentDateInLoop.format('YYYY-MM-DD');
        console.log(`%cProcesando regeneración para fecha: ${dateString} (Día ${i + 1}/7)`, 'color: cyan;');

        // Determinar tipo de día y obtener configuración
        const holidayDocRef = doc(db, 'holiday_calendar', dateString);
        const holidayDocSnap = await getDoc(holidayDocRef);
        let dayId = null;

        if (holidayDocSnap.exists()) {
          const holidayData = holidayDocSnap.data();
          if (holidayData.type === 'holiday') { dayId = "8"; }
          else if (holidayData.type === 'preHoliday') { dayId = "9"; }
        }

        if (dayId === null) {
          const dayOfWeek = currentDateInLoop.day(); // 0 for Sunday, 1 for Monday...
          const daysMapping = { 0: "7", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" };
          dayId = daysMapping[dayOfWeek];
        }

        if (!dayId) {
          console.error(`[${dateString}] ¡Error! No se pudo determinar el ID del día. Saltando regeneración para esta fecha.`);
          continue;
        }

        const dayConfigRef = doc(db, 'calendar', dayId);
        const dayConfigSnap = await getDoc(dayConfigRef);

        if (!dayConfigSnap.exists()) {
          console.error(`[${dateString}] ¡Error! No se encontró configuración en 'calendar' para el día ID: ${dayId} (recién guardada). No se pueden regenerar calendarios para esta fecha.`);
          continue;
        }
        const fetchedDayConfig = dayConfigSnap.data();
        console.log(`[${dateString}] Configuración para ID ${dayId} obtenida. Regenerando calendarios de productos y ensaladas...`);

        const dailyTasks = [];
        Object.keys(productTypesConfigFromInit).forEach(productType => {
          dailyTasks.push(generateAndMergeIntervals(productType, fetchedDayConfig, dateString));
        });
        dailyTasks.push(ensureDailySaladDocument(dateString)); // Asegurar documento de ensaladas

        await Promise.all(dailyTasks);
        console.log(`%c[${dateString}] Todos los calendarios (productos y ensaladas) regenerados/verificados.`, 'color: green;');
      }
      console.log("%cRegeneración de calendarios diarios para los próximos 7 días completada.", "color: blue; font-weight: bold;");
      alert('Regeneración de calendarios diarios para los próximos 7 días completada.');

      // Opcional: Refrescar otras vistas si es necesario
      if (refreshDailyCalendar) {
          console.log("Llamando a refreshDailyCalendar para posible actualización de vistas...");
          refreshDailyCalendar();
      }

    } catch (error) {
      console.error('Error al actualizar (setDoc) la configuración base en Firestore:', error);
      alert(`Error al guardar la configuración semanal o regenerar diarios: ${error.message}`);
    }
  };


  // --- RENDERIZADO ---
  return (
    <div className="w-full  bg-white rounded-xl shadow-md -mt-8 mb-8">
      {/* Header */}
      <div className="text-center py-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800">Configuración Semanal General</h1>
        <p className="text-gray-600 mt-1">Define horarios, cantidades y reglas base para cada tipo de día.</p>
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
                <th className="py-3 px-2 text-center text-gray-600 font-semibold">Horario Mañana</th>
                <th className="py-3 px-2 text-center text-gray-600 font-semibold">Horario Tarde</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {/* Día (Sticky) */}
                  <td className="py-3 px-2 text-gray-700 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10">{day.name || `Día ID: ${day.id}`}</td>

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

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón para actualizar la configuración base */}
        <div className="mt-6 flex justify-end">
          <button
            className="flex items-center bg-yellow-500 hover:bg-yellow-600 font-nunito text-white px-5 py-2 rounded-lg shadow hover:shadow-md transition-colors duration-200"
            onClick={handleUpdateBaseConfig} // Llama a la función que ahora usa setDoc
          >
            <Save className="w-5 h-5 mr-2" />
            Guardar Configuración Semanal
          </button>
        </div>
      </div> {/* Cierre de div p-4 md:p-6 */}
    </div> /* Cierre de div principal w-full */
  );
}

export default ConfiguracionCalendario;