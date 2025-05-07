// src/components/dashboard/dashComponents/DashboardHomeContent.jsx (NUEVO ARCHIVO)
import React from 'react';
import CardsResultados from "./CardsResultados";
import NavbarResultados from "./NavbarResultados";

const DashboardHomeContent = () => {
  return (
    <>
      {/* Navbar específico del contenido */}
      <div className="bg-white h-20 rounded-xl mb-2"> {/* Añadido margen inferior */}
        <NavbarResultados />
      </div>

      {/* Contenido principal del dashboard */}
      <div className="bg-white flex-1 rounded-xl overflow-auto p-3">
        {/* Grid de tarjetas */}
        <CardsResultados />

        {/* Bloque pollo */}
        <div className="bg-gray-200 h-64 rounded-xl mt-3 p-3"> {/* Cambiado color para diferenciar */}
          <h1>Contenido Principal Dashboard</h1>
        </div>
        {/* Bloques otros productos */}
        <div className="flex mt-3 p-2 gap-3 h-72 overflow-auto ">
          <div className="w-1/2 rounded-xl bg-blue-200 p-3"> {/* Cambiado color */}
            <h1>Bloque 1</h1>
          </div>
          <div className="w-1/3 rounded-xl bg-green-200 p-3"> {/* Cambiado color */}
            <h1>Bloque 2</h1>
          </div>
          <div className="w-1/3 rounded-xl bg-red-200 p-3"> {/* Cambiado color */}
            <h1>Bloque 3</h1>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardHomeContent;
