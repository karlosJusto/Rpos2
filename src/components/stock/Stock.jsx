import React, { useContext, useState } from 'react';
import { dataContext } from '../Context/DataContext';

const Stock = () => {
  const { data, actualizarStock, loading } = useContext(dataContext); // Usamos el context
  
  

  const [stockActual, setStockActual] = useState(
    data.reduce((acc, producto) => {
      acc[producto.id_product] = producto.stock; // Inicializamos el stock con los valores actuales de cada producto
      return acc;
    }, {})
  ); // Estado para almacenar el nuevo stock de cada producto

  
  
  const [nuevoStock, setNuevoStock] = useState(
    data.reduce((acc, producto) => {
      acc[producto.id_product] = 0; // Inicializamos el stock con los valores actuales de cada producto
      return acc;
    }, {})
  ); // Estado para almacenar el nuevo stock de cada producto

  const [search, setSearch] = useState(""); // Estado para la búsqueda de productos

  const clearSearch = () => {
    setSearch('');
  };

  // Manejador para actualizar el stock de un producto
  const handleStockChange = (id_product, e) => {
    setNuevoStock({
      ...nuevoStock,
      [id_product]: parseFloat(e.target.value) || 0, // Actualizamos el stock para el producto correspondiente
    });
  };

  const handleStockActualChange = (id_product, e) => {
    setStockActual({
      ...stockActual,
      [id_product]: parseInt(e.target.value) || 0, // Actualizamos el stock para el producto correspondiente
    });
  };

  // Función para enviar todos los cambios de stock al backend (Firestore)
  const handleActualizarStock = () => {
    

    Object.keys(stockActual).forEach((id_product) => {
    
      const stock =stockActual[id_product] + nuevoStock[id_product];
      if (stock !== "") {
        actualizarStock(id_product, stock); // Llamamos a la función para actualizar el stock en Firestore
        stockActual[id_product]=stock;
        nuevoStock[id_product]=0;
      }
    });
    
    /*Object.keys(nuevoStock).forEach((id_product) => {
    
      const stock =stockActual[id_product] + nuevoStock[id_product];
      if (stock !== "") {
        actualizarStock(id_product, stock); // Llamamos a la función para actualizar el stock en Firestore
        stockActual[id_product]=stock;
        nuevoStock[id_product]=0;
      }
    });*/
  };





    // Si estamos cargando los datos, mostramos un mensaje de carga
  if (loading) {
    return <p className="text-center">Cargando productos...</p>;
  }
  

  // Filtrar los productos según el término de búsqueda
  const productosFiltrados = data.filter((producto) =>
    producto.name.toLowerCase().includes(search.toLowerCase()) && ![1, 2, 48].includes(producto.id_product) // Filtramos por nombre del producto y excluimos los productos con id_product 1, 2 y 48
  );

  // Agrupar los productos por categoría
  const productosPorCategoria = productosFiltrados.reduce((acc, producto) => {
    const { categoria } = producto;
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(producto);
    return acc;
  }, {});

  // Definir el orden personalizado de las categorías
  const ordenCategorias = ['comida', 'complementos', 'bebidas', 'postres', 'extras'];

  // Obtener las categorías ordenadas según el orden personalizado
  const categoriasOrdenadas = ordenCategorias.filter(categoria => productosPorCategoria[categoria])
    .sort((a, b) => ordenCategorias.indexOf(a) - ordenCategorias.indexOf(b));

  return (
    <div className="flex justify-center items-start mt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mb-24">
        {/* Campo de búsqueda */}
        <div className="mb-6 flex justify-center">
              <div className="relative w-full sm:w-1/2 lg:w-1/3">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md w-full focus:ring-yellow-500 focus:border-yellow-500 pr-10"
                />

                {/* SVG de borrar (X) */}
                {search && (
                  <svg
                    onClick={clearSearch}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-900 cursor-pointer"
                    width="20" height="20"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
            </div>


        {/* Mostramos los productos agrupados por categoría */}
        {categoriasOrdenadas.map((categoria) => (
          <div key={categoria} className="mb-8">
            <h2 className="text-2xl font-nunito font-semibold mb-6  text-gray-500 capitalize">{categoria}</h2>
            <table className="table-auto w-full text-center border-collapse">
              <thead className="bg-[#F3F3F3]">
                <tr className="text-xl font-nunito">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Stock Actual</th>
                  <th className="px-4 py-2">Entran</th>
                  <th className="px-4 py-2">Stock Final</th>
                </tr>
              </thead>
              <tbody>
                {/* Mapeamos los productos de la categoría actual */}
                {productosPorCategoria[categoria].map((producto) => (
                  <tr key={producto.id_product} className="border-b">
                    <td className="px-4 py-2">
                      <img
                        src={producto.imagen_rpos}
                        alt={producto.name}
                        className="w-15 h-10 object-cover rounded-md mx-auto"
                      />
                    </td>
                    <td className="px-4 py-2 font-nunito text-lg">{producto.name}</td>
                   {/* <td className="px-4 py-2 font-extrabold font-nunito text-xl">{producto.stock}</td> */}

                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={stockActual[producto.id_product] || ""}
                        onChange={(e) => handleStockActualChange(producto.id_product, e)}
                        min="0"
                        placeholder="Nuevo stock"
                        className="px-2 py-1 border border-gray-300 rounded-md w-20 text-center focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={nuevoStock[producto.id_product] || ""}
                        onChange={(e) => handleStockChange(producto.id_product, e)}
                        min="0"
                        step="any" // Permite decimales
                        placeholder="Nuevo stock"
                        className="px-2 py-1 border border-gray-300 rounded-md w-20 text-center focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </td>
                    <td className="px-4 py-2 font-nunito text-lg font-extrabold">{producto.stock + (nuevoStock[producto.id_product] || 0)}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Botón flotante para validar los cambios */}
      <div className="flex justify-center items-center w-full fixed bottom-4 mx-4 rounded-md">
  <button
    onClick={handleActualizarStock}
    className="w-[33%] py-3 bg-yellow-500 text-white font-nunito rounded-md focus:ring-yellow-500 hover:bg-yellow-600 flex items-center justify-center gap-2"
  >
    <svg
      width="28px"
      height="28px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white"
    >
      <g id="SVGRepo_iconCarrier">
        <path
          d="M4 18V6"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
        <path
          d="M20 12L20 18"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
        <path
          d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z"
          stroke="#ffffff"
          strokeWidth="1.5"
        ></path>
        <path
          d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
        <path
          d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18"
          stroke="#ffffff"
          strokeWidth="1.5"
        ></path>
      </g>
    </svg>
    <span className="font-nunito text-lg">Actualizar Stock</span>
  </button>
</div>

    </div>
  );
};

export default Stock;




