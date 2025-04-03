import React, { useState } from "react";

import Stock from './Stock';
import Freidora from '../freidora/Freidora'
import PolloDetallo from "./PolloDetallo";
import StockDia from "./StockDia"; // Importa el componente StockDia

const ProgresoConTabs = () => {
  const [activeTab, setActiveTab] = useState(1); // Estado para gestionar la pestaña activa

  // Función para manejar el clic en las pestañas
  const handleTabClick = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (
    <div className="p-4">
      <div className="fixed top-[6.35vh] left-0 right-0 flex justify-center mb-2 bg-white z-10 pt-3 border-b-2 text-gray-700">
        {/* Pestaña Pollo Detallado */}
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
            activeTab === 1
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick(1)}
        >
          <p className="font-nunito font-bold">1-Pollo Detallado</p>
        </div>

        {/* Pestaña Stock del Día (ahora es la segunda pestaña) */}
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
            activeTab === 2
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick(2)}
        >
          <p className="font-nunito font-bold">2-Productos Día</p>
        </div>

        {/* Pestaña Stock General (ahora es la tercera pestaña) */}
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
            activeTab === 3
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick(3)}
        >
          <p className="font-nunito font-bold">3-Stock General</p>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="content mt-40">
        {activeTab === 1 && <PolloDetallo />}
        {activeTab === 2 && <StockDia />} {/* StockDia es ahora la segunda pestaña */}
        {activeTab === 3 && <Stock />} {/* Stock es ahora la tercera pestaña */}
      </div>
    </div>
  );
};

export default ProgresoConTabs;
