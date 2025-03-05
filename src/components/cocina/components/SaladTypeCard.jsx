import React, { useState, useEffect } from 'react';

export function SaladTypeCard({ type, data, updateSaladCount }) {
  // Valores por defecto en caso de que no exista la data
  const defaultValues = {
    grandes: { preparadas: 0, pedidas: 0 },
    pequenas: { preparadas: 0, pedidas: 0 },
  };

  const [values, setValues] = useState(data || defaultValues);

  useEffect(() => {
    setValues(data || defaultValues);
  }, [data]);

  const handleUpdate = (size, newCount) => {
    updateSaladCount(type, size, newCount);
    setValues(prev => ({
      ...prev,
      [size]: { ...prev[size], preparadas: newCount },
    }));
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-2">
      {/* Header */}
      <div className="text-center text-lg font-bold text-gray-800 mb-2">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </div>
      {/* Fila con dos columnas: una para GRANDES y otra para PEQUEÑAS */}
      <div className="flex justify-around items-start">
        {/* Columna para GRANDES */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold mb-1">GRANDES</div>
          <div className="flex items-center space-x-1 mb-1">
            <button 
              onClick={() => handleUpdate("grandes", Math.max(0, values.grandes.preparadas - 1))}
              className="px-2 py-1 text-sm border rounded"
            >
              -
            </button>
            <span className="text-sm font-medium">{values.grandes.preparadas}</span>
            <button 
              onClick={() => handleUpdate("grandes", values.grandes.preparadas + 1)}
              className="px-2 py-1 text-sm border rounded"
            >
              +
            </button>
          </div>
          <div className="text-sm font-semibold">PEDIDAS: {values.grandes.pedidas}</div>
        </div>
        {/* Columna para PEQUEÑAS */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold mb-1">PEQUEÑAS</div>
          <div className="flex items-center space-x-1 mb-1">
            <button 
              onClick={() => handleUpdate("pequenas", Math.max(0, values.pequenas.preparadas - 1))}
              className="px-2 py-1 text-sm border rounded"
            >
              -
            </button>
            <span className="text-sm font-medium">{values.pequenas.preparadas}</span>
            <button 
              onClick={() => handleUpdate("pequenas", values.pequenas.preparadas + 1)}
              className="px-2 py-1 text-sm border rounded"
            >
              +
            </button>
          </div>
          <div className="text-sm font-semibold">PEDIDAS: {values.pequenas.pedidas}</div>
        </div>
      </div>
    </div>
  );
}
