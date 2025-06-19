import React, { useState, useEffect } from 'react';

 function SaladTypeCard({ type, data, updateSaladCount }) {
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
    // Local state update for immediate UI feedback
    setValues((prev) => ({
      ...prev,
      [size]: { ...prev[size], preparadas: newCount },
    }));
  };

  const grandesEnDeficit = values.grandes && values.grandes.pedidas > values.grandes.preparadas;
  const grandesIgualesYNoCero = values.grandes && values.grandes.preparadas === values.grandes.pedidas && values.grandes.pedidas > 0;
  const pequenasEnDeficit = values.pequenas && values.pequenas.pedidas > values.pequenas.preparadas;
  const pequenasIgualesYNoCero = values.pequenas && values.pequenas.preparadas === values.pequenas.pedidas && values.pequenas.pedidas > 0;

  return (
    <div className="overflow-x-auto rounded-lg -mt-5 ">
      <table className="min-w-full table-auto border-collapse  border border-gray-300 bg-white shadow-sm font-nunito">
        <tbody >
          {/* Fila 1: Título y cabeceras principales */}
          <tr className="bg-gray-700">
            {/* La celda del título ocupa tres filas 
            <th className="px-4 py-2 text-left text-white" rowSpan="1">
              {type.toUpperCase()}
            </th>*/}
            
            <th className="px-4 py-2 text-center text-white " colSpan="2">
            {type.toUpperCase()} GRANDES
            </th>
         
            <th className="px-4 py-2 text-center text-white" colSpan="2">
            {type.toUpperCase()} PEQUEÑAS
            </th>
          </tr>
          {/* Fila 2: Subcabeceras */}
          <tr className="bg-white ">
            <th className="border border-gray-300 px-4 py-2 text-center">
              PREPARADAS
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center">
              PEDIDAS
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center">
              PREPARADAS
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center">
              PEDIDAS
            </th>
          </tr>
          {/* Fila 3: Valores */}
          <tr className='bg-[#F3F3F3] text-xl'>
            {/* La primera columna ya está ocupada por el título */}
            {/* GRANDES -> PREPARADAS */}
            <td className={`border px-4 py-2 text-center ${
              grandesEnDeficit
                ? 'bg-red-500 text-white border-red-600'
                : grandesIgualesYNoCero
                  ? 'bg-yellow-300 text-neutral-800 border-yellow-400'
                  : 'border-gray-300'
            }`}>
              <div className="flex items-center justify-center space-x-2 text-xl ">
                <button
                  onClick={() =>
                    handleUpdate(
                      'grandes',
                      Math.max(0, values.grandes.preparadas - 1)
                    )
                  }
                  className={`px-3 py-2 text-xl border rounded ${
                    grandesEnDeficit
                      ? 'border-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white'
                      : grandesIgualesYNoCero
                        ? 'border-neutral-700 text-neutral-800 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-neutral-700'
                        : 'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
                  }`}
                >
                  -
                </button>
                <span className={`text-xl font-medium ${
                  grandesEnDeficit ? 'text-white' : grandesIgualesYNoCero ? 'text-neutral-800' : ''
                }`}>
                  {values.grandes.preparadas}
                </span>
                <button
                  onClick={() =>
                    handleUpdate('grandes', values.grandes.preparadas + 1)
                  }
                  className={`px-3 py-2 text-xl border rounded ${
                    grandesEnDeficit
                      ? 'border-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white'
                      : grandesIgualesYNoCero
                        ? 'border-neutral-700 text-neutral-800 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-neutral-700'
                        : 'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
                  }`}
                >
                  +
                </button>
              </div>
            </td>
            {/* GRANDES -> PEDIDAS */}
            <td className={`border border-gray-300 px-4 py-2 text-center text-xl ${grandesEnDeficit && !values.grandes.preparadas ? 'font-bold text-red-600' : ''}`}>
              {values.grandes.pedidas}
            </td>
            {/* PEQUEÑAS -> PREPARADAS */}
            <td className={`border px-4 py-2 text-center ${
              pequenasEnDeficit
                ? 'bg-red-500 text-white border-red-600'
                : pequenasIgualesYNoCero
                  ? 'bg-yellow-300 text-neutral-800 border-yellow-400'
                  : 'border-gray-300'
            }`}>
              <div className="flex items-center justify-center space-x-2 ">
                <button
                  onClick={() =>
                    handleUpdate(
                      'pequenas',
                      Math.max(0, values.pequenas.preparadas - 1)
                    )
                  }
                  className={`px-3 py-2 text-xl border rounded ${
                    pequenasEnDeficit
                      ? 'border-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white'
                      : pequenasIgualesYNoCero
                        ? 'border-neutral-700 text-neutral-800 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-neutral-700'
                        : 'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
                  }`}
                >
                  -
                </button>
                <span className={`text-xl font-medium ${
                  pequenasEnDeficit ? 'text-white' : pequenasIgualesYNoCero ? 'text-neutral-800' : ''
                }`}>
                  {values.pequenas.preparadas}
                </span>
                <button
                  onClick={() =>
                    handleUpdate('pequenas', values.pequenas.preparadas + 1)
                  }
                  className={`px-3 py-2 text-xl border rounded ${
                    pequenasEnDeficit
                      ? 'border-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white'
                      : pequenasIgualesYNoCero
                        ? 'border-neutral-700 text-neutral-800 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-neutral-700'
                        : 'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
                  }`}
                >
                  +
                </button>
              </div>
            </td>
            {/* PEQUEÑAS -> PEDIDAS */}
            <td className={`border border-gray-300 px-4 py-2 text-center text-xl ${pequenasEnDeficit && !values.pequenas.preparadas ? 'font-bold text-red-600' : ''}`}>
              {values.pequenas.pedidas}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default SaladTypeCard;