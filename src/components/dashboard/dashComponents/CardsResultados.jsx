import React, { useState, useEffect } from 'react';

import dayjs from 'dayjs';

// Configuración de las categorías a mostrar y sus estilos
const displayCategoriesConfig = [
  { name: "Comida", key: "comida", bgColor: "bg-yellow-500", defaultText: "" },
  { name: "Complementos", key: "complementos", bgColor: "bg-green-700", defaultText: "" },
  { name: "Bebidas", key: "bebidas", bgColor: "bg-red-700", defaultText: "" },
  { name: "Postres", key: "postres", bgColor: "bg-purple-700", defaultText: "" },
  { name: "Extras", key: "extras", bgColor: "bg-gray-500", defaultText: "" },
];

// Ahora recibe los datos como props
const CardsResultados = ({ categoryTotals, grandTotal, loading, error }) => {
  // Ya no necesita su propio useEffect para cargar datos

  if (loading) {
    return (
      <div className="flex justify-center items-center p-2 h-full">
      <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center bg-red-100 text-red-700 rounded-md font-nunito">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-2 text-center font-nunito">
      {displayCategoriesConfig.map((categoryConfig) => {
        const total = (categoryTotals && categoryTotals[categoryConfig.key.toLowerCase()]) || 0;
        return (
          <div key={categoryConfig.key} className={`p-3 rounded-xl shadow-md ${categoryConfig.bgColor} text-white flex flex-col justify-between min-h-[120px]`}>
            <h2 className="text-sm font-medium">{categoryConfig.name}</h2>
            <p className="text-3xl font-bold my-2">
              {total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
            <p className="text-xs opacity-80">
              {total > 0 ? `` : categoryConfig.defaultText}
            </p>
          </div>
        );
      })}
      {/* Tarjeta para el Total del Día */}
      <div className="p-3 rounded-xl shadow-md bg-red-500 text-white flex flex-col justify-between min-h-[120px]">
        <h2 className="text-sm font-medium">Total Día</h2>
        <p className="text-3xl font-bold my-2">
          {grandTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
        <p className="text-xs opacity-80">
          {grandTotal > 0 ? "" : ""}
        </p>
      </div>
    </div>
  );
}

export default CardsResultados;
