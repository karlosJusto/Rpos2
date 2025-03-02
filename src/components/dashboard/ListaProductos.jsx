// Listaproductos.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

const Listaproductos = () => {
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Función para obtener y agrupar los productos
  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const groupedProducts = {};
      querySnapshot.forEach((docSnap) => {
        const producto = docSnap.data();
        const categoria = producto.categoria || "Sin categoría";
        if (!groupedProducts[categoria]) {
          groupedProducts[categoria] = [];
        }
        groupedProducts[categoria].push(producto);
      });
      setProductosPorCategoria(groupedProducts);
    } catch (error) {
      console.error("Error al obtener los productos:", error);
      setMensaje("Error al cargar los productos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Función para redirigir a la pantalla de edición (CrearProductos)
  const editarProducto = (producto) => {
    // Se navega a /crearproductos y se pasa el objeto producto y un flag de edición
    navigate("/dashboard/crearProductos", { state: { producto, modo: "editar" } });
  };

  // Función para eliminar el producto usando el id_product
  const eliminarProducto = async (id) => {
    try {
      await deleteDoc(doc(db, "productos", id.toString()));
      setMensaje("Producto eliminado correctamente");
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      setMensaje("Error al eliminar el producto");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center mb-6">Listado de Productos</h2>
      {mensaje && <p className="text-center text-sm text-gray-700 mb-4">{mensaje}</p>}
      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        Object.keys(productosPorCategoria).map((categoria) => (
          <div key={categoria} className="mb-8">
            <h3 className="text-xl font-bold mb-4">{categoria}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productosPorCategoria[categoria].map((producto, index) => (
                <div
                  key={index}
                  className="border border-gray-300 rounded-lg p-4 shadow-sm flex flex-col"
                >
                  <div className="w-full h-40 mb-4">
                    <img
                      src={producto.imagen}
                      alt={producto.name}
                      className="object-cover w-full h-full rounded-md"
                    />
                  </div>
                  <h4 className="font-semibold text-lg">{producto.name}</h4>
                  <p className="text-sm text-gray-600">{producto.description}</p>
                  <p className="mt-2 font-bold">Precio: ${producto.price}</p>
                  <div className="flex justify-between mt-auto pt-4">
                    <button
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      onClick={() => editarProducto(producto)}
                    >
                      Editar
                    </button>
                    <button
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => eliminarProducto(producto.id_product)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Listaproductos;
