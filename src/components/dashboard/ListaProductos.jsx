import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

export default function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- 1) Obtener productos de Firebase ---
  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const productList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setProductos(productList);
    } catch (error) {
      console.error("Error al obtener los productos:", error);
      setMensaje("Error al cargar los productos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- 2) Crear nuevo producto ---
  const handleNewProduct = () => {
    // Navegamos a la pantalla de creación
    navigate("/dashboard/crearProductos");
  };

  // --- 3) Modificar producto ---
  const handleModify = (product) => {
    // Enviamos el producto y el modo 'editar' a la ruta de creación/edición
    navigate("/dashboard/crearProductos", {
      state: { producto: product, modo: "editar" },
    });
  };

  // --- 4) Eliminar producto ---
  const handleDelete = async (productId) => {
    try {
      await deleteDoc(doc(db, "productos", productId));
      setMensaje("Producto eliminado correctamente");
      // Vuelve a cargar la lista tras eliminar
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      setMensaje("Error al eliminar el producto");
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Productos</h1>
          <p className="text-gray-500">Gestiona los productos en venta en la tienda.</p>
        </div>
        <button
          onClick={handleNewProduct}
          className="px-4 py-2 bg-[#f2ac02] border border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 text-white rounded font-nunito"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Mensaje de estado (éxito/error) */}
      {mensaje && (
        <p className="text-center text-sm text-gray-700 mb-4">
          {mensaje}
        </p>
      )}

      {/* Tabla de productos */}
      {loading ? (
        <p className="text-center">Cargando productos...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Posición
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Producto
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Precio
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Categoría
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                  Visible
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Posición */}
                  <td className="px-4 py-3 text-gray-700">
                    {producto.position || "N/A"}
                  </td>

                  {/* Producto (con imagen opcional) */}
                  <td className="px-4 py-3 flex items-center gap-2">
                    {producto.imagen && (
                      <img
                        src={producto.imagen}
                        alt={producto.nombre || "Producto"}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <span className="font-medium text-gray-800">
                      {producto.nombre || producto.name || "Sin nombre"}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="px-4 py-3 text-gray-700">
                    {producto.precio || producto.price || "0.00€"}
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3 text-gray-700">
                    {producto.categoria || "Sin categoría"}
                  </td>

                  {/* Visible */}
                  <td className="px-4 py-3 text-center">
                    {producto.visible ? (
                      <span className="text-green-500 font-semibold">Sí</span>
                    ) : (
                      <span className="text-red-500 font-semibold">No</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleModify(producto)}
                      className="bg-[#f2ac02] border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 text-white p-3 font-nunito rounded mr-2"
                    >
                      Modificar
                    </button>
                    <button
                      onClick={() => handleDelete(producto.id)}
                      className="bg-white font-nunito text-gray-500 border border-gray-300 hover:text-yellow-600 hover:border-yellow-600 p-3 rounded"
                    >
                      Eliminar
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
