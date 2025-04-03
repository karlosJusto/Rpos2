import React, { useState, useEffect } from 'react';
// Asegúrate que la ruta a tu contexto sea correcta
import { useOrder } from '../../Context/OrderProviderContext';
import { RefreshCw } from 'lucide-react'; // Icono para refrescar

// Define los tipos de producto igual que en ConfiguracionCalendario
const productTypes = {
  chicken: { name: "Pollos", key: "chicken" },
  costilla: { name: "Costillas", key: "costilla" },
  codillo: { name: "Codillo", key: "codillo" }, // Asegúrate que la key coincide
};

function VistaDiariaTabs() {
  const [activeProductTab, setActiveProductTab] = useState(productTypes.chicken.key); // Empieza con pollos
  const { dailyCalendar, loading, setOrderType, refreshDailyCalendar } = useOrder();

  // Actualiza el tipo de orden en el contexto cuando cambia la pestaña
  useEffect(() => {
    console.log("Cambiando vista diaria a:", activeProductTab);
    setOrderType(activeProductTab);
    // Opcional: refrescar automáticamente al cambiar de tab si no lo hace el contexto
    // refreshDailyCalendar();
  }, [activeProductTab, setOrderType]); // No incluir refreshDailyCalendar aquí para evitar bucles

  const handleTabClick = (tabKey) => {
    setActiveProductTab(tabKey);
  };

  const currentProductName = productTypes[activeProductTab]?.name || 'Desconocido';
  const currentDate = dailyCalendar?.date || 'Ninguna seleccionada';

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-md overflow-hidden">
      {/* Pestañas */}
      <div className="flex justify-center border-b border-gray-200 bg-gray-50">
        {Object.values(productTypes).map((product) => (
          <button
            key={product.key}
            className={`px-4 py-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none
              ${activeProductTab === product.key
                ? "border-b-2 border-yellow-500 text-yellow-600 bg-white"
                : "text-gray-600 hover:text-yellow-600 hover:bg-gray-100"
              }`}
            onClick={() => handleTabClick(product.key)}
          >
            {product.name}
          </button>
        ))}
      </div>

      {/* Contenido: Tabla de Intervalos Diarios */}
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
                Intervalos para {currentProductName}
                <span className="text-base font-normal text-gray-600 ml-2">({currentDate})</span>
            </h3>
             <button
                className="flex items-center bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200 disabled:opacity-50"
                onClick={refreshDailyCalendar}
                disabled={loading}
                title="Refrescar datos del calendario diario"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refrescar
              </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-4">Cargando intervalos...</p>
        ) : dailyCalendar && dailyCalendar.productType === activeProductTab && dailyCalendar.intervals && dailyCalendar.intervals.length > 0 ? (
          <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="py-2 px-3 text-left text-gray-600 font-semibold">Intervalo</th>
                    <th className="py-2 px-3 text-center text-gray-600 font-semibold">Pedidos</th>
                    <th className="py-2 px-3 text-center text-gray-600 font-semibold">Límite</th>
                    <th className="py-2 px-3 text-center text-gray-600 font-semibold">Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyCalendar.intervals.map((interval, idx) => {
                      const disponibles = Math.max(0, (interval.maxAllowed || 0) - (interval.orderedCount || 0));
                      return (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-700">{interval.start} - {interval.end}</td>
                              <td className="py-2 px-3 text-center text-gray-700">{interval.orderedCount || 0}</td>
                              <td className="py-2 px-3 text-center text-gray-700">{interval.maxAllowed || 0}</td>
                               <td className={`py-2 px-3 text-center font-medium ${disponibles > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {disponibles}
                              </td>
                          </tr>
                      );
                   })}
                </tbody>
              </table>
          </div>
        ) : (
           <p className="text-center text-gray-500 py-4">
               {dailyCalendar && dailyCalendar.productType !== activeProductTab
                   ? `Mostrando datos para ${productTypes[dailyCalendar.productType]?.name || 'otro producto'}. Refresca o selecciona la pestaña correcta.`
                   : `No hay intervalos definidos para ${currentProductName} en la fecha ${currentDate}.`
               }
            </p>
        )}
      </div>
    </div>
  );
}

export default VistaDiariaTabs;