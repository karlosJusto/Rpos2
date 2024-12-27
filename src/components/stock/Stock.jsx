import React, { useContext, useState } from 'react';
import { dataContext } from '../Context/DataContext';
import SidebarGenerica from "../freidora/SidebarGenerica"

const Stock = () => {
  const { data, actualizarStock, loading } = useContext(dataContext); // Usamos el context
  const [nuevoStock, setNuevoStock] = useState(""); // Estado para almacenar el nuevo stock

  // Manejador para actualizar el stock de un producto
  const handleStockChange = (e) => {
    setNuevoStock(e.target.value);
  };

  // Función para enviar el nuevo stock al backend (Firestore)
  const handleActualizarStock = (id_product) => {
    if (nuevoStock !== "") {
      actualizarStock(id_product, parseInt(nuevoStock)); // Llamamos a la función para actualizar el stock en Firestore
      setNuevoStock(""); // Limpiamos el campo después de actualizar

    }
  };

  // Si estamos cargando los datos, mostramos un mensaje de carga
  if (loading) {
    return <p>Cargando productos...</p>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen  bg-gray-100">
        <div className="w-full max-w-4xl p-6 bg-white shadow-md rounded-lg">
          <div className="navbar">
            <SidebarGenerica />
          </div>

    <div className="mt-10 text-center">
      <h1 className="text-2xl font-semibold mb-4">Listado de Productos - Stock</h1>
      <table className="table-auto w-full text-center">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2 ">Stock Actual</th>
            <th className="px-4 py-2">Nuevo Stock</th>
            <th className="px-4 py-2">Actualizar</th>
          </tr>
        </thead>
        <tbody>
          {data.map((producto) => (
            <tr key={producto.id_product} className="border-b">
              <td className="px-4 py-2">
                  <img 
                    src={producto.imagen} 
                    alt={producto.name} 
                    className="w-14 h-14 object-cover rounded-full" 
                  />
              </td>
              <td className="px-4 py-2">{producto.name}</td>
              <td className="px-4 py-2 font-extrabold">{producto.stock}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={nuevoStock}
                  onChange={handleStockChange}
                  min="0"
                  placeholder="Nuevo stock"
                  className="px-2 py-1 border border-gray-300 rounded-md"
                />
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => handleActualizarStock(producto.id_product)}
                  className="px-4 py-2 bg-yellow-500 text-white font-nunito focus:ring-4 focus:ring-yellow-500 focus:outline-none rounded-md hover:bg-yellow-600"
                >
                  Actualizar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>

  );
};

export default Stock;

