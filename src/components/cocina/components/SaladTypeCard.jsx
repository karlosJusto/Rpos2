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
    setValues((prev) => ({
      ...prev,
      [size]: { ...prev[size], preparadas: newCount },
    }));
  };

  return (
    <div className="overflow-x-auto rounded-lg ">
      <table className="min-w-full table-auto border-collapse border border-gray-300 bg-white shadow-sm font-nunito">
        <tbody >
          {/* Fila 1: Título y cabeceras principales */}
          <tr className="bg-gray-700">
            {/* La celda del título ocupa tres filas */}
            <th className="px-4 py-2 text-left text-white" rowSpan="3">
              {type.toUpperCase()}
            </th>
            <th className="px-4 py-2 text-center text-white " colSpan="2">
              GRANDES
            </th>
            <th className="px-4 py-2 text-center text-white" colSpan="2">
              PEQUEÑAS
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
            <td className="border border-gray-900 px-4 py-2  text-center  ">
              <div className="flex items-center justify-center space-x-2 text-xl ">
                <button
                  onClick={() =>
                    handleUpdate(
                      'grandes',
                      Math.max(0, values.grandes.preparadas - 1)
                    )
                  }
                  className="px-3 py-2 text-xl border  rounded"
                >
                  -
                </button>
                <span className="text-xl font-medium">
                  {values.grandes.preparadas}
                </span>
                <button
                  onClick={() =>
                    handleUpdate('grandes', values.grandes.preparadas + 1)
                  }
                  className="px-3 py-2 text-xl border rounded"
                >
                  +
                </button>
              </div>
            </td>
            {/* GRANDES -> PEDIDAS */}
            <td className="border border-gray-300 px-4 py-2 text-center text-xl">
              {values.grandes.pedidas}
            </td>
            {/* PEQUEÑAS -> PREPARADAS */}
            <td className="border border-gray-300 px-4 py-2 text-center ">
              <div className="flex items-center justify-center space-x-2 ">
                <button
                  onClick={() =>
                    handleUpdate(
                      'pequenas',
                      Math.max(0, values.pequenas.preparadas - 1)
                    )
                  }
                  className="px-3 py-2 text-xl border rounded"
                >
                  -
                </button>
                <span className="text-xl font-medium">
                  {values.pequenas.preparadas}
                </span>
                <button
                  onClick={() =>
                    handleUpdate('pequenas', values.pequenas.preparadas + 1)
                  }
                  className="px-3 py-2 text-xl border rounded"
                >
                  +
                </button>
              </div>
            </td>
            {/* PEQUEÑAS -> PEDIDAS */}
            <td className="border border-gray-300 px-4 py-2 text-center text-xl">
              {values.pequenas.pedidas}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default SaladTypeCard;