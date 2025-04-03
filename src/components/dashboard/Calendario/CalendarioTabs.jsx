// CalendarTabs.jsx
import { useState, useEffect } from "react";
// Importa el nuevo componente genérico
import CalendarioProducto from "./CalendarioProducto";
import { useOrder } from '../../Context/OrderProviderContext';

const CalendarTabs = () => {
  // Define los tipos de producto que corresponden a las pestañas
  const productTypes = {
    chicken: "chicken",
    costilla: "costilla",
    codillo: "codillo",
  };
  const [activeTab, setActiveTab] = useState(productTypes.chicken); // Usa el tipo como key
  const { setOrderType, refreshDailyCalendar } = useOrder(); // Necesitas setOrderType

  // Cuando cambia la pestaña, actualiza el tipo de orden en el contexto
  useEffect(() => {
    console.log("Tab cambiada a:", activeTab);
    setOrderType(activeTab);
    // Opcional: podrías querer refrescar el calendario diario al cambiar de tab
    // refreshDailyCalendar(); // Descomenta si quieres que cargue inmediatamente el diario del nuevo producto
  }, [activeTab, setOrderType, refreshDailyCalendar]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    // setOrderType ya se llama en el useEffect al cambiar activeTab
  };

  return (
    <div>
      <div className="fixed top-[6.35vh] left-0 right-0 flex justify-center mb-2 bg-white z-10 pt-3 border-b-2 text-gray-700">
         {/* Renderiza las pestañas dinámicamente o mantenlas como estaban */}
         <div
           className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
             activeTab === productTypes.chicken
               ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
               : "text-gray-700 hover:text-yellow-500"
           }`}
           onClick={() => handleTabClick(productTypes.chicken)}
         >
           Pollos
         </div>
          <div
           className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
             activeTab === productTypes.costilla
               ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
               : "text-gray-700 hover:text-yellow-500"
           }`}
           onClick={() => handleTabClick(productTypes.costilla)}
         >
           Costillas
         </div>
         <div
           className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
             activeTab === productTypes.codillo
               ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
               : "text-gray-700 hover:text-yellow-500"
           }`}
           onClick={() => handleTabClick(productTypes.codillo)}
         >
           Codillo
         </div>
      </div>
      <div className="content mt-40">
         {/* Renderiza el componente genérico pasándole el tipo de producto activo */}
         {/* Usa una key que cambie con activeTab para forzar el re-montado si es necesario, */}
         {/* o confía en los useEffects internos para reaccionar al cambio de prop */}
         <CalendarioProducto key={activeTab} productType={activeTab} />
      </div>
    </div>
  );
};

export default CalendarTabs;