import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronDown, Save } from 'lucide-react';
import { db } from '../firebase/firebase'; // Asegúrate de configurar Firebase
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

function CalendarioPollos() {
  const [days, setDays] = useState([]);

  // Función para normalizar el formato de hora a "HH:MM"
  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.includes(':') ? timeStr : `${timeStr.padStart(2, '0')}:00`;
  };

  // Escucha en tiempo real los cambios de la colección "calendar" y normaliza los horarios
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'calendar'), (snapshot) => {
      const daysData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Normalizar horarios de mañana
        if (data.morningSchedule) {
          data.morningSchedule.start = normalizeTime(data.morningSchedule.start);
          data.morningSchedule.end = normalizeTime(data.morningSchedule.end);
        }
        // Normalizar horarios de tarde
        if (data.eveningSchedule) {
          data.eveningSchedule.start = normalizeTime(data.eveningSchedule.start);
          data.eveningSchedule.end = normalizeTime(data.eveningSchedule.end);
        }
        // Normalizar horario de trabajo (si aplica)
        if (data.workSchedule) {
          data.workSchedule.start = normalizeTime(data.workSchedule.start);
          data.workSchedule.end = normalizeTime(data.workSchedule.end);
        }
        return { id: doc.id, ...data };
      });
      setDays(daysData);
    });
    return unsubscribe;
  }, []);

  // Actualiza el state local según el cambio en un input
  const handleInputChange = (dayId, field, value, scheduleField) => {
    setDays(prevDays =>
      prevDays.map(day => {
        if (day.id === dayId) {
          if (scheduleField) {
            return {
              ...day,
              [field]: {
                ...day[field],
                [scheduleField]: value,
              },
            };
          } else {
            return { ...day, [field]: value };
          }
        }
        return day;
      })
    );
  };

  // Actualiza el state local según el cambio en el checkbox
  // Si se desmarca (active === false) se limpian start y end; al volver a marcar, los inputs quedan editables (con valor vacío si no se definió otro)
  const handleCheckboxChange = (dayId, field, checked) => {
    setDays(prevDays =>
      prevDays.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            [field]: {
              ...day[field],
              active: checked,
              start: checked ? day[field].start : "",
              end: checked ? day[field].end : "",
            },
          };
        }
        return day;
      })
    );
  };

  // Actualiza los documentos en Firebase
  // Se fuerza que si el horario está inactivo (active false), se guarden start y end como cadenas vacías
  const handleUpdate = async () => {
    try {
      await Promise.all(
        days.map(day => {
          const dayRef = doc(db, 'calendar', day.id);
          const updatedData = { ...day };

          if (updatedData.morningSchedule) {
            updatedData.morningSchedule.start = updatedData.morningSchedule.active
              ? normalizeTime(updatedData.morningSchedule.start)
              : "";
            updatedData.morningSchedule.end = updatedData.morningSchedule.active
              ? normalizeTime(updatedData.morningSchedule.end)
              : "";
          }

          if (updatedData.eveningSchedule) {
            updatedData.eveningSchedule.start = updatedData.eveningSchedule.active
              ? normalizeTime(updatedData.eveningSchedule.start)
              : "";
            updatedData.eveningSchedule.end = updatedData.eveningSchedule.active
              ? normalizeTime(updatedData.eveningSchedule.end)
              : "";
          }

          if (updatedData.workSchedule) {
            updatedData.workSchedule.start = updatedData.workSchedule.active
              ? normalizeTime(updatedData.workSchedule.start)
              : "";
            updatedData.workSchedule.end = updatedData.workSchedule.active
              ? normalizeTime(updatedData.workSchedule.end)
              : "";
          }

          const { id, ...data } = updatedData;
          return updateDoc(dayRef, data);
        })
      );
      alert('Cambios guardados en Firebase');
    } catch (error) {
      console.error('Error updating documents:', error);
      alert('Error actualizando datos');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="text-center py-8 border-b border-gray-100">
          <h1 className="text-4xl font-bold text-gray-800">Calendario</h1>
          <p className="text-gray-600 mt-2">Gestiona calendario y el modo de venta</p>
        </div>

        {/* Contenido principal */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Modo venta</h2>
          
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">Día</th>
                  <th className="py-4 px-2 text-left text-gray-700 font-semibold">
                    Pollos<br/>(15min)
                  </th>
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
                    Aplicar<br/>Traba
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-2 text-gray-700">{day.name}</td>
                    
                    {/* Chicken amount */}
                    <td className="py-4 px-2">
                      <input
                        type="number"
                        value={day.chickenAmount}
                        onChange={(e) => handleInputChange(day.id, 'chickenAmount', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </td>
                    
                    {/* Web pre-order */}
                    <td className="py-4 px-2 flex items-center">
                      <input
                        type="number"
                        value={day.webPreOrder}
                        onChange={(e) => handleInputChange(day.id, 'webPreOrder', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <span className="ml-2 text-gray-600">min</span>
                    </td>
                    
                    {/* Morning schedule */}
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={day.morningSchedule?.active || false}
                          onChange={(e) => handleCheckboxChange(day.id, 'morningSchedule', e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <input
                          type="time"
                          value={normalizeTime(day.morningSchedule?.start)}
                          onChange={(e) => handleInputChange(day.id, 'morningSchedule', e.target.value, 'start')}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center ml-2"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                          type="time"
                          value={normalizeTime(day.morningSchedule?.end)}
                          onChange={(e) => handleInputChange(day.id, 'morningSchedule', e.target.value, 'end')}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                    </td>
                    
                    {/* Evening schedule */}
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={day.eveningSchedule?.active || false}
                          onChange={(e) => handleCheckboxChange(day.id, 'eveningSchedule', e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <input
                          type="time"
                          value={normalizeTime(day.eveningSchedule?.start)}
                          onChange={(e) => handleInputChange(day.id, 'eveningSchedule', e.target.value, 'start')}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center ml-2"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                          type="time"
                          value={normalizeTime(day.eveningSchedule?.end)}
                          onChange={(e) => handleInputChange(day.id, 'eveningSchedule', e.target.value, 'end')}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                    </td>
                    
                    {/* Negative stock */}
                    <td className="py-4 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={day.negativeStock}
                        onChange={(e) => handleCheckboxChange(day.id, 'negativeStock', e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    
                    {/* Work schedule */}
                    <td className="py-4 px-2">
                      {day.workSchedule?.active ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="time"
                            value={normalizeTime(day.workSchedule?.start)}
                            onChange={(e) => handleInputChange(day.id, 'workSchedule', e.target.value, 'start')}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <span className="text-gray-600">-</span>
                          <input
                            type="time"
                            value={normalizeTime(day.workSchedule?.end)}
                            onChange={(e) => handleInputChange(day.id, 'workSchedule', e.target.value, 'end')}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">-</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Botón para actualizar */}
          <div className="mt-8 flex justify-end">
            <button 
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
              onClick={handleUpdate}
            >
              <Save className="w-5 h-5 mr-2" />
              Actualizar modo venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarioPollos;
