import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
// Asegúrate que la ruta a tu configuración de Firebase y contexto sea correcta
// AÑADE setDoc a los imports de firestore
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore'; // Cambiado updateDoc por setDoc
// Importamos useOrder solo si necesitamos refreshDailyCalendar para refrescar OTRAS vistas
import { useOrder } from '../../Context/OrderProviderContext';

// --- Configuración Específica por Producto (para la UI) ---
// Mantenemos esto aquí para construir la tabla correctamente
const productTypesConfig = {
  chicken: { name: 'Pollos', amountField: 'chickenAmount', intervalLabel: '(15min)' },
  costilla: { name: 'Costillas', amountField: 'costillaAmount', intervalLabel: '(15min)' }, // Ajustado label
  codillo: { name: 'Codillos', amountField: 'codilloAmount', intervalLabel: '(15min)' }, // Ajustado label
};

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
         data.webPreOrder = parseInt(data.webPreOrder) || 0;
         data.negativeStock = !!data.negativeStock; // Asegura booleano

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
              webPreOrder: parseInt(day.webPreOrder) || 0,
              negativeStock: !!day.negativeStock,
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
              workSchedule: {
                 // Asumiendo que workSchedule siempre guarda horas si existen, sin 'active' flag propio.
                 // Si necesitas que workSchedule también pueda estar inactivo, añade un checkbox y un flag 'active'
                 start: day.workSchedule?.start ? normalizeTime(day.workSchedule.start) : '',
                 end: day.workSchedule?.end ? normalizeTime(day.workSchedule.end) : '',
              }
              // ¡Importante! No incluimos el 'id' de React dentro del documento Firestore
          };

          console.log(`Guardando (setDoc) en /calendar/${day.id}`, dataToSave);
          // Usamos setDoc para sobrescribir completamente el documento
          return setDoc(dayRef, dataToSave); // <--- USA SETDOC PARA SOBRESCRIBIR
        })
      );
      console.log("Configuración base 'calendar' actualizada (sobrescrita) correctamente.");
      alert('Configuración semanal base guardada (sobrescrita).');

      // Opcional: Refrescar otras vistas si es necesario
      if (refreshDailyCalendar) {
          console.log("Llamando a refreshDailyCalendar para posible actualización de vistas...");
          refreshDailyCalendar();
      }

    } catch (error) {
      console.error('Error al actualizar (setDoc) la configuración base en Firestore:', error);
      alert('Error al guardar la configuración semanal.');
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
                       className="w-4 h-4 text-yellow-500 focus:ring-yellow-500"
                     />
                   </td>

                  {/* Input Horario Trabajo (Traba) */}
                  {/* Asumiendo que 'Traba' es el workSchedule */}
                  <td className="py-3 px-2">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Si workSchedule necesita activarse/desactivarse, añade un checkbox aquí y deshabilita inputs */}
                         <input
                           type="time"
                           title="Inicio Horario Trabajo (Traba)"
                           value={day.workSchedule?.start || ''}
                           // Podrías deshabilitarlo si añades un 'active' flag y está inactivo
                           onChange={(e) => handleInputChange(day.id, 'workSchedule', e.target.value, 'start')}
                           className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         />
                         <span className="text-gray-500">-</span>
                         <input
                           type="time"
                           title="Fin Horario Trabajo (Traba)"
                           value={day.workSchedule?.end || ''}
                           // Podrías deshabilitarlo si añades un 'active' flag y está inactivo
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