// ProgresoConTabs.js
import React, { useState } from "react";
import Scanner from "./Scanner";
import BuscadorPedidos from "./BuscadorPedidos";


const ProgresoConTabs = () => {
  const [activeTab, setActiveTab] = useState(1); // Estado para gestionar la pestaña activa

  // Función para manejar el clic en las pestañas
  const handleTabClick = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (           
    <div className="p-4">

 <div className="fixed top-[6.35vh] left-0 right-0 flex justify-center mb-2 bg-white z-10 pt-3 border-b-2 text-gray-700 ">
        {/* Pestaña Stock */}
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
            activeTab === 1
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick(1)}
        >
         <p className="font-nunito font-bold"> Busqueda Pedidos</p> 
        </div>

        {/* Pestaña Pollo Detallado */}
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
            activeTab === 2
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick(2)}
        >
          <p className="font-nunito font-bold"> Scanner Pedidos</p> 
        </div>
      </div>

    {/* Contenido de las pestañas */}
    <div className="content mt-40">
      {activeTab === 1 && <BuscadorPedidos />}
      {activeTab === 2 && <Scanner />}
    </div>
  </div>
);
};

export default ProgresoConTabs;
