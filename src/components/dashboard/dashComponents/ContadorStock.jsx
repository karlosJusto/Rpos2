import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'; // Importado onSnapshot
import { db } from "../../firebase/firebase"; // Asegúrate que la ruta sea correcta

// Un icono genérico para el stock, puedes reemplazarlo si tienes uno específico
// import iconoStock from '../../../../src/assets/todos.png'; // Ejemplo si quieres usar un icono específico

const ContadorStock = () => {
  const [productosConPocoStock, setProductosConPocoStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const productosRef = collection(db, 'productos');
    // Pedimos un poco más para tener margen al filtrar (ej. 7 o un número mayor que 5 + número de IDs a excluir)
    const q = query(productosRef, orderBy('stock', 'asc'), limit(4));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let listaProductosTemporal = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        listaProductosTemporal.push({
          id: doc.id, // ID del documento de Firestore
          nombre: data.nombre || 'Sin nombre',
          alias: data.alias || data.nombre || 'Sin alias',
          stock: data.stock !== undefined ? Number(data.stock) : 0, // Asegurar que stock sea un número
          imagen_rpos: data.imagen_rpos || null,
          id_product: data.id_product // Necesitamos id_product para filtrar
        });
      });

      // Filtrar para excluir los productos con id_product 49 y 48 (string o number)
      const productosFiltrados = listaProductosTemporal.filter(p =>
        String(p.id_product) !== "49" && String(p.id_product) !== "48"
      );

      setProductosConPocoStock(productosFiltrados.slice(0, 5)); // Tomar los primeros 5 después de filtrar
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar cambios en stock:", err);
      setError("Error al cargar el stock de productos.");
      setLoading(false);
    });

    // Limpiar la suscripción cuando el componente se desmonte
    return () => unsubscribe();

  }, []); // El array de dependencias vacío asegura que esto se ejecute solo una vez al montar

  if (loading) {
    return (
      <div className="flex justify-center items-center p-2 h-full">
        {/* Spinner de carga más estilizado */}
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-2 text-center text-red-500 font-nunito">{error}</div>;
  }

  return (
    <>
      <div className='flex justify-center items-center p-2 sticky top-0 bg-slate-500 z-10 rounded-t-md -mx-2'> {/* Hacemos el título sticky */}
      <h1 className="font-nunito text-md bg-gradient-to-r from-yellow-500 to-yellow-700 bg-clip-text text-transparent mt-[0.25vh]">
            Productos con Menos Stock
        </h1>
      </div>

      <div className="pt-0"> {/* pt-0 porque el título sticky ya ocupa su espacio */}
        {productosConPocoStock.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400 font-nunito mt-4">No hay productos para mostrar.</p>
        )}

        {productosConPocoStock.map((producto) => (
          <div key={producto.id} className="flex items-center justify-start gap-3 border-1 border-gray-600 py-2 px-2 shadow-md rounded-md mt-1 mb-2"> {/* Ajustado estilo de borde y padding */}
            {producto.imagen_rpos ? (
              <img src={producto.imagen_rpos} alt={producto.alias} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-300 flex-shrink-0">N/A</div>
            )}
            <span className='font-nunito text-sm text-white font-bold flex-1 text-center truncate' title={producto.alias}>{producto.alias}</span>
            <span className='font-nunito text-sm text-white font-extrabold'>{producto.stock}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default ContadorStock;
